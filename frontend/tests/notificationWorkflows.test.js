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

test('opening the inbox acknowledges unread messages in one request and leaves newer messages unread', async () => {
  const write = deferred(); let writes = 0;
  const { module: n, store } = setup(async (path, options) => {
    if (options.method === 'PATCH') {
      writes++; assert.equal(path, '/notifications/read');
      assert.deepEqual(JSON.parse(options.body), { ids: [10, 11] });
      assert.equal(options.headers.Authorization, 'Bearer test'); return write.promise;
    }
    return [{ id: 10, read: false }, { id: 11, read: false }, { id: 12, read: true }];
  });
  await store.dispatch(n.loadNotifications());
  const marking = store.dispatch(n.markInboxNotificationsRead([10, 11, 12]));
  await store.dispatch(n.markInboxNotificationsRead([10, 11]));
  assert.equal(writes, 1, 'overlapping focus or tap acknowledgements must not duplicate the batch');
  assert.equal(n.selectUnreadNotificationCount(store.getState()), 2);
  store.dispatch(n.loadNotifications.fulfilled([...store.getState().notifications.items, { id: 13, read: false }], 'new-read'));
  write.resolve(); await marking;
  assert.equal(n.selectUnreadNotificationCount(store.getState()), 1);
  assert.equal(store.getState().notifications.items.find((item) => item.id === 13).read, false);
});

test('an older inbox response cannot restore the red dot after read acknowledgement', async () => {
  const { module: n, store } = setup(async () => [{ id: 10, read: false }]);
  await store.dispatch(n.loadNotifications());
  await store.dispatch(n.markInboxNotificationsRead([10]));
  store.dispatch(n.loadNotifications.fulfilled([{ id: 10, read: false }], 'older-read'));
  assert.equal(n.selectUnreadNotificationCount(store.getState()), 0);
  store.dispatch(n.loadNotifications.fulfilled([{ id: 10, read: false }, { id: 11, read: false }], 'new-read'));
  assert.equal(n.selectUnreadNotificationCount(store.getState()), 1);
});

test('failed read acknowledgement retains the badge and allows a successful retry', async () => {
  let offline = true;
  const { module: n, store } = setup(async (path, options) => {
    if (options.method === 'PATCH') { if (offline) throw new Error('Offline'); return; }
    return [{ id: 10, read: false }];
  });
  await store.dispatch(n.loadNotifications());
  await store.dispatch(n.markInboxNotificationsRead([10]));
  assert.equal(n.selectUnreadNotificationCount(store.getState()), 1);
  assert.equal(store.getState().notifications.readInboxError, 'Offline');
  offline = false; await store.dispatch(n.markInboxNotificationsRead([10]));
  assert.equal(n.selectUnreadNotificationCount(store.getState()), 0);
  assert.equal(store.getState().notifications.readInboxError, null);
});

test('inbox focus marks loaded messages read; background navigation leaves new messages unread', async () => {
  let focused = false, writes = 0;
  const { module: n, store } = setup(async (path, options) => {
    if (options.method === 'PATCH') { writes++; return; }
    return [{ id: 10, read: false }];
  });
  const { default: useInboxRead } = loadModule('../src/hooks/useNotificationInboxRead.js', {
    react: { useCallback: (fn) => fn }, '@react-navigation/native': { useFocusEffect: (fn) => { if (focused) fn(); } },
    'react-redux': { useDispatch: () => store.dispatch, useSelector: (select) => select(store.getState()) },
    '../store/slices/notificationSlice': n,
  });
  await store.dispatch(n.loadNotifications()); useInboxRead();
  assert.equal(writes, 0);
  focused = true; useInboxRead();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(n.selectUnreadNotificationCount(store.getState()), 0);
  focused = false;
  store.dispatch(n.loadNotifications.fulfilled([{ id: 10, read: true }, { id: 11, read: false }], 'new-read'));
  useInboxRead(); assert.equal(writes, 1);
  assert.equal(n.selectUnreadNotificationCount(store.getState()), 1);
});

test('member home header only shows a red dot for actual unread inbox messages', async () => {
  const { module: n, store } = setup(async (path, options) => options.method === 'PATCH' ? undefined : [{ id: 10, read: false }]);
  const { default: UserHeader } = loadModule('../src/components/user/UserHeader.jsx', {
    react: { __esModule: true, default: { createElement: (type, props, ...children) => ({ type, props, children }) } },
    'react-native': { Pressable: 'Pressable', Text: 'Text', View: 'View', StyleSheet: { create: (s) => s } },
    '@expo/vector-icons': { Ionicons: 'Icon' }, 'react-redux': { useSelector: (select) => select(store.getState()) },
    '../../store/slices/notificationSlice': n, '../common/AppLogo': { __esModule: true, default: 'Logo' },
    '../../theme': { colors: {}, fonts: {}, shadows: {} },
  });
  const hasDot = (node) => !!node && (node.props?.accessibilityLabel === 'Unread notifications' || node.children?.some(hasDot));
  assert.equal(hasDot(UserHeader({ navigation: {} })), false);
  await store.dispatch(n.loadNotifications());
  assert.equal(hasDot(UserHeader({ navigation: {} })), true);
  await store.dispatch(n.markInboxNotificationsRead([10]));
  assert.equal(hasDot(UserHeader({ navigation: {} })), false);
});
