import test from 'node:test';
import assert from 'node:assert/strict';
import * as toolkit from '@reduxjs/toolkit';
import { loadModule, deferred } from './loadModule.js';

const createPush = ({ request = async () => null, environment = 'standalone', permission = { granted: true }, native = {} } = {}) => {
  const Notifications = { AndroidImportance: { HIGH: 4 }, setNotificationChannelAsync: async () => {},
    getPermissionsAsync: async () => permission, requestPermissionsAsync: async () => ({ granted: true }),
    getExpoPushTokenAsync: async () => ({ data: 'ExponentPushToken[test-device]' }), ...native };
  return loadModule('../src/services/notifications/pushNotifications.js', {
    'react-native': { Platform: { OS: 'android' } },
    'expo-constants': { executionEnvironment: environment, easConfig: { projectId: 'test-project' } },
    'expo-crypto': { randomUUID: () => 'a1111111-1111-4111-a111-111111111111' },
    'expo-notifications': Notifications, '../api/client': { request },
  });
};
test('Expo Go explains the development build requirement and never calls push registration', async () => {
  const push = createPush({ environment: 'storeClient', request: () => { throw Error('Must not call backend'); } });
  const result = await push.syncPushRegistration(push.beginPushSession('auth', 1), true);
  assert.equal(result.status, 'unsupported'); assert.match(result.message, /development build/);
  assert.equal(await push.notificationModule(), null);
});
test('Android channels use the system sound without passing a custom filename or silencing them', async () => {
  const channels = [];
  const push = createPush({ native: { setNotificationChannelAsync: async (id, options) => {
    channels.push(id);
    assert.equal(Object.hasOwn(options, 'sound'), false);
    assert.equal(options.importance, 4);
  } } });
  const result = await push.syncPushRegistration(push.beginPushSession('auth', 1));
  assert.equal(result.status, 'enabled');
  assert.deepEqual(channels, ['meal-reminders', 'coach-nudges']);
});
test('permission is requested only on explicit enable and token is bound to authenticated session', async () => {
  const requests = []; let prompts = 0;
  const push = createPush({ permission: { granted: false, canAskAgain: true },
    native: { requestPermissionsAsync: async () => { prompts++; return { granted: true }; } },
    request: async (path, options) => requests.push({ path, ...options }) });
  const session = push.beginPushSession('user-secret', 1);
  assert.equal((await push.syncPushRegistration(session)).status, 'disabled'); assert.equal(prompts, 0);
  assert.equal((await push.syncPushRegistration(session, true)).status, 'enabled'); assert.equal(prompts, 1);
  assert.equal(requests[0].headers.Authorization, 'Bearer user-secret');
  assert.equal(JSON.parse(requests[0].body).token, 'ExponentPushToken[test-device]');
  await push.revokePushBeforeLogout('user-secret');
  assert.equal(requests[1].path, '/notifications/devices/unregister');
});
test('revoked phone permission unregisters a previously connected device', async () => {
  const permission = { granted: true, canAskAgain: false }; const paths = [];
  const push = createPush({ permission, request: async (path) => paths.push(path) });
  const session = push.beginPushSession('auth', 1);
  await push.syncPushRegistration(session); permission.granted = false;
  assert.equal((await push.syncPushRegistration(session)).status, 'denied');
  assert.deepEqual(paths, ['/notifications/devices', '/notifications/devices/unregister']);
});
test('native token rotation is passed through without requesting another native token', async () => {
  let received;
  const push = createPush({ native: { getExpoPushTokenAsync: async (options) => { received = options.devicePushToken; return { data: 'ExponentPushToken[rotated]' }; } } });
  const rotated = { type: 'android', data: 'new-native-token' };
  await push.syncPushRegistration(push.beginPushSession('auth', 1), false, rotated);
  assert.equal(received, rotated);
});
test('logout waits for an in-flight registration and revokes it before returning', async () => {
  const started = deferred(), registration = deferred(); const paths = [];
  const push = createPush({ request: async (path) => { paths.push(path); if (path === '/notifications/devices') { started.resolve(); await registration.promise; } } });
  const session = push.beginPushSession('auth', 1);
  const syncing = push.syncPushRegistration(session); await started.promise;
  let finished = false;
  const logout = push.revokePushBeforeLogout('auth').then(() => { finished = true; });
  await Promise.resolve(); assert.equal(finished, false);
  registration.resolve(); await syncing; await logout;
  assert.equal(paths.at(-1), '/notifications/devices/unregister'); assert.equal(session.stopped, true);
});
test('failed unregister remains retryable and does not claim the device was disconnected', async () => {
  let offline = true;
  const push = createPush({ request: async (path) => { if (path.endsWith('unregister') && offline) throw Error('Offline'); } });
  const session = push.beginPushSession('auth', 1); await push.syncPushRegistration(session);
  await assert.rejects(push.revokePushBeforeLogout('auth'), /Offline/);
  assert.equal(session.stopped, false); assert.ok(session.expoToken);
  offline = false; await push.revokePushBeforeLogout('auth'); assert.equal(session.expoToken, null);
});
test('notification taps from a different account or without an owner are rejected', () => {
  const push = createPush();
  assert.equal(push.isOwnNotification({ request: { content: { data: { userId: '2' } } } }, 1), false);
  assert.equal(push.isOwnNotification(null, 1), false);
  assert.equal(push.isOwnNotification({ request: { content: { data: { userId: '1' } } } }, 1), true);
});
test('preferences update immediately, ignore stale reads and roll back with retry data', async () => {
  const read = deferred(), write = deferred();
  const n = loadModule('../src/store/slices/notificationSlice.js', { '@reduxjs/toolkit': toolkit,
    '../../services/api/client': { request: (_, options) => options.method === 'PUT' ? write.promise : read.promise } });
  const store = toolkit.configureStore({ reducer: { auth: () => ({ token: 'auth' }), notifications: n.default } });
  const loading = store.dispatch(n.loadNotificationPreferences());
  const saving = store.dispatch(n.saveNotificationPreferences({ mealReminders: false, coachNudges: true }));
  assert.equal(store.getState().notifications.timelineRemindersEnabled, false);
  read.resolve({ mealReminders: true, coachNudges: true, pushAvailable: true }); await loading;
  assert.equal(store.getState().notifications.timelineRemindersEnabled, false);
  write.reject(Error('Offline')); await saving;
  assert.equal(store.getState().notifications.timelineRemindersEnabled, true);
  assert.equal(store.getState().notifications.failedPreferences.mealReminders, false);
});
test('meal reminders can be disabled without hiding coach nudges', () => {
  const n = loadModule('../src/store/slices/notificationSlice.js', { '@reduxjs/toolkit': toolkit, '../../services/api/client': {} });
  const result = n.selectTimelineNotifications({ meals: { items: [{ id: 2, consumed: false }] }, notifications: {
    timelineRemindersEnabled: false, coachNudgesEnabled: true,
    items: [{ id: 1, title: 'A reminder from your coach', scheduledAt: new Date().toISOString() }],
  } });
  assert.equal(result.length, 1); assert.equal(result[0].id, 'event-1');
});

test('the reminder timeline excludes notifications from previous days', () => {
  const n = loadModule('../src/store/slices/notificationSlice.js', { '@reduxjs/toolkit': toolkit, '../../services/api/client': {} });
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const result = n.selectTimelineNotifications({ meals: { items: [] }, notifications: {
    timelineRemindersEnabled: true, coachNudgesEnabled: true,
    items: [
      { id: 1, title: 'A reminder from your coach', scheduledAt: yesterday.toISOString() },
      { id: 2, title: 'A reminder from your coach', scheduledAt: new Date().toISOString() },
    ],
  } });
  assert.equal(result.length, 1); assert.equal(result[0].id, 'event-2');
});
