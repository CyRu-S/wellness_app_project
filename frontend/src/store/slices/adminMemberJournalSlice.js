import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getAdminMemberJournal, updateAdminMemberWaterGoal } from '../../services/api/adminApi';

const initialState = { byMemberId: {}, requests: {}, waterGoalRequests: {} };
const idleRequest = { status: 'idle', error: null };

export const loadAdminMemberJournal = createAsyncThunk(
  'adminMemberJournal/load',
  async ({ memberId }, { getState, rejectWithValue }) => {
    const auth = getState().auth || {};
    const requestedId = Number(memberId);
    try {

      if (!auth.token) throw new Error('Please sign in again to continue.');
      return { requestedId, data: await getAdminMemberJournal(auth.token, requestedId) };
    } catch (error) {
      return rejectWithValue({ requestedId, message: error.message || 'Unable to load member journal.', status: error.status || null });
    }
  },
);

export const saveAdminMemberWaterGoal = createAsyncThunk(
  'adminMemberJournal/saveWaterGoal',
  async ({ memberId, waterGoalMl }, { getState, rejectWithValue }) => {
    const auth = getState().auth || {};
    const requestedId = Number(memberId);
    try {

      if (!auth.token) throw new Error('Please sign in again to continue.');
      return { requestedId, member: await updateAdminMemberWaterGoal(auth.token, requestedId, waterGoalMl) };
    } catch (error) {
      return rejectWithValue({ requestedId, message: error.message || 'Unable to update the water goal.', status: error.status || null });
    }
  },
);

const slice = createSlice({
  name: 'adminMemberJournal',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase('auth/signOut', () => initialState)
      .addCase(loadAdminMemberJournal.pending, (state, action) => {
        state.requests[action.meta.arg.memberId] = { requestId: action.meta.requestId, status: 'loading', error: null };
      })
      .addCase(loadAdminMemberJournal.fulfilled, (state, action) => {
        if (state.requests[action.payload.requestedId]?.requestId !== action.meta.requestId) return;
        state.byMemberId[action.payload.requestedId] = action.payload.data;
        state.requests[action.payload.requestedId] = { status: 'succeeded', error: null };
      })
      .addCase(loadAdminMemberJournal.rejected, (state, action) => {
        const requestedId = action.payload?.requestedId ?? action.meta.arg.memberId;
        if (state.requests[requestedId]?.requestId !== action.meta.requestId) return;
        state.requests[requestedId] = {
          status: 'failed',
          error: { message: action.payload?.message || action.error?.message || 'Unable to load member journal.', status: action.payload?.status || null },
        };
      })
      .addCase(saveAdminMemberWaterGoal.pending, (state, action) => {
        state.requests[action.meta.arg.memberId] = { status: 'idle', error: null };
        state.waterGoalRequests[action.meta.arg.memberId] = { status: 'saving', error: null };
      })
      .addCase(saveAdminMemberWaterGoal.fulfilled, (state, action) => {
        const { requestedId, member } = action.payload;
        state.requests[requestedId] = { status: 'succeeded', error: null };
        if (state.byMemberId[requestedId]) {
          state.byMemberId[requestedId].member = { ...state.byMemberId[requestedId].member, ...member };
        }
        state.waterGoalRequests[requestedId] = { status: 'succeeded', error: null };
      })
      .addCase(saveAdminMemberWaterGoal.rejected, (state, action) => {
        const requestedId = action.payload?.requestedId ?? action.meta.arg.memberId;
        state.waterGoalRequests[requestedId] = {
          status: 'failed',
          error: { message: action.payload?.message || action.error?.message || 'Unable to update the water goal.', status: action.payload?.status || null },
        };
      });
  },
});

export const selectAdminMemberJournal = (state, memberId) => state.adminMemberJournal?.byMemberId?.[memberId] || null;
export const selectAdminMemberJournalRequest = (state, memberId) => state.adminMemberJournal?.requests?.[memberId] || idleRequest;
export const selectAdminMemberWaterGoalRequest = (state, memberId) => state.adminMemberJournal?.waterGoalRequests?.[memberId] || idleRequest;

export default slice.reducer;
