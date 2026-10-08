import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { request } from '../../services/api/client';
import { normalizeMeal } from './mealSlice';

const pageReadOptions = { condition: (_, { getState }) => !Object.keys(getState().admin.writes).length };
const headers = (getState) => ({ Authorization: `Bearer ${getState().auth.token}` });
export const loadAdminMembers = createAsyncThunk('admin/loadMembers', async (_, { getState }) => {
  try { return await request('/admin/workspace', { headers: headers(getState) }); }
  catch (workspaceError) {
    const [members, approvals] = await Promise.all([
      request('/admin/members', { headers: headers(getState) }),
      request('/admin/approvals', { headers: headers(getState) }),
    ]);
    return { members, approvals, fallback: true, workspaceError: workspaceError.message };
  }
}, {
  // A manual refresh has already invalidated this page's response cache.
  // Let it supersede an older read; the reducer accepts only the latest request ID.
  condition: (options, { getState }) => (!getState().admin.readId || options?.force === true)
    && !Object.keys(getState().admin.writes).length,
});
export const loadAdminAttention = createAsyncThunk('admin/loadAttention', async (_, { getState }) =>
  request('/admin/attention', { headers: headers(getState) }), pageReadOptions);
export const loadAdminDirectory = createAsyncThunk('admin/loadDirectory', async (_, { getState }) =>
  request('/admin/members', { headers: headers(getState) }), pageReadOptions);
export const loadAdminApprovals = createAsyncThunk('admin/loadApprovals', async (_, { getState }) =>
  request('/admin/approvals', { headers: headers(getState) }), pageReadOptions);
export const loadAdminProducts = createAsyncThunk('admin/loadProducts', async (_, { getState }) =>
  request('/admin/products', { headers: headers(getState) }), pageReadOptions);
export const loadAdminMemberPlan = createAsyncThunk('admin/loadMemberPlan', async (memberId, { getState }) =>
  request(`/admin/plans/members/${memberId}`, { headers: headers(getState) }), pageReadOptions);
