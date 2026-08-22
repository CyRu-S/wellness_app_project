import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  getDemoAdminMemberAccess,
  getDemoSharedMemberToday,
  getDemoSharedMembers,
  replaceDemoMemberAccess,
} from '../../data/memberAccessDemoData';
import {
  getAdminMemberAccess,
  getSharedMemberToday,
  getSharedMembers,
  replaceAdminMemberAccess,
} from '../../services/api/memberAccessApi';

const idleRequest = { status: 'idle', error: null };

export const memberAccessInitialState = {
  source: null,
  overview: { totalGrants: 0, viewersWithAccess: 0, viewers: [] },
  shared: { total: 0, members: [] },
  sharedMembers: { total: 0, members: [] },
  sharedMembersStatus: 'idle',
  sharedMembersError: null,
  todayByMemberId: {},
  sharedToday: null,
  sharedTodayStatus: 'idle',
  sharedTodayError: null,
  errorStatus: null,
  overviewRequest: { ...idleRequest },
  saveRequest: { ...idleRequest },
  sharedRequest: { ...idleRequest },
  todayRequest: { ...idleRequest, memberId: null, revoked: false },
  lastSavedViewerId: null,
};

const accessContext = (getState) => {
  const auth = getState().auth || {};
  return {
    source: auth.source === 'demo' || auth.token === 'demo-token' ? 'demo' : 'api',
    token: auth.token,
    userId: auth.user?.id,
  };
};

const requireApiToken = (token) => {
  if (!token) throw new Error('Please sign in again to continue.');
};

export const loadAdminMemberAccess = createAsyncThunk(
  'memberAccess/loadAdminOverview',
  async (_, { getState }) => {
    const context = accessContext(getState);
    if (context.source === 'demo') return { source: 'demo', data: await getDemoAdminMemberAccess() };
    requireApiToken(context.token);
    return { source: 'api', data: await getAdminMemberAccess(context.token) };
  },
);

export const replaceMemberAccessAssignments = createAsyncThunk(
  'memberAccess/replaceAssignments',
  async ({ viewerId, memberIds }, { getState }) => {
    const context = accessContext(getState);
    const normalizedMemberIds = [...new Set(memberIds.map(Number))].filter(Number.isFinite);
    let data;
    if (context.source === 'demo') {
      data = await replaceDemoMemberAccess(viewerId, normalizedMemberIds);
    } else {
      requireApiToken(context.token);
      await replaceAdminMemberAccess(context.token, viewerId, normalizedMemberIds);
      data = await getAdminMemberAccess(context.token);
    }
    return { source: context.source, viewerId: Number(viewerId), data };
  },
);

export const loadSharedMembers = createAsyncThunk(
  'memberAccess/loadSharedMembers',
  async (_, { getState, rejectWithValue }) => {
    const context = accessContext(getState);
    try {
      if (context.source === 'demo') {
        return { source: 'demo', data: await getDemoSharedMembers(context.userId) };
      }
      requireApiToken(context.token);
      return { source: 'api', data: await getSharedMembers(context.token) };
    } catch (error) {
      return rejectWithValue({
        message: error.message || 'Unable to load shared members.',
        status: error.status || null,
      });
    }
  },
);

export const loadSharedMemberToday = createAsyncThunk(
  'memberAccess/loadSharedMemberToday',
  async (memberId, { getState, rejectWithValue }) => {
    const context = accessContext(getState);
    try {
      const data = context.source === 'demo'
        ? await getDemoSharedMemberToday(context.userId, memberId)
        : await (requireApiToken(context.token), getSharedMemberToday(context.token, memberId));
      return { source: context.source, memberId: Number(memberId), data };
    } catch (error) {
      return rejectWithValue({
        memberId: Number(memberId),
        message: error.message || 'Unable to load this member right now.',
        status: error.status || null,
      });
    }
  },
);

const errorMessage = (action, fallback) => action.payload?.message || action.error?.message || fallback;

