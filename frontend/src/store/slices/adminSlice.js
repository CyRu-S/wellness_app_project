import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  adminApprovals,
  adminAttention,
  adminMemberMealPostHistory,
  adminMemberMealPlans,
  adminMealInsights,
  adminMembers,
  adminPreferences,
  adminSummary,
} from '../../data/adminDemoData';
import { getAdminUsers } from '../../services/api/adminApi';
import { getDemoProfilePhotos } from '../../services/storage/profilePhotoStorage';

export const loadAdminMembers = createAsyncThunk('admin/loadMembers', async (_, { getState }) => {
  const auth = getState().auth;
  if (auth?.source === 'demo' || auth?.token === 'demo-token') {
    return { source: 'demo', photos: await getDemoProfilePhotos() };
  }
  if (!auth?.token) throw new Error('Please sign in again to continue.');
  return { source: 'api', users: await getAdminUsers(auth.token) };
});

const initialState = {
  summary: adminSummary,
  members: adminMembers,
  approvals: adminApprovals,
  mealInsights: adminMealInsights,
  attention: adminAttention,
  memberMealPlans: adminMemberMealPlans,
  memberMealPostHistory: adminMemberMealPostHistory,
  preferences: adminPreferences,
  membersStatus: 'idle',
  membersError: null,
  lastApprovalDecision: null,
};

const decideRequest = (state, action, decision) => {
  const index = state.approvals.findIndex((request) => request.id === action.payload);
  if (index < 0) return;
  const [request] = state.approvals.splice(index, 1);
  state.lastApprovalDecision = { request, index, decision };
  state.summary.pendingApprovals = state.approvals.length;
};

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    approveRequest: (state, action) => decideRequest(state, action, 'approved'),
    declineRequest: (state, action) => decideRequest(state, action, 'declined'),
    undoApprovalDecision: (state) => {
      if (!state.lastApprovalDecision) return;
      const { request, index } = state.lastApprovalDecision;
      state.approvals.splice(index, 0, request);
      state.summary.pendingApprovals = state.approvals.length;
      state.lastApprovalDecision = null;
    },
    clearApprovalNotice: (state) => { state.lastApprovalDecision = null; },
    nudgeAttention: (state, action) => {
      const item = state.attention.find((attention) => attention.id === action.payload);
      if (item && item.status !== 'RESOLVED') item.status = 'NUDGED';
    },
    nudgePriorityAttention: (state) => {
      state.attention.forEach((item) => {
        if (item.severity === 'HIGH' && item.status === 'OPEN') item.status = 'NUDGED';
      });
    },
    resolveAttention: (state, action) => {
      const item = state.attention.find((attention) => attention.id === action.payload);
      if (item) item.status = 'RESOLVED';
      state.summary.missedItems = state.attention.filter((attention) => attention.status !== 'RESOLVED').length;
    },
    setInsightRange: (state, action) => { state.mealInsights.selectedRange = action.payload; },
    setPreference: (state, action) => {
      const { key, value } = action.payload;
      if (Object.prototype.hasOwnProperty.call(state.preferences, key)) state.preferences[key] = value;
    },
    updateMemberMealPlan: (state, action) => {
      const { memberId, planName, items } = action.payload;
      const current = state.memberMealPlans[memberId];
      const currentItems = current?.items || [];
      state.memberMealPlans[memberId] = {
        memberId,
        planName,
        consultant: 'Coach Arpan',
        updatedAt: 'Just now',
        items: items.map((item, index) => {
          const exact = currentItems.find((meal) => meal.id === item.id);
          const newlyAdded = typeof item.id === 'string' && item.id.includes('-new-');
          const previous = exact || (!newlyAdded ? currentItems.find((meal) => meal.type === item.type) || currentItems[index] : undefined);
          return {
            ...previous,
            ...item,
            id: previous?.id || item.id || memberId * 100 + index + 1,
            consumed: previous?.consumed || false,
            uploadedAt: previous?.uploadedAt || null,
            imageUri: previous?.imageUri || null,
          };
        }),
      };
      const member = state.members.find((item) => item.id === memberId);
      if (member) member.plan = planName;
    },
  },
  extraReducers: (builder) => {
    const applyPhoto = (state, action) => {
      const payload = action.payload;
      if (!payload?.profileImageUrl) return;
      const member = state.members.find((item) => item.id === (payload.userId ?? payload.id) || item.email?.toLowerCase() === payload.email?.toLowerCase())
        || state.members.find((item) => item.id === 1);
      if (member) member.profileImageUrl = payload.profileImageUrl;
    };
    builder
      .addCase('auth/signOut', (state) => { state.membersStatus = 'idle'; state.membersError = null; })
      .addCase('auth/register/fulfilled', applyPhoto)
      .addCase('profile/savePhoto/fulfilled', applyPhoto)
      .addCase(loadAdminMembers.pending, (state) => { state.membersStatus = 'loading'; state.membersError = null; })
      .addCase(loadAdminMembers.fulfilled, (state, action) => {
        if (action.payload.source === 'demo') {
          state.members.forEach((member) => {
            member.profileImageUrl = action.payload.photos[`id:${member.id}`]
              || action.payload.photos[`email:${member.email?.toLowerCase()}`]
              || member.profileImageUrl
              || null;
          });
        } else {
          state.members = action.payload.users
            .filter((user) => user.role === 'USER')
            .map((user, index) => {
              const existing = state.members.find((member) => member.email?.toLowerCase() === user.email?.toLowerCase())
                || state.members[index];
              return {
                ...(existing || {}),
                id: user.id,
                name: user.name,
                initials: user.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
                email: user.email,
                status: user.status,
                lastActiveAt: user.status === 'ACTIVE' ? 'Active member' : user.status.toLowerCase(),
                plan: existing?.plan || 'Wellness starter',
                adherence: existing?.adherence ?? 0,
                meals: existing?.meals ?? 0,
                hydration: existing?.hydration ?? 0,
                streak: existing?.streak ?? 0,
                attentionLevel: existing?.attentionLevel || 'NONE',
                attentionReason: existing?.attentionReason || '',
                profileImageUrl: user.profileImageUrl || null,
              };
            });
          state.summary.totalMembers = state.members.length;
        }
        state.membersStatus = 'succeeded';
      })
      .addCase(loadAdminMembers.rejected, (state, action) => {
        state.membersStatus = 'failed';
        state.membersError = action.error.message || 'Unable to load members.';
      });
  },
});

export const {
  approveRequest,
  clearApprovalNotice,
  declineRequest,
  nudgeAttention,
  nudgePriorityAttention,
  resolveAttention,
  setInsightRange,
  setPreference,
  undoApprovalDecision,
  updateMemberMealPlan,
} = adminSlice.actions;

export const selectAdminSummary = (state) => state.admin.summary;
export const selectAdminMembers = (state) => state.admin.members;
export const selectAdminApprovals = (state) => state.admin.approvals;
export const selectAdminMealInsights = (state) => state.admin.mealInsights;
export const selectAdminAttention = (state) => state.admin.attention;
export const selectAdminPreferences = (state) => state.admin.preferences;
export const selectAdminMemberMealPlans = (state) => state.admin.memberMealPlans;
export const selectAdminMemberMealPostHistory = (state) => state.admin.memberMealPostHistory;

export default adminSlice.reducer;