const decision = (name, value) => createAsyncThunk(name, async (id, { getState }) => {
  const member = getState().admin.approvals.find((r) => r.id === id);
  await request(`/admin/users/${id}/approval`, { method: 'PATCH', headers: headers(getState), body: JSON.stringify({ decision: value }) });
  return { request: member, decision: value === 'APPROVE' ? 'approved' : 'declined' };
});
export const approveRequest = decision('admin/approve', 'APPROVE');
export const declineRequest = decision('admin/decline', 'DECLINE');
const attentionAction = (name, action, method) => createAsyncThunk(name, async (id, { getState }) => {
  await request(`/admin/attention/${id}/${action}`, { method, headers: headers(getState) });
});
export const nudgeAttention = attentionAction('admin/nudge', 'nudge', 'POST');
export const resolveAttention = attentionAction('admin/resolve', 'resolve', 'PATCH');
export const nudgePriorityAttention = createAsyncThunk('admin/nudgePriority', async (_, { getState, dispatch }) => {
  const ids = getState().admin.attention.filter((item) => item.severity === 'HIGH' && item.status === 'OPEN').map((item) => item.id);
  await Promise.all(ids.map((id) => dispatch(nudgeAttention(id)).unwrap()));
});
export const updateMemberMealPlan = createAsyncThunk('admin/savePlan', async ({ memberId, planName, items }, { getState }) => {
  const body = { planName, items: items.map((item) => {
    const minutes = Math.round(item.hour * 60);
    return { id: Number.isSafeInteger(Number(item.id)) ? Number(item.id) : null,
      type: item.type, name: item.name, time: `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00`,
      calories: Number(item.calories) || 0, protein: Number(item.protein) || 0, ingredients: item.ingredients || [] };
  }) };
  const result = await request(`/admin/plans/members/${memberId}`, { method: 'PUT', headers: headers(getState), body: JSON.stringify(body) });
  return result;
});
const writes = [approveRequest, declineRequest, nudgeAttention, resolveAttention, updateMemberMealPlan];
const emptyRange = { label: '', totalLogs: 0, completionRate: 0, comparison: 0, series: [] };
const initialState = {
  summary: { pendingApprovals: 0, mealLogsToday: 0, mealComparison: 0, missedItems: 0, activeUsers: 0, totalMembers: 0, averageAdherence: 0, onTrackPercentage: 0, activePlans: 0, products: 0 },
  members: [], approvals: [], attention: [], products: [], productsError: null, approvalsError: null, memberMealPlans: {}, memberMealPostHistory: {},
  mealInsights: { selectedRange: 'TODAY', ranges: { TODAY: emptyRange, '7D': emptyRange, '30D': emptyRange }, mealTypes: [], missingMembers: [] },
  preferences: { signupAlerts: true, deadlineAlerts: true, dailyDigest: false },
  attentionError: null, pageReads: {}, readId: null, writes: {}, attentionRollbacks: {}, membersStatus: 'idle', membersError: null, lastApprovalDecision: null,
};
const slice = createSlice({
  name: 'admin', initialState,
  reducers: {
    clearApprovalNotice: (state) => { state.lastApprovalDecision = null; },
    setInsightRange: (state, action) => { state.mealInsights.selectedRange = action.payload; },
    setPreference: (state, action) => { state.preferences[action.payload.key] = action.payload.value; },
  },
  extraReducers: (builder) => builder
    .addCase(loadAdminProducts.pending, (state, action) => { state.pageReads.products = action.meta.requestId; state.productsError = null; })
    .addCase(loadAdminProducts.fulfilled, (state, action) => {
      if (state.pageReads.products !== action.meta.requestId) return;
      delete state.pageReads.products; state.products = action.payload; state.summary.products = action.payload.length;
    })
    .addCase(loadAdminProducts.rejected, (state, action) => {
      if (state.pageReads.products !== action.meta.requestId) return;
      delete state.pageReads.products; state.productsError = action.error.message;
    })
    .addCase(loadAdminAttention.pending, (state, action) => { state.pageReads['attention'] = action.meta.requestId; state.attentionError = null; })
    .addCase(loadAdminAttention.fulfilled, (state, action) => {
      if (state.pageReads['attention'] !== action.meta.requestId || Object.keys(state.writes).length) return;
      delete state.pageReads['attention'];
      state.attention = action.payload; state.summary.missedItems = action.payload.length;
    })
    .addCase(loadAdminAttention.rejected, (state, action) => {
      if (state.pageReads.attention !== action.meta.requestId) return;
      delete state.pageReads.attention; state.attentionError = action.error.message;
    })
    .addCase(loadAdminDirectory.pending, (state, action) => { state.pageReads['directory'] = action.meta.requestId; state.membersStatus = 'loading'; state.membersError = null; })
    .addCase(loadAdminDirectory.fulfilled, (state, action) => {
      if (state.pageReads['directory'] !== action.meta.requestId || Object.keys(state.writes).length) return;
      delete state.pageReads['directory'];
      state.members = action.payload; state.membersStatus = 'succeeded'; state.membersError = null;
      state.summary.totalMembers = action.payload.length;
      state.summary.activeUsers = action.payload.filter((member) => member.online).length;
      state.summary.averageAdherence = action.payload.length ? Math.round(action.payload.reduce((sum, member) => sum + Number(member.adherence || 0), 0) / action.payload.length) : 0;
    })
    .addCase(loadAdminDirectory.rejected, (state, action) => {
      if (state.pageReads.directory !== action.meta.requestId) return;
      delete state.pageReads.directory; state.membersStatus = 'failed'; state.membersError = action.error.message;
    })
    .addCase(loadAdminApprovals.pending, (state, action) => { state.pageReads['approvals'] = action.meta.requestId; state.approvalsError = null; })
    .addCase(loadAdminApprovals.fulfilled, (state, action) => {
      if (state.pageReads['approvals'] !== action.meta.requestId || Object.keys(state.writes).length) return;
      delete state.pageReads['approvals']; state.approvals = action.payload; state.summary.pendingApprovals = action.payload.length; })
    .addCase(loadAdminApprovals.rejected, (state, action) => {
      if (state.pageReads.approvals !== action.meta.requestId) return;
      delete state.pageReads.approvals; state.approvalsError = action.error.message;
    })
    .addCase(loadAdminMemberPlan.pending, (state, action) => { state.pageReads['plan'] = action.meta.requestId; })
    .addCase(loadAdminMemberPlan.fulfilled, (state, action) => {
      if (state.pageReads['plan'] !== action.meta.requestId || Object.keys(state.writes).length) return;
      delete state.pageReads['plan']; state.memberMealPlans[action.meta.arg] = { ...action.payload, items: action.payload.items.map(normalizeMeal) }; })
    .addCase(loadAdminMembers.pending, (state, action) => { state.membersStatus = 'loading'; state.readId = action.meta.requestId; })
    .addCase(loadAdminMembers.fulfilled, (state, action) => {
      if (state.readId !== action.meta.requestId) return;
      state.readId = null;
      if (action.payload.fallback) {
        state.members = action.payload.members;
        state.approvals = action.payload.approvals;
        state.summary.totalMembers = action.payload.members.length;
        state.summary.pendingApprovals = action.payload.approvals.length;
        state.membersStatus = 'degraded';
        state.membersError = null;
        return;
      }
      const selectedRange = state.mealInsights.selectedRange;
      Object.assign(state, action.payload, { membersStatus: 'succeeded', membersError: null });
      state.mealInsights.selectedRange = selectedRange;
      Object.values(state.memberMealPlans).forEach((plan) => { plan.items = plan.items.map(normalizeMeal); });
    })
    .addCase(loadAdminMembers.rejected, (state, action) => {
      if (state.readId !== action.meta.requestId) return;
      state.readId = null; state.membersStatus = 'failed'; state.membersError = action.error.message;
    })
    .addCase(updateMemberMealPlan.fulfilled, (state, action) => {
      state.memberMealPlans[action.meta.arg.memberId] = { ...action.payload, items: action.payload.items.map(normalizeMeal) };
      const member = state.members.find((row) => row.id === action.meta.arg.memberId);
      if (member) member.plan = action.payload.planName || 'No plan assigned';
    })
    .addCase(nudgeAttention.pending, (state, action) => {
      const index = state.attention.findIndex((row) => row.id === action.meta.arg);
      if (index < 0) return;
      state.attentionRollbacks[action.meta.requestId] = { kind: 'nudge', index, item: { ...state.attention[index] } };
      state.attention[index].status = 'NUDGED';
    })
    .addCase(nudgeAttention.fulfilled, (state, action) => { delete state.attentionRollbacks[action.meta.requestId]; })
    .addCase(nudgeAttention.rejected, (state, action) => {
      const rollback = state.attentionRollbacks[action.meta.requestId];
      if (rollback) {
        const index = state.attention.findIndex((row) => row.id === rollback.item.id);
        if (index >= 0) state.attention[index] = rollback.item;
      }
      delete state.attentionRollbacks[action.meta.requestId];
    })
    .addCase(resolveAttention.pending, (state, action) => {
      const index = state.attention.findIndex((row) => row.id === action.meta.arg);
      if (index < 0) return;
      state.attentionRollbacks[action.meta.requestId] = { kind: 'resolve', index, item: { ...state.attention[index] } };
      state.attention.splice(index, 1);
    })
    .addCase(resolveAttention.fulfilled, (state, action) => {
      state.attention = state.attention.filter((row) => row.id !== action.meta.arg);
      delete state.attentionRollbacks[action.meta.requestId];
      state.summary.missedItems = state.attention.length;
      state.members.forEach((member) => {
        const alert = state.attention.find((row) => row.memberId === member.id);
        member.attentionLevel = alert ? 'NEEDS_ATTENTION' : 'NONE'; member.attentionReason = alert?.title || '';
      });
    })
    .addCase(resolveAttention.rejected, (state, action) => {
      const rollback = state.attentionRollbacks[action.meta.requestId];
      if (rollback && !state.attention.some((row) => row.id === rollback.item.id)) state.attention.splice(rollback.index, 0, rollback.item);
      delete state.attentionRollbacks[action.meta.requestId];
    })
    .addMatcher((action) => writes.some((write) => write.pending.match(action)), (state, action) => {
      state.writes[action.meta.requestId] = true; state.readId = null; state.pageReads = {};
    })
    .addMatcher((action) => writes.some((write) => write.fulfilled.match(action) || write.rejected.match(action)), (state, action) => {
      delete state.writes[action.meta.requestId]; state.readId = null;
    })
    .addMatcher((a) => [approveRequest.fulfilled.type, declineRequest.fulfilled.type].includes(a.type), (state, action) => {
      state.lastApprovalDecision = action.payload;
      state.approvals = state.approvals.filter((member) => member.id !== action.meta.arg);
      state.summary.pendingApprovals = state.approvals.length;
      const approved = action.payload.request;
      if (action.payload.decision === 'approved' && approved && !state.members.some((row) => row.id === approved.id)) {
        state.members.push({ ...approved, status: 'ACTIVE', plan: 'No plan assigned', adherence: 0,
          meals: 0, hydration: 0, streak: 0, online: false, lastActiveAt: 'No activity yet',
          attentionLevel: 'NONE', attentionReason: '', adherenceSeries: [] });
        state.summary.totalMembers = state.members.length;
      }
    }),
});
export const { clearApprovalNotice, setInsightRange, setPreference } = slice.actions;
export const selectAdminSummary = (state) => state.admin.summary;
export const selectAdminMembers = (state) => state.admin.members;
export const selectAdminApprovals = (state) => state.admin.approvals;
export const selectAdminMealInsights = (state) => state.admin.mealInsights;
export const selectAdminAttention = (state) => state.admin.attention;
export const selectAdminPreferences = (state) => state.admin.preferences;
export const selectAdminMemberMealPlans = (state) => state.admin.memberMealPlans;
export const selectAdminMemberMealPostHistory = (state) => state.admin.memberMealPostHistory;
export default slice.reducer;
