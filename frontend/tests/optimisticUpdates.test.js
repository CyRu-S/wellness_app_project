import test from 'node:test';
import assert from 'node:assert/strict';
import * as toolkit from '@reduxjs/toolkit';
import { loadModule, deferred } from './loadModule.js';
import * as activityUtils from '../src/utils/activitySession.js';

const setup = (modules, initial = {}) => toolkit.configureStore({
  reducer: { auth: () => ({ token: 'test-token' }), ...Object.fromEntries(Object.entries(modules).map(([key, module]) => [key, module.default])) },
  preloadedState: initial,
});
const dashboardModule = (read, write) => loadModule('../src/store/slices/dashboardSlice.js', {
  '@reduxjs/toolkit': toolkit, '../../services/api/dashboardApi': { getDashboard: read }, '../../services/api/client': { request: write }, '../../utils/activitySession': activityUtils,
});

test('outside food adds nutrition and a tagged post without completing a plan slot, and failure rolls back', async () => {
  const write = deferred();
  const meals = loadModule('../src/store/slices/mealSlice.js', {
    '@reduxjs/toolkit': toolkit, '../../services/api/client': { request: async () => [] },
    '../../services/api/mealApi': { getMeals: async () => [] }, '../../services/api/planApi': { getPlan: async () => ({}) },
    '../../utils/memberJournal': { formatJournalClock: (time) => time }, '../../services/api/mealPostApi': { createMealPost: () => write.promise },
  });
  const dashboard = dashboardModule(async () => ({}), async () => ({}));
  const store = setup({ meals, dashboard }, {
    meals: { ...meals.default(undefined, { type: 'init' }), items: [{ id: 4, consumed: false }] },
    dashboard: { ...dashboard.default(undefined, { type: 'init' }), completion: 25 },
  });
  const saving = store.dispatch(meals.postMeal({ plannedMealId: null, mealType: 'Outside food', mealName: 'Pizza',
    calories: 450, proteinGrams: 15, clientRequestId: 'outside-photo', imageUri: 'file:///pizza.jpg' }));
  assert.equal(store.getState().meals.items[0].consumed, false);
  assert.equal(store.getState().meals.items.length, 1);
  assert.equal(store.getState().meals.postHistory[0].type, 'Outside food');
  assert.equal(store.getState().dashboard.calories, 450);
  assert.equal(store.getState().dashboard.completion, 25);
  write.reject(new Error('Offline')); await saving;
  assert.equal(store.getState().meals.postHistory.length, 0);
  assert.equal(store.getState().dashboard.calories, 0);
  assert.equal(store.getState().dashboard.completion, 25);
  assert.equal(store.getState().meals.failedPost.mealType, 'Outside food');
});

test('water updates immediately, blocks duplicate taps, ignores a stale poll and rolls back failure', async () => {
  const read = deferred(), write = deferred();
  let posts = 0;
  const dashboard = dashboardModule(() => read.promise, () => { posts++; return write.promise; });
  const store = setup({ dashboard });
  const polling = store.dispatch(dashboard.refreshDashboard());
  const saving = store.dispatch(dashboard.drinkWater());
  assert.equal(store.getState().dashboard.waterGlasses, 1);
  await store.dispatch(dashboard.drinkWater());
  assert.equal(posts, 1);
  read.resolve({ waterGlasses: 0 }); await polling;
  assert.equal(store.getState().dashboard.waterGlasses, 1);
  write.reject(new Error('Offline')); await saving;
  assert.equal(store.getState().dashboard.waterGlasses, 0);
  assert.equal(store.getState().dashboard.waterError, 'Offline');
  assert.equal(store.getState().dashboard.optimistic.water, undefined);
});

test('a confirmed water write succeeds without a second dashboard request', async () => {
  let reads = 0;
  const dashboard = dashboardModule(() => { reads++; throw new Error('Read unavailable'); }, async () => ({ amountMl: 250 }));
  const store = setup({ dashboard });
  await store.dispatch(dashboard.drinkWater()).unwrap();
  assert.equal(reads, 0);
  assert.equal(store.getState().dashboard.waterGlasses, 1);
});

