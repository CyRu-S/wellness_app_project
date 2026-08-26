import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getDemoAdminMemberJournal } from '../../data/adminMemberJournalDemoData';
import { setDemoWaterGoal } from '../../data/demoWaterGoals';
import { getAdminMemberJournal, getAdminUsers, updateAdminMemberWaterGoal } from '../../services/api/adminApi';

const initialState = { byMemberId: {}, requests: {}, waterGoalRequests: {} };
const idleRequest = { status: 'idle', error: null };

export const loadAdminMemberJournal = createAsyncThunk(
  'adminMemberJournal/load',
  async ({ memberId, email }, { getState, rejectWithValue }) => {
    const auth = getState().auth || {};
    const requestedId = Number(memberId);
    try {
      if (auth.source === 'demo' || auth.token === 'demo-token') {
        return { requestedId, data: await getDemoAdminMemberJournal(requestedId) };
      }
      if (!auth.token) throw new Error('Please sign in again to continue.');
      const users = await getAdminUsers(auth.token);
      const account = users.find((user) => user.role === 'USER' && user.email?.toLowerCase() === email?.toLowerCase());
      if (!account) {
        const error = new Error('Member account not found');
        error.status = 404;
        throw error;
      }
      return { requestedId, data: await getAdminMemberJournal(auth.token, account.id) };
    } catch (error) {
      return rejectWithValue({ requestedId, message: error.message || 'Unable to load member journal.', status: error.status || null });
    }
  },
);

export const saveAdminMemberWaterGoal = createAsyncThunk(
  'adminMemberJournal/saveWaterGoal',
  async ({ memberId, email, waterGoalMl }, { getState, rejectWithValue }) => {
    const auth = getState().auth || {};
    const requestedId = Number(memberId);
    try {
      if (auth.source === 'demo' || auth.token === 'demo-token') {
        await setDemoWaterGoal(requestedId, waterGoalMl);
        return { requestedId, member: { waterGoalMl } };
      }
      if (!auth.token) throw new Error('Please sign in again to continue.');
      const users = await getAdminUsers(auth.token);
      const account = users.find((user) => user.role === 'USER' && user.email?.toLowerCase() === email?.toLowerCase());
      if (!account) {
        const error = new Error('Member account not found');
        error.status = 404;
        throw error;
      }
      return { requestedId, member: await updateAdminMemberWaterGoal(auth.token, account.id, waterGoalMl) };
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
        state.requests[action.meta.arg.memberId] = { status: 'loading', error: null };
      })
      .addCase(loadAdminMemberJournal.fulfilled, (state, action) => {
        state.byMemberId[action.payload.requestedId] = action.payload.data;
        state.requests[action.payload.requestedId] = { status: 'succeeded', error: null };
      })
      .addCase(loadAdminMemberJournal.rejected, (state, action) => {
        const requestedId = action.payload?.requestedId ?? action.meta.arg.memberId;
        state.requests[requestedId] = {
          status: 'failed',
          error: { message: action.payload?.message || action.error?.message || 'Unable to load member journal.', status: action.payload?.status || null },
        };
      })
      .addCase(saveAdminMemberWaterGoal.pending, (state, action) => {
        state.waterGoalRequests[action.meta.arg.memberId] = { status: 'saving', error: null };
      })
      .addCase(saveAdminMemberWaterGoal.fulfilled, (state, action) => {
        const { requestedId, member } = action.payload;
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
