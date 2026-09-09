import test from 'node:test';
import assert from 'node:assert/strict';
import * as toolkit from '@reduxjs/toolkit';
import { loadModule, deferred } from './loadModule.js';
import { notificationDestination } from '../src/utils/notificationDestination.js';

test('notification destinations stay within the signed-in role navigation', () => {
  for (const [kind, screen] of Object.entries({ SIGNUP: 'UserRequests', DEADLINE: 'Alerts', DIGEST: 'AdminDashboard', MEAL_POST: 'UserList', ACTIVITY: 'UserList' })) {
    assert.deepEqual(notificationDestination('ADMIN', kind), { name: 'AdminTabs', params: { screen } });
  }
  assert.deepEqual(notificationDestination('USER', 'PLAN'), { name: 'Log', params: { screen: 'TodayTimeline' } });
  assert.deepEqual(notificationDestination('USER', 'ACCESS'), { name: 'Shared', params: { screen: 'SharedMembers' } });
  assert.equal(notificationDestination('USER', 'SIGNUP').name, 'Profile');
});

const setup = (request) => {
  const module = loadModule('../src/store/slices/notificationSlice.js', { '@reduxjs/toolkit': toolkit, '../../services/api/client': { request } });
  const store = toolkit.configureStore({ reducer: { auth: () => ({ token: 'test' }), notifications: module.default } });
  return { module, store };
};

test('admin preferences update immediately, survive stale polls and roll back with retry data', async () => {
  const read = deferred(), write = deferred();
  const { module: n, store } = setup((path, options) => options.method === 'PUT' ? write.promise : read.promise);
  const polling = store.dispatch(n.loadNotificationPreferences());
  const preferences = { ...n.notificationPreferences(store.getState().notifications), signupAlerts: false, dailyDigest: true };
  const saving = store.dispatch(n.saveNotificationPreferences(preferences));
  assert.equal(store.getState().notifications.signupAlerts, false);
  assert.equal(store.getState().notifications.dailyDigest, true);
  read.resolve({ mealReminders: true, coachNudges: true, signupAlerts: true, dailyDigest: false }); await polling;
  assert.equal(store.getState().notifications.dailyDigest, true);
  write.reject(new Error('Offline')); await saving;
  assert.equal(store.getState().notifications.signupAlerts, true);
  assert.equal(store.getState().notifications.dailyDigest, false);
  assert.equal(store.getState().notifications.failedPreferences.dailyDigest, true);
  assert.equal(store.getState().notifications.preferencesError, 'Offline');
});

test('account and admin category settings are retained after saving and reading preferences', async () => {
  let saved;
  const { module: n, store } = setup(async (path, options) => {
    if (options.method === 'PUT') saved = JSON.parse(options.body);
    return { ...saved, pushAvailable: true };
  });
  await store.dispatch(n.saveNotificationPreferences({ mealReminders: false, coachNudges: true, signupAlerts: false,
    deadlineAlerts: false, dailyDigest: true, memberUpdates: false, accountUpdates: false })).unwrap();
  await store.dispatch(n.loadNotificationPreferences()).unwrap();
  const state = store.getState().notifications;
  assert.equal(state.accountUpdates, false); assert.equal(state.memberUpdates, false);
  assert.equal(state.dailyDigest, true); assert.equal(state.pushAvailable, true);
});

test('inbox read status changes only after the server confirms it', async () => {
  const write = deferred();
  const { module: n, store } = setup(async (path, options) => {
    if (options.method === 'PATCH') { assert.equal(path, '/notifications/10/read'); return write.promise; }
    return [{ id: 10, read: false, kind: 'PLAN' }];
  });
  await store.dispatch(n.loadNotifications());
  const marking = store.dispatch(n.markNotificationRead(10));
  assert.equal(store.getState().notifications.items[0].read, false);
  write.resolve(); await marking;
  assert.equal(store.getState().notifications.items[0].read, true);
});