test('profile preview survives stale reads, keeps saving state, and restores the original on failure', async () => {
  const read = deferred(), upload = deferred();
  const profile = loadModule('../src/store/slices/profileSlice.js', {
    '@reduxjs/toolkit': toolkit,
    '../../services/api/profileApi': { getProfile: () => read.promise, uploadProfilePhoto: () => upload.promise },
  });
  const store = setup({ profile });
  const polling = store.dispatch(profile.loadProfile('test-token'));
  const saving = store.dispatch(profile.saveProfilePhoto({ token: 'test-token', photo: { uri: 'file:///new.jpg' } }));
  assert.equal(store.getState().profile.profileImageUrl, 'file:///new.jpg');
  read.resolve({ profileImageUrl: '/api/old', name: 'Old' }); await polling;
  assert.equal(store.getState().profile.profileImageUrl, 'file:///new.jpg');
  assert.equal(store.getState().profile.status, 'saving');
  upload.reject(new Error('Upload failed')); await saving;
  assert.equal(store.getState().profile.profileImageUrl, null);
  assert.equal(store.getState().profile.status, 'error');
});

test('a completed upload is not reverted by a read that started before saving', async () => {
  const read = deferred();
  const profile = loadModule('../src/store/slices/profileSlice.js', {
    '@reduxjs/toolkit': toolkit,
    '../../services/api/profileApi': { getProfile: () => read.promise, uploadProfilePhoto: async () => ({ profileImageUrl: '/api/new' }) },
  });
  const store = setup({ profile });
  const polling = store.dispatch(profile.loadProfile('test-token'));
  await store.dispatch(profile.saveProfilePhoto({ token: 'test-token', photo: { uri: 'file:///new.jpg' } }));
  read.resolve({ profileImageUrl: '/api/old' }); await polling;
  assert.equal(store.getState().profile.profileImageUrl, '/api/new');
  assert.ok(store.getState().profile.profileImageVersion);
});

test('activity appears immediately in history and dashboard; failure rolls back both', async () => {
  const write = deferred();
  const activity = loadModule('../src/store/slices/activitySlice.js', {
    '@reduxjs/toolkit': toolkit, '../../services/api/client': { request: async () => [] },
    '../../services/api/activityApi': { createActivity: () => write.promise }, '../../utils/activitySession': activityUtils,
  });
  const dashboard = dashboardModule(async () => ({}), async () => ({}));
  const store = setup({ activity, dashboard });
  const session = { activity: 'Walk', durationSeconds: 120, startedAt: new Date().toISOString() };
  const saving = store.dispatch(activity.completeActivity(session));
  assert.equal(store.getState().activity.history.length, 1);
  assert.equal(store.getState().dashboard.activeMinutes, 2);
  write.reject(new Error('Offline')); await saving;
  assert.equal(store.getState().activity.history.length, 0);
  assert.equal(store.getState().dashboard.activeMinutes, 0);
  assert.equal(store.getState().activity.failedSession, session);
});

test('meal preview updates nutrition immediately; failure restores the meal and retains its retry key', async () => {
  const write = deferred();
  const meals = loadModule('../src/store/slices/mealSlice.js', {
    '@reduxjs/toolkit': toolkit, '../../services/api/client': { request: async () => [] },
    '../../services/api/mealApi': { getMeals: async () => [] }, '../../services/api/planApi': { getPlan: async () => ({}) },
    '../../utils/memberJournal': { formatJournalClock: (time) => time }, '../../services/api/mealPostApi': { createMealPost: () => write.promise },
  });
  const dashboard = dashboardModule(async () => ({}), async () => ({}));
  const initialMeals = meals.default(undefined, { type: 'init' });
  const store = setup({ meals, dashboard }, { meals: { ...initialMeals, items: [{ id: 4, consumed: false }] } });
  const saving = store.dispatch(meals.postMeal({ plannedMealId: 4, mealName: 'Oats', calories: 300, proteinGrams: 20, optimisticCompletion: 100, clientRequestId: 'same-on-retry', imageUri: 'file:///meal.jpg' }));
  assert.equal(store.getState().meals.items[0].consumed, true);
  assert.equal(store.getState().dashboard.calories, 300);
  assert.equal(store.getState().dashboard.completion, 100);
  write.reject(new Error('Offline')); await saving;
  assert.equal(store.getState().meals.items[0].consumed, false);
  assert.equal(store.getState().dashboard.calories, 0);
  assert.equal(store.getState().meals.failedPost.clientRequestId, 'same-on-retry');
});