const memberAccessSlice = createSlice({
  name: 'memberAccess',
  initialState: memberAccessInitialState,
  reducers: {
    clearMemberAccessSaveFeedback: (state) => {
      state.saveRequest = { ...idleRequest };
      state.lastSavedViewerId = null;
    },
    clearSharedMemberToday: (state, action) => {
      if (action.payload == null) state.todayByMemberId = {};
      else delete state.todayByMemberId[action.payload];
      state.sharedToday = null;
      state.sharedTodayStatus = 'idle';
      state.sharedTodayError = null;
      state.errorStatus = null;
      state.todayRequest = { ...idleRequest, memberId: null, revoked: false };
    },
    resetMemberAccessState: () => memberAccessInitialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase('auth/signOut', () => memberAccessInitialState)
      .addCase(loadAdminMemberAccess.pending, (state) => {
        state.overviewRequest = { status: 'loading', error: null };
      })
      .addCase(loadAdminMemberAccess.fulfilled, (state, action) => {
        state.source = action.payload.source;
        state.overview = action.payload.data;
        state.overviewRequest = { status: 'succeeded', error: null };
      })
      .addCase(loadAdminMemberAccess.rejected, (state, action) => {
        state.overviewRequest = { status: 'failed', error: errorMessage(action, 'Unable to load member access.') };
      })
      .addCase(replaceMemberAccessAssignments.pending, (state) => {
        state.saveRequest = { status: 'loading', error: null };
        state.lastSavedViewerId = null;
      })
      .addCase(replaceMemberAccessAssignments.fulfilled, (state, action) => {
        state.source = action.payload.source;
        state.overview = action.payload.data;
        state.saveRequest = { status: 'succeeded', error: null };
        state.lastSavedViewerId = action.payload.viewerId;
      })
      .addCase(replaceMemberAccessAssignments.rejected, (state, action) => {
        state.saveRequest = { status: 'failed', error: errorMessage(action, 'Unable to save access changes.') };
      })
      .addCase(loadSharedMembers.pending, (state) => {
        state.sharedRequest = { status: 'loading', error: null };
        state.sharedMembersStatus = 'loading';
        state.sharedMembersError = null;
      })
      .addCase(loadSharedMembers.fulfilled, (state, action) => {
        state.source = action.payload.source;
        state.shared = action.payload.data;
        state.sharedMembers = action.payload.data;
        state.sharedMembersStatus = 'succeeded';
        state.sharedMembersError = null;
        state.sharedRequest = { status: 'succeeded', error: null };
      })
      .addCase(loadSharedMembers.rejected, (state, action) => {
        const message = errorMessage(action, 'Unable to load shared members.');
        state.sharedMembersStatus = 'failed';
        state.sharedMembersError = { message, status: action.payload?.status || null };
        state.sharedRequest = { status: 'failed', error: message };
      })
      .addCase(loadSharedMemberToday.pending, (state, action) => {
        state.sharedTodayStatus = 'loading';
        state.sharedTodayError = null;
        state.errorStatus = null;
        state.todayRequest = { status: 'loading', error: null, memberId: Number(action.meta.arg), revoked: false };
      })
      .addCase(loadSharedMemberToday.fulfilled, (state, action) => {
        state.source = action.payload.source;
        state.todayByMemberId[action.payload.memberId] = action.payload.data;
        state.sharedToday = action.payload.data;
        state.sharedTodayStatus = 'succeeded';
        state.sharedTodayError = null;
        state.errorStatus = null;
        state.todayRequest = { status: 'succeeded', error: null, memberId: action.payload.memberId, revoked: false };
      })
      .addCase(loadSharedMemberToday.rejected, (state, action) => {
        const payload = action.payload || {};
        const message = payload.message || action.error?.message || 'Unable to load this member.';
        state.sharedTodayStatus = 'failed';
        state.sharedTodayError = { message, status: payload.status || null };
        state.errorStatus = payload.status || null;
        state.todayRequest = {
          status: 'failed',
          error: message,
          memberId: payload.memberId ?? Number(action.meta.arg),
          revoked: payload.status === 404,
        };
        if (payload.status === 404) {
          delete state.todayByMemberId[payload.memberId];
          state.sharedToday = null;
        }
      });
  },
});

export const {
  clearMemberAccessSaveFeedback,
  clearSharedMemberToday,
  resetMemberAccessState,
} = memberAccessSlice.actions;

const selectSlice = (state) => state.memberAccess || memberAccessInitialState;

export const selectMemberAccessOverview = (state) => selectSlice(state).overview;
export const selectMemberAccessOverviewRequest = (state) => selectSlice(state).overviewRequest;
export const selectMemberAccessSaveRequest = (state) => selectSlice(state).saveRequest;
export const selectLastSavedViewerId = (state) => selectSlice(state).lastSavedViewerId;
export const selectSharedMembers = (state) => selectSlice(state).shared;
export const selectSharedMembersRequest = (state) => selectSlice(state).sharedRequest;
export const selectSharedMemberTodayRequest = (state) => selectSlice(state).todayRequest;
export const selectSharedMemberTodayById = (state, memberId) => selectSlice(state).todayByMemberId[memberId] || null;
export const selectMemberAccessSource = (state) => selectSlice(state).source;

export default memberAccessSlice.reducer;
