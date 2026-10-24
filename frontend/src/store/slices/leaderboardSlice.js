import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { request } from '../../services/api/client';

export const loadLeaderboard = createAsyncThunk('leaderboard/load', async (_, { getState }) => (
  request('/leaderboard', { headers: { Authorization: `Bearer ${getState().auth.token}` } })
), {
  condition: (options, { getState }) => options?.force === true || !getState().leaderboard.readId,
});

const initialState = { date: null, generatedAt: null, viewerId: null, rows: [], status: 'idle', error: null, readId: null };

const slice = createSlice({
  name: 'leaderboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => builder
    .addCase('auth/signOut', () => initialState)
    .addCase(loadLeaderboard.pending, (state, action) => {
      state.readId = action.meta.requestId;
      state.status = state.rows.length ? 'refreshing' : 'loading';
      state.error = null;
    })
    .addCase(loadLeaderboard.fulfilled, (state, action) => {
      if (state.readId !== action.meta.requestId) return;
      state.readId = null;
      state.date = action.payload.date;
      state.generatedAt = action.payload.generatedAt;
      state.viewerId = action.payload.viewerId;
      state.rows = action.payload.rows || [];
      state.status = 'succeeded';
      state.error = null;
    })
    .addCase(loadLeaderboard.rejected, (state, action) => {
      if (state.readId !== action.meta.requestId) return;
      state.readId = null;
      state.status = 'failed';
      state.error = action.error.message || 'Leaderboard could not be refreshed.';
    }),
});

export const selectLeaderboard = (state) => state.leaderboard.rows;
export const selectLeaderboardState = (state) => state.leaderboard;
export default slice.reducer;