test('confirmed admin approval is not turned into a failure by a follow-up read', async () => {
  let reads = 0;
  const admin = loadModule('../src/store/slices/adminSlice.js', {
    '@reduxjs/toolkit': toolkit, './mealSlice': { normalizeMeal: (meal) => meal },
    '../../services/api/client': { request: async (_path, options) => {
      if (!options.method) { reads++; throw new Error('Read unavailable'); }
      return null;
    } },
  });
  const initial = admin.default(undefined, { type: 'init' });
  const store = setup({ admin }, { admin: { ...initial, approvals: [{ id: 1, name: 'Member' }] } });
  await store.dispatch(admin.approveRequest(1)).unwrap();
  assert.equal(store.getState().admin.approvals.length, 0);
  assert.equal(store.getState().admin.lastApprovalDecision.decision, 'approved');
  assert.equal(reads, 0);
});

test('attention nudges and resolves update immediately and return as actions after failure', async () => {
  const nudge = deferred(), resolve = deferred();
  const admin = loadModule('../src/store/slices/adminSlice.js', {
    '@reduxjs/toolkit': toolkit, './mealSlice': { normalizeMeal: (meal) => meal },
    '../../services/api/client': { request: (path) => path.endsWith('/nudge') ? nudge.promise : resolve.promise },
  });
  const initial = admin.default(undefined, { type: 'init' });
  const alert = { id: 8, memberId: 2, status: 'OPEN', severity: 'HIGH', category: 'Meals', title: 'Breakfast overdue' };
  const other = { id: 9, memberId: 2, status: 'OPEN', severity: 'MEDIUM', category: 'Hydration', title: 'Water overdue' };
  const store = setup({ admin }, { admin: { ...initial, summary: { ...initial.summary, missedItems: 2 }, attention: [alert, other], members: [{ id: 2, attentionLevel: 'NEEDS_ATTENTION' }] } });

  const nudging = store.dispatch(admin.nudgeAttention(8));
  assert.equal(store.getState().admin.attention[0].status, 'NUDGED');
  assert.equal(store.getState().admin.summary.missedItems, 0);
  assert.equal(store.getState().admin.members[0].attentionReason, '');
  nudge.reject(new Error('Offline')); await nudging;
  assert.equal(store.getState().admin.attention[0].status, 'OPEN');
  assert.equal(store.getState().admin.summary.missedItems, 2);

  const resolving = store.dispatch(admin.resolveAttention(8));
  assert.equal(store.getState().admin.attention.length, 1);
  assert.equal(store.getState().admin.summary.missedItems, 1);
  resolve.reject(new Error('Offline')); await resolving;
  assert.equal(store.getState().admin.attention[0].id, alert.id);
  assert.equal(store.getState().admin.attention[0].status, 'OPEN');
  assert.equal(store.getState().admin.summary.missedItems, 2);
});

test('access is granted only after confirmation and uses the PUT response without a second request', async () => {
  const write = deferred();
  let reads = 0;
  const memberAccess = loadModule('../src/store/slices/memberAccessSlice.js', {
    '@reduxjs/toolkit': toolkit,
    '../../services/api/memberAccessApi': { replaceAdminMemberAccess: () => write.promise, getAdminMemberAccess: () => { reads++; throw new Error('Unavailable'); } },
  });
  const store = setup({ memberAccess });
  const saving = store.dispatch(memberAccess.replaceMemberAccessAssignments({ viewerId: 1, memberIds: [2] }));
  assert.equal(store.getState().memberAccess.overview.totalGrants, 0);
  write.resolve({ id: 1, name: 'Viewer', assignedCount: 1, assignedMembers: [{ id: 2, name: 'Member' }] });
  await saving.unwrap();
  assert.equal(store.getState().memberAccess.overview.totalGrants, 1);
  assert.equal(reads, 0);
});

