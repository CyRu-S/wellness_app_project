import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { request } from '../../services/api/client';
import { createActivity } from '../../services/api/activityApi';
import { activityTotals, normalizeActivity } from '../../utils/activitySession';

export const loadActivities = createAsyncThunk('activity/load', async (_, { getState }) => {
  const rows = await request('/activities', { headers: { Authorization: `Bearer ${getState().auth.token}` } });
  return rows.map(normalizeActivity);
}, { condition: (_, { getState }) => !getState().activity.pendingSession && !getState().activity.readId });
export const completeActivity = createAsyncThunk('activity/complete', async (session, { getState }) => {
  const saved = await createActivity(getState().auth.token, { activity: session.activity, durationSeconds: session.durationSeconds, distanceKm: session.distanceKm ?? null });
  return normalizeActivity(saved);
}, { condition: (_, { getState }) => !getState().activity.pendingSession });

const slice = createSlice({
  name: 'activity', initialState: { weeklyMinutes: 0, sessions: 0, history: [], status: 'idle', error: null, pendingSession: null, failedSession: null, readId: null }, reducers: {},
  extraReducers: (builder) => builder
    .addCase(loadActivities.pending, (state, action) => { state.readId = action.meta.requestId; })
    .addCase(loadActivities.fulfilled, (state, action) => {
      if (state.readId !== action.meta.requestId) return;
      state.history = action.payload; state.readId = null;
      if (!state.failedSession) state.error = null;
      Object.assign(state, activityTotals(state.history));
    })
    .addCase(loadActivities.rejected, (state, action) => { if (state.readId === action.meta.requestId) { state.readId = null; state.error = action.error.message; } })
    .addCase(completeActivity.pending, (state, action) => {
      state.readId = null; state.error = null; state.failedSession = null; state.status = 'saving';
      state.pendingSession = action.meta.requestId;
      state.history.unshift({ ...normalizeActivity(action.meta.arg), id: action.meta.requestId, pending: true });
      Object.assign(state, activityTotals(state.history));
    })
    .addCase(completeActivity.fulfilled, (state, action) => {
      state.history = state.history.map((row) => row.id === action.meta.requestId ? action.payload : row);
      state.pendingSession = null; state.status = 'succeeded';
      Object.assign(state, activityTotals(state.history));
    })
    .addCase(completeActivity.rejected, (state, action) => {
      state.history = state.history.filter((row) => row.id !== action.meta.requestId);
      state.pendingSession = null; state.failedSession = action.meta.arg; state.status = 'failed'; state.error = action.error.message;
      Object.assign(state, activityTotals(state.history));
    }),
});
export default slice.reducer;
