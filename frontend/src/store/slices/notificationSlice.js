import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import { request } from '../../services/api/client';
export const loadNotifications = createAsyncThunk('notifications/load', async (_, { getState }) => request('/notifications', { headers: { Authorization: `Bearer ${getState().auth.token}` } }));
const authorization = (getState) => ({ Authorization: `Bearer ${getState().auth.token}` });
export const loadNotificationPreferences = createAsyncThunk('notifications/preferences', async (_, { getState }) =>
  request('/notifications/preferences', { headers: authorization(getState) }), {
  condition: (_, { getState }) => !getState().notifications.savingPreferences && !getState().notifications.preferencesReadId,
});
export const saveNotificationPreferences = createAsyncThunk('notifications/savePreferences', async (preferences, { getState }) =>
  request('/notifications/preferences', { method: 'PUT', headers: authorization(getState), body: JSON.stringify(preferences) }), {
  condition: (_, { getState }) => !getState().notifications.savingPreferences,
});
export const sendTestNotification = createAsyncThunk('notifications/test', async (_, { getState }) =>
  request('/notifications/test', { method: 'POST', headers: authorization(getState) }), {
  condition: (_, { getState }) => !getState().notifications.testing,
});
const applyPreferences = (state, payload) => {
  state.timelineRemindersEnabled = payload.mealReminders;
  state.coachNudgesEnabled = payload.coachNudges;
  state.pushAvailable = payload.pushAvailable;
  state.preferencesLoaded = true;
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: { items: [], timelineRemindersEnabled: true, coachNudgesEnabled: true, preferencesLoaded: false,
    pushAvailable: false, preferencesReadId: null, savingPreferences: false, preferencesError: null, failedPreferences: null,
    previousPreferences: null, push: { status: 'idle', message: '' }, pushRetry: 0, testing: false, testMessage: null },
  reducers: {
    setTimelineRemindersEnabled: (state, action) => { state.timelineRemindersEnabled = action.payload; },
    setPushState: (state, action) => { state.push = action.payload; },
    retryPushRegistration: (state) => { state.pushRetry += 1; },
  },
  extraReducers: (builder) => builder
    .addCase(loadNotifications.fulfilled, (state, action) => { state.items = action.payload; })
    .addCase(loadNotificationPreferences.pending, (state, action) => { state.preferencesReadId = action.meta.requestId; })
    .addCase(loadNotificationPreferences.fulfilled, (state, action) => {
      if (state.preferencesReadId !== action.meta.requestId) return;
      state.preferencesReadId = null; applyPreferences(state, action.payload);
      if (!state.failedPreferences) state.preferencesError = null;
    })
    .addCase(loadNotificationPreferences.rejected, (state, action) => {
      if (state.preferencesReadId !== action.meta.requestId) return;
      state.preferencesReadId = null; state.preferencesError = action.error.message;
    })
    .addCase(saveNotificationPreferences.pending, (state, action) => {
      state.previousPreferences = { mealReminders: state.timelineRemindersEnabled, coachNudges: state.coachNudgesEnabled, pushAvailable: state.pushAvailable };
      state.timelineRemindersEnabled = action.meta.arg.mealReminders; state.coachNudgesEnabled = action.meta.arg.coachNudges;
      state.savingPreferences = true; state.preferencesReadId = null; state.preferencesError = null;
    })
    .addCase(saveNotificationPreferences.fulfilled, (state, action) => {
      applyPreferences(state, action.payload); state.savingPreferences = false; state.previousPreferences = null;
      state.failedPreferences = null;
    })
    .addCase(saveNotificationPreferences.rejected, (state, action) => {
      if (state.previousPreferences) applyPreferences(state, state.previousPreferences);
      state.savingPreferences = false; state.previousPreferences = null; state.preferencesError = action.error.message;
      state.failedPreferences = action.meta.arg;
    })
    .addCase(sendTestNotification.pending, (state) => { state.testing = true; state.testMessage = null; })
    .addCase(sendTestNotification.fulfilled, (state) => { state.testing = false; state.testMessage = 'Test queued. Check your phone; delivery may take a few seconds.'; })
    .addCase(sendTestNotification.rejected, (state, action) => { state.testing = false; state.testMessage = action.error.message; }),
});

export const selectTimelineNotifications = createSelector(
  [(state) => state.meals.items, (state) => state.notifications.timelineRemindersEnabled, (state) => state.notifications.items, (state) => state.notifications.coachNudgesEnabled],
  (meals, remindersEnabled, notifications, nudgesEnabled) => {
    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;
    return [...notifications.filter((item) => nudgesEnabled && item.title === 'A reminder from your coach').map((item) => ({ ...item, id: `event-${item.id}`, unread: !item.read, time: new Date(item.scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) })), ...meals.filter((meal) => remindersEnabled && !meal.consumed).map((meal) => {
      const minutesUntil = Math.round((meal.hour - currentHour) * 60);
      if (minutesUntil > 30) return { id: `meal-${meal.id}`, title: `${meal.name} at ${meal.time}`, body: 'Your reminder is set automatically from today’s timeline.', unread: false, time: meal.time };
      if (minutesUntil >= 0) return { id: `meal-${meal.id}`, title: `${meal.name} in ${Math.max(1, minutesUntil)} minutes`, body: 'Your scheduled check-in is coming up.', unread: true, time: 'SOON' };
      return { id: `meal-${meal.id}`, title: `${meal.name} check-in due`, body: `This timeline item was scheduled for ${meal.time}.`, unread: true, time: 'DUE' };
    })];
  },
);

export const { setTimelineRemindersEnabled, setPushState, retryPushRegistration } = notificationSlice.actions;
export default notificationSlice.reducer;
