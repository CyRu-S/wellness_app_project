import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  getAdminMemberAccess,
  getSharedMemberToday,
  getSharedMemberJournal,
  getSharedMemberAttention,
  nudgeSharedMember as nudgeSharedMemberApi,
  getSharedMembers,
  replaceAdminMemberAccess,
} from '../../services/api/memberAccessApi';

const idleRequest = { status: 'idle', error: null };

export const memberAccessInitialState = {
  overviewReadId: null,
  source: null,
  overview: { totalGrants: 0, viewersWithAccess: 0, viewers: [] },
  shared: { total: 0, members: [] },
  sharedMembers: { total: 0, members: [] },
  sharedMembersStatus: 'idle',
  sharedMembersError: null,
  todayByMemberId: {},
  attentionReadIds: {},
  sharedToday: null,
  sharedJournal: null,
  sharedTodayStatus: 'idle',
  sharedTodayError: null,
  sharedNudge: { status: 'idle', sent: false, error: null },
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
    source: 'api',
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
    requireApiToken(context.token);
    return { source: 'api', data: await getAdminMemberAccess(context.token) };
  },
);

export const nudgeSharedMember = createAsyncThunk('memberAccess/nudgeSharedMember', async ({ memberId, type, attentionId }, { getState }) => {
  const token = getState().auth?.token;
  requireApiToken(token);
  return { memberId: Number(memberId), type, attentionId, ...await nudgeSharedMemberApi(token, memberId, type, attentionId) };
});

export const syncSharedMemberAttention = createAsyncThunk('memberAccess/syncAttention', async (memberId, { getState, rejectWithValue }) => {
  try {
    return { memberId: Number(memberId), nudges: await getSharedMemberAttention(getState().auth?.token, memberId) };
  } catch (error) { return rejectWithValue({ memberId: Number(memberId), status: error.status, message: error.message }); }
}, { condition: (memberId, { getState }) => !!getState().auth?.token
  && !getState().memberAccess.attentionReadIds?.[memberId]
  && getState().memberAccess.sharedNudge?.status !== 'loading' });

export const replaceMemberAccessAssignments = createAsyncThunk(
  'memberAccess/replaceAssignments',
  async ({ viewerId, memberIds }, { getState }) => {
    const context = accessContext(getState);
    const normalizedMemberIds = [...new Set(memberIds.map(Number))].filter(Number.isFinite);
    requireApiToken(context.token);
    const viewer = await replaceAdminMemberAccess(context.token, viewerId, normalizedMemberIds);
    return { source: context.source, viewerId: Number(viewerId), viewer };
  },
);