test('switching shared members ignores a late response for the previous member', async () => {
  const first = deferred(), second = deferred();
  const memberAccess = loadModule('../src/store/slices/memberAccessSlice.js', {
    '@reduxjs/toolkit': toolkit,
    '../../services/api/memberAccessApi': { getSharedMemberToday: (_token, id) => id === 1 ? first.promise : second.promise },
  });
  const store = setup({ memberAccess });
  const old = store.dispatch(memberAccess.loadSharedMemberToday(1));
  const latest = store.dispatch(memberAccess.loadSharedMemberToday(2));
  second.resolve({ member: { id: 2 } }); await latest;
  first.resolve({ member: { id: 1 } }); await old;
  assert.equal(store.getState().memberAccess.sharedToday.member.id, 2);
});

test('a coach nudge locks every nudge type only for that recipient with the shared cooldown', async () => {
  const memberAccess = loadModule('../src/store/slices/memberAccessSlice.js', {
    '@reduxjs/toolkit': toolkit,
    '../../services/api/memberAccessApi': { nudgeSharedMember: async () => ({ sent: false, lastSentAt: '2026-10-25T04:00:00Z', availableAt: '2026-10-25T04:30:00Z' }) },
  });
  const initial = memberAccess.default(undefined, { type: 'init' });
  const members = [{ id: 2, name: 'Member', nudgedToday: false }, { id: 3, name: 'Other', nudgedToday: false }];
  const store = setup({ memberAccess }, { memberAccess: {
    ...initial,
    shared: { total: 2, members: members.map((member) => ({ ...member })) },
    sharedMembers: { total: 2, members: members.map((member) => ({ ...member })) },
    sharedToday: { member: { id: 2 }, nudges: [{ id: 10, type: 'MEALS', availableAt: null }, { id: 11, type: 'HYDRATION', availableAt: null }, { id: 12, type: 'MEALS', availableAt: null }] },
    todayByMemberId: { 2: { member: { id: 2 }, nudges: [{ id: 10, type: 'MEALS', availableAt: null }, { id: 11, type: 'HYDRATION', availableAt: null }, { id: 12, type: 'MEALS', availableAt: null }] } },
  } });

  const sending = store.dispatch(memberAccess.nudgeSharedMember({ memberId: 2, type: 'MEALS' }));
  assert.equal(store.getState().memberAccess.sharedNudge.memberId, 2);
  assert.equal(store.getState().memberAccess.sharedNudge.type, 'MEALS');
  await sending.unwrap();
  assert.equal(store.getState().memberAccess.shared.members[0].nudgedToday, true);
  assert.equal(store.getState().memberAccess.sharedMembers.members[0].nudgedToday, true);
  assert.equal(store.getState().memberAccess.shared.members[1].nudgedToday, false);
  assert.equal(store.getState().memberAccess.sharedToday.nudges[0].availableAt, '2026-10-25T04:30:00Z');
  assert.equal(store.getState().memberAccess.sharedToday.nudges[1].availableAt, '2026-10-25T04:30:00Z');
  assert.equal(store.getState().memberAccess.sharedToday.nudges[2].availableAt, '2026-10-25T04:30:00Z');
  assert.equal(store.getState().memberAccess.todayByMemberId[2].nudges[2].status, 'NUDGED');
});

test('a late nudge response never locks cards for a different shared member', async () => {
  const pending = deferred();
  const memberAccess = loadModule('../src/store/slices/memberAccessSlice.js', {
    '@reduxjs/toolkit': toolkit,
    '../../services/api/memberAccessApi': {
      nudgeSharedMember: () => pending.promise,
      getSharedMemberToday: async () => ({ member: { id: 3 }, nudges: [{ id: 30, type: 'MEALS', availableAt: null }] }),
    },
  });
  const initial = memberAccess.default(undefined, { type: 'init' });
  const store = setup({ memberAccess }, { memberAccess: { ...initial,
    sharedToday: { member: { id: 2 }, nudges: [{ id: 20, type: 'MEALS', availableAt: null }] },
    todayByMemberId: { 2: { member: { id: 2 }, nudges: [{ id: 20, type: 'MEALS', availableAt: null }] } },
  } });
  const sending = store.dispatch(memberAccess.nudgeSharedMember({ memberId: 2, type: 'MEALS', attentionId: 20 }));
  await store.dispatch(memberAccess.loadSharedMemberToday(3)).unwrap();
  pending.resolve({ sent: true, availableAt: '2026-10-25T04:30:00Z' });
  await sending.unwrap();
  assert.equal(store.getState().memberAccess.sharedToday.member.id, 3);
  assert.equal(store.getState().memberAccess.sharedToday.nudges[0].availableAt, null);
  assert.equal(store.getState().memberAccess.todayByMemberId[2].nudges[0].availableAt, '2026-10-25T04:30:00Z');
});

