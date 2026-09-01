import { createSelector, createSlice } from '@reduxjs/toolkit';

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: { items: [], timelineRemindersEnabled: true },
  reducers: {
    setTimelineRemindersEnabled: (state, action) => { state.timelineRemindersEnabled = action.payload; },
  },
});

export const selectTimelineNotifications = createSelector(
  [(state) => state.meals.items, (state) => state.notifications.timelineRemindersEnabled],
  (meals, remindersEnabled) => {
    if (!remindersEnabled) return [];
    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;
    return meals.filter((meal) => !meal.consumed).map((meal) => {
      const minutesUntil = Math.round((meal.hour - currentHour) * 60);
      if (minutesUntil > 30) return { id: `meal-${meal.id}`, title: `${meal.name} at ${meal.time}`, body: 'Your reminder is set automatically from today’s timeline.', unread: false, time: meal.time };
      if (minutesUntil >= 0) return { id: `meal-${meal.id}`, title: `${meal.name} in ${Math.max(1, minutesUntil)} minutes`, body: 'Your scheduled check-in is coming up.', unread: true, time: 'SOON' };
      return { id: `meal-${meal.id}`, title: `${meal.name} check-in due`, body: `This timeline item was scheduled for ${meal.time}.`, unread: true, time: 'DUE' };
    });
  },
);

export const { setTimelineRemindersEnabled } = notificationSlice.actions;
export default notificationSlice.reducer;