export const loadSharedMembers = createAsyncThunk(
  'memberAccess/loadSharedMembers',
  async (_, { getState, rejectWithValue }) => {
    const context = accessContext(getState);
    try {
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
      requireApiToken(context.token);
      const data = await getSharedMemberToday(context.token, memberId);
      let journal = null;
      try { journal = await getSharedMemberJournal(context.token, memberId); }
      catch { /* Today remains available if the extended journal cannot be loaded. */ }
      return { source: context.source, memberId: Number(memberId), data, journal };
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
      state.sharedJournal = null;
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
      .addCase(loadAdminMemberAccess.pending, (state, action) => {
        state.overviewReadId = action.meta.requestId;
        state.overviewRequest = { status: 'loading', error: null };
      })
      .addCase(loadAdminMemberAccess.fulfilled, (state, action) => {
        if (state.overviewReadId !== action.meta.requestId || state.saveRequest.status === 'loading') return;
        state.overviewReadId = null;
        state.source = action.payload.source;
        state.overview = action.payload.data;
        state.overviewRequest = { status: 'succeeded', error: null };
      })
      .addCase(loadAdminMemberAccess.rejected, (state, action) => {
        if (state.overviewReadId !== action.meta.requestId) return;
        state.overviewReadId = null;
        state.overviewRequest = { status: 'failed', error: errorMessage(action, 'Unable to load member access.') };
      })
      .addCase(replaceMemberAccessAssignments.pending, (state) => {
        state.overviewReadId = null;
        state.saveRequest = { status: 'loading', error: null };
        state.lastSavedViewerId = null;
      })
      .addCase(replaceMemberAccessAssignments.fulfilled, (state, action) => {
        state.overviewReadId = null;
        state.source = action.payload.source;
        const viewer = action.payload.viewer;
        const index = state.overview.viewers.findIndex((row) => row.id === viewer.id);
        if (index < 0) state.overview.viewers.push(viewer);
        else state.overview.viewers[index] = viewer;
        state.overview.totalGrants = state.overview.viewers.reduce((sum, row) => sum + row.assignedCount, 0);
        state.overview.viewersWithAccess = state.overview.viewers.filter((row) => row.assignedCount > 0).length;
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
        state.todayRequest = { requestId: action.meta.requestId, status: 'loading', error: null, memberId: Number(action.meta.arg), revoked: false };
      })
      .addCase(loadSharedMemberToday.fulfilled, (state, action) => {
        if (state.todayRequest.requestId !== action.meta.requestId) return;
        state.source = action.payload.source;
        state.todayByMemberId[action.payload.memberId] = action.payload.data;
        state.sharedToday = action.payload.data;
        state.sharedJournal = action.payload.journal;
        state.sharedTodayStatus = 'succeeded';
        state.sharedTodayError = null;
        state.errorStatus = null;
        state.todayRequest = { status: 'succeeded', error: null, memberId: action.payload.memberId, revoked: false };
      })
      .addCase(loadSharedMemberToday.rejected, (state, action) => {
        if (state.todayRequest.requestId !== action.meta.requestId) return;
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
          state.sharedJournal = null;
        }
      })
      .addCase(nudgeSharedMember.pending, (state, action) => { state.sharedNudge = { memberId: Number(action.meta.arg.memberId), type: action.meta.arg.type, attentionId: action.meta.arg.attentionId, status: 'loading', sent: false, error: null }; })
      .addCase(nudgeSharedMember.fulfilled, (state, action) => {
        const id = Number(action.payload.memberId);
        const type = action.payload.type;
        state.sharedNudge = { memberId: id, type, attentionId: action.payload.attentionId, status: 'succeeded', sent: !!action.payload?.sent, error: null };
        if (Number(state.sharedToday?.member?.id) === id) state.sharedToday.nudgedToday = true;
        if (state.todayByMemberId[id]) {
          state.todayByMemberId[id].nudgedToday = true;
          state.todayByMemberId[id].nudges?.forEach((option) => {
            option.status = 'NUDGED';
            option.lastSentAt = action.payload.lastSentAt;
            option.availableAt = action.payload.availableAt;
          });
        }
        const currentNudges = Number(state.sharedToday?.member?.id) === id ? state.sharedToday.nudges : [];
        currentNudges?.forEach((currentOption) => {
          currentOption.status = 'NUDGED';
          currentOption.lastSentAt = action.payload.lastSentAt;
          currentOption.availableAt = action.payload.availableAt;
        });
        [state.shared?.members, state.sharedMembers?.members].forEach((members) => {
          const member = members?.find((item) => Number(item.id ?? item.memberId) === id);
          if (member) member.nudgedToday = true;
        });
      })
      .addCase(nudgeSharedMember.rejected, (state, action) => { state.sharedNudge = { memberId: Number(action.meta.arg.memberId), type: action.meta.arg.type, status: 'failed', sent: false, error: action.error?.message || 'Nudge could not be sent.' }; })
      .addCase(syncSharedMemberAttention.pending, (state, action) => { state.attentionReadIds ||= {}; state.attentionReadIds[action.meta.arg] = action.meta.requestId; })
      .addCase(syncSharedMemberAttention.fulfilled, (state, action) => {
        const { memberId, nudges } = action.payload;
        if (state.attentionReadIds[memberId] !== action.meta.requestId) return;
        delete state.attentionReadIds[memberId];
        if (state.todayByMemberId[memberId]) state.todayByMemberId[memberId].nudges = nudges;
        if (Number(state.sharedToday?.member?.id) === memberId) state.sharedToday.nudges = nudges;
      })
      .addCase(syncSharedMemberAttention.rejected, (state, action) => {
        const memberId = Number(action.meta.arg);
        if (state.attentionReadIds[memberId] !== action.meta.requestId) return;
        delete state.attentionReadIds[memberId];
        if (action.payload?.status !== 404) return;
        delete state.todayByMemberId[memberId];
        if (Number(state.sharedToday?.member?.id) === memberId) {
          state.sharedToday = null; state.sharedJournal = null; state.sharedTodayStatus = 'failed';
          state.sharedTodayError = { message: 'Shared access is no longer available.', status: 404 };
          state.todayRequest.requestId = null;
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