test('an admin reconciles every recipient card with the winning senders server expiry', async () => {
  const result = { sent: false, lastSentAt: '2026-10-25T04:00:00Z', availableAt: '2026-10-25T04:30:00Z' };
  const admin = loadModule('../src/store/slices/adminSlice.js', {
    '@reduxjs/toolkit': toolkit, './mealSlice': { normalizeMeal: (meal) => meal },
    '../../services/api/client': { request: async () => result },
  });
  const initial = admin.default(undefined, { type: 'init' });
  const store = setup({ admin }, { admin: { ...initial, attention: [
    { id: 8, memberId: 2, category: 'Meals', status: 'OPEN' },
    { id: 9, memberId: 2, category: 'Healthy habit', status: 'OPEN' },
    { id: 10, memberId: 3, category: 'Meals', status: 'OPEN' },
  ] } });
  await store.dispatch(admin.nudgeAttention(8)).unwrap();
  const attention = store.getState().admin.attention;
  for (const card of attention.filter((item) => item.memberId === 2)) {
    assert.equal(card.status, 'NUDGED'); assert.equal(card.availableAt, result.availableAt);
  }
  assert.equal(attention[2].status, 'OPEN');
});

test('shared nudge synchronization removes completed items and clears revoked member data', async () => {
  let revoked = false;
  const memberAccess = loadModule('../src/store/slices/memberAccessSlice.js', {
    '@reduxjs/toolkit': toolkit,
    '../../services/api/memberAccessApi': { getSharedMemberAttention: async () => {
      if (revoked) throw Object.assign(new Error('Not found'), { status: 404 });
      return [];
    } },
  });
  const initial = memberAccess.default(undefined, { type: 'init' });
  const store = setup({ memberAccess }, { memberAccess: { ...initial,
    sharedToday: { member: { id: 2 }, nudges: [{ id: 20, status: 'NUDGED' }] },
    todayByMemberId: { 2: { member: { id: 2 }, nudges: [{ id: 20, status: 'NUDGED' }] } },
  } });
  await store.dispatch(memberAccess.syncSharedMemberAttention(2)).unwrap();
  assert.equal(store.getState().memberAccess.sharedToday.nudges.length, 0);
  revoked = true;
  await store.dispatch(memberAccess.syncSharedMemberAttention(2));
  assert.equal(store.getState().memberAccess.sharedToday, null);
  assert.equal(store.getState().memberAccess.todayByMemberId[2], undefined);
  assert.equal(store.getState().memberAccess.sharedTodayError.status, 404);
});

test('an older admin journal read cannot undo a confirmed water goal change', async () => {
  const read = deferred();
  const adminMemberJournal = loadModule('../src/store/slices/adminMemberJournalSlice.js', {
    '@reduxjs/toolkit': toolkit,
    '../../services/api/adminApi': { getAdminMemberJournal: () => read.promise, updateAdminMemberWaterGoal: async () => ({ waterGoalMl: 3000 }) },
  });
  const initial = adminMemberJournal.default(undefined, { type: 'init' });
  const store = setup({ adminMemberJournal }, { adminMemberJournal: { ...initial, byMemberId: { 1: { member: { waterGoalMl: 2000 } } } } });
  const polling = store.dispatch(adminMemberJournal.loadAdminMemberJournal({ memberId: 1 }));
  await store.dispatch(adminMemberJournal.saveAdminMemberWaterGoal({ memberId: 1, waterGoalMl: 3000 }));
  read.resolve({ member: { waterGoalMl: 2000 } }); await polling;
  assert.equal(store.getState().adminMemberJournal.byMemberId[1].member.waterGoalMl, 3000);
});
