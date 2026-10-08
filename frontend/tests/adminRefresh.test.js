import test from 'node:test';
import assert from 'node:assert/strict';
import * as toolkit from '@reduxjs/toolkit';
import { loadModule, deferred } from './loadModule.js';

function harness(request) {
  const alerts = [], invalidated = [];
  const admin = loadModule('../src/store/slices/adminSlice.js', {
    '@reduxjs/toolkit': toolkit, '../../services/api/client': { request },
    './mealSlice': { normalizeMeal: (meal) => meal },
  });
  const store = toolkit.configureStore({ reducer: { auth: () => ({ token: 'jwt' }), admin: admin.default } });
  let now = 0;
  const module = loadModule('../src/hooks/usePageRefresh.js', {
    react: { useCallback: (callback) => callback, useRef: (current) => ({ current }), useState: (value) => [value, () => {}] },
    '../utils/appAlert': { __esModule: true, default: { alert: (...args) => alerts.push(args) } },
    'react-native': { AppState: { currentState: 'active' } },
    '@react-navigation/native': { useRoute: () => ({ name: 'AdminDashboard' }), useFocusEffect: () => {} },
    'react-redux': { useDispatch: () => store.dispatch, useSelector: (selector) => selector(store.getState()) },
    '../services/api/client': { refreshPageResponses: (paths) => invalidated.push(paths) },
    '../store/slices/adminSlice': admin,
    '../store/slices/dashboardSlice': {}, '../store/slices/mealSlice': {}, '../store/slices/planSlice': {},
    '../store/slices/activitySlice': {}, '../store/slices/profileSlice': {}, '../store/slices/notificationSlice': {},
    '../store/slices/memberAccessSlice': {}, '../store/slices/adminMemberJournalSlice': {},
  }, { Date: { now: () => { now += 1000; return now; } }, setTimeout: (callback) => { callback(); } });
  return { admin, store, refresh: module.default().onRefresh, alerts, invalidated };
}

test('manual admin home refresh fetches fresh data during an older dashboard read', async () => {
  const old = deferred(); let calls = 0;
  const app = harness(async () => { calls += 1; return calls === 1 ? old.promise : { members: [{ id: 2, name: 'Updated' }] }; });
  const loading = app.store.dispatch(app.admin.loadAdminMembers());
  await app.refresh();
  assert.equal(app.alerts.length, 0, 'concurrent reads must not display a condition-callback failure');
  assert.equal(calls, 2, 'pull to refresh must start a fresh request');
  assert.equal(app.store.getState().admin.members[0].name, 'Updated');
  assert.equal(app.invalidated.length, 1);
  old.resolve({ members: [{ id: 1, name: 'Old' }] }); await loading;
  assert.equal(app.store.getState().admin.members[0].name, 'Updated', 'late older data must not overwrite the refresh');
});

test('admin refresh still reports a real server failure', async () => {
  const app = harness(async () => { throw new Error('Server unavailable'); });
  await app.refresh();
  assert.equal(app.alerts.length, 1);
  assert.equal(app.alerts[0][1], 'Server unavailable');
});

test('admin refresh keeps the save guard and explains a busy sync without internal Redux errors', async () => {
  const saving = deferred(); let calls = 0;
  const app = harness(async () => { calls += 1; return saving.promise; });
  const write = app.store.dispatch(app.admin.updateMemberMealPlan({ memberId: 7, planName: 'Plan', items: [] }));
  const read = await app.store.dispatch(app.admin.loadAdminMembers({ force: true }));
  assert.equal(read.meta.condition, true);
  await app.refresh();
  assert.equal(calls, 1, 'refresh must not read over an unfinished save');
  assert.equal(app.alerts.length, 1);
  assert.doesNotMatch(app.alerts[0][1], /condition callback/i);
  assert.match(app.alerts[0][1], /sync/i);
  saving.resolve({ items: [] }); await write;
});

test('opening admin home reads once without starting a timer or foreground refresh', async () => {
  let focus, requests = 0;
  const invalidated = [];
  const admin = loadModule('../src/store/slices/adminSlice.js', {
    '@reduxjs/toolkit': toolkit, '../../services/api/client': { request: async () => { requests++; return {}; } },
    './mealSlice': { normalizeMeal: (meal) => meal },
  });
  const store = toolkit.configureStore({ reducer: { auth: () => ({ token: 'jwt' }), admin: admin.default } });
  const module = loadModule('../src/hooks/usePageRefresh.js', {
    react: { useCallback: (callback) => callback, useRef: (current) => ({ current }), useState: (value) => [value, () => {}] },
    '../utils/appAlert': { __esModule: true, default: {} },
    'react-native': { AppState: { currentState: 'active', addEventListener: () => { throw new Error('Page data must not refresh on foreground'); } } },
    '@react-navigation/native': { useRoute: () => ({ name: 'AdminDashboard' }), useFocusEffect: (callback) => { focus = callback; } },
    'react-redux': { useDispatch: () => store.dispatch, useSelector: (selector) => selector(store.getState()) },
    '../services/api/client': { refreshPageResponses: (paths) => invalidated.push(paths) },
    '../store/slices/adminSlice': admin,
    '../store/slices/dashboardSlice': {}, '../store/slices/mealSlice': {}, '../store/slices/planSlice': {},
    '../store/slices/activitySlice': {}, '../store/slices/profileSlice': {}, '../store/slices/notificationSlice': {},
    '../store/slices/memberAccessSlice': {}, '../store/slices/adminMemberJournalSlice': {},
  }, { setInterval: () => { throw new Error('Page data must not poll'); } });
  module.default(); focus();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(requests, 1); assert.equal(invalidated.length, 1);
});

test('approving a member updates local home and member totals without a second GET', async () => {
  const calls = [];
  const app = harness(async (path) => { calls.push(path); return path === '/admin/approvals'
    ? [{ id: 7, name: 'New member', status: 'PENDING' }] : null; });
  await app.store.dispatch(app.admin.loadAdminApprovals()).unwrap();
  await app.store.dispatch(app.admin.approveRequest(7)).unwrap();
  assert.deepEqual(calls, ['/admin/approvals', '/admin/users/7/approval']);
  assert.equal(app.store.getState().admin.summary.totalMembers, 1);
  assert.equal(app.store.getState().admin.members[0].status, 'ACTIVE');
  assert.equal(app.store.getState().admin.summary.pendingApprovals, 0);
});
