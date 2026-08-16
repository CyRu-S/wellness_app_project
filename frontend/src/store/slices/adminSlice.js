import { createSlice } from '@reduxjs/toolkit';
import {
  adminApprovals,
  adminAttention,
  adminMealInsights,
  adminMembers,
  adminPreferences,
  adminSummary,
} from '../../data/adminDemoData';

const initialState = {
  summary: adminSummary,
  members: adminMembers,
  approvals: adminApprovals,
  mealInsights: adminMealInsights,
  attention: adminAttention,
  preferences: adminPreferences,
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
} = adminSlice.actions;

export const selectAdminSummary = (state) => state.admin.summary;
export const selectAdminMembers = (state) => state.admin.members;
export const selectAdminApprovals = (state) => state.admin.approvals;
export const selectAdminMealInsights = (state) => state.admin.mealInsights;
export const selectAdminAttention = (state) => state.admin.attention;
export const selectAdminPreferences = (state) => state.admin.preferences;

export default adminSlice.reducer;

