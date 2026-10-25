import test from 'node:test';
import assert from 'node:assert/strict';
import * as toolkit from '@reduxjs/toolkit';
import React from 'react';
import { loadModule, deferred } from './loadModule.js';

function board(request) {
  const module = loadModule('../src/store/slices/leaderboardSlice.js', {
    '@reduxjs/toolkit': toolkit, '../../services/api/client': { request },
  });
  const store = toolkit.configureStore({ reducer: { auth: () => ({ token: 'jwt' }), leaderboard: module.default } });
  return { ...module, store };
}

test('live leaderboard bypasses cached responses and ignores a late older read', async () => {
  const old = deferred(); const calls = [];
  const app = board(async (path, options) => {
    calls.push({ path, options });
    return calls.length === 1 ? old.promise : { rows: [{ memberId: 7, score: 50 }] };
  });
  const first = app.store.dispatch(app.loadLeaderboard());
  await app.store.dispatch(app.loadLeaderboard({ force: true })).unwrap();
  old.resolve({ rows: [{ memberId: 7, score: 0 }] }); await first;
  assert.equal(calls.length, 2);
  assert.ok(calls.every(({ options }) => options.cachePolicy === 'network-only' && options.headers.Authorization === 'Bearer jwt'));
  assert.equal(app.store.getState().leaderboard.rows[0].score, 50);
});

test('successful meals, habits and profile changes immediately refresh the leaderboard', async () => {
  let calls = 0;
  const leaderboard = board(async () => { calls++; return { rows: [] }; });
  const empty = () => ({});
  const dependencies = {
    '@reduxjs/toolkit': toolkit,
    './slices/authSlice': { __esModule: true, default: () => ({ token: 'jwt' }) },
    './slices/leaderboardSlice': { __esModule: true, ...leaderboard },
    './slices/toastSlice': { __esModule: true, default: empty, showToast: (payload) => ({ type: 'toast/show', payload }) },
    '../services/storage/persistedState': { schedulePersistedState: () => {} },
    '../services/storage/sessionStorage': { writeSession: async () => {} },
  };
  for (const name of ['dashboard', 'plan', 'meal', 'activity', 'notification', 'admin', 'profile', 'memberAccess', 'adminMemberJournal']) {
    dependencies[`./slices/${name}Slice`] = { __esModule: true, default: empty };
  }
  const { store } = loadModule('../src/store/index.js', dependencies);
  for (const type of ['meals/post/fulfilled', 'plan/completeHabit/fulfilled', 'profile/savePhoto/fulfilled']) {
    store.dispatch({ type, payload: { mealName: 'Oats' }, meta: { arg: {} } });
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.equal(calls, 3);
});

test('an open leaderboard reacts to changes and resume without polling, and disconnects when hidden or left', async () => {
  let focus, changed, resume, visible, disconnected = 0, removed = false, requests = 0;
  const document = { hidden: false, addEventListener: (_, fn) => { visible = fn; }, removeEventListener: () => { removed = true; } };
  const appState = { currentState: 'active', addEventListener: (_, fn) => { resume = fn; return { remove: () => { removed = true; } }; } };
  const leaderboard = board(async () => { requests++; return { rows: [] }; });
  const deps = {
    react: { useCallback: (fn) => fn, useRef: (current) => ({ current }), useState: (value) => [value, () => {}] },
    'react-native': { AppState: appState }, '../utils/appAlert': { __esModule: true, default: {} },
    '@react-navigation/native': { useRoute: () => ({ name: 'Leaderboard' }), useFocusEffect: (fn) => { focus = fn; } },
    'react-redux': { useDispatch: () => leaderboard.store.dispatch, useSelector: (fn) => fn(leaderboard.store.getState()) },
    '../services/api/client': { refreshPageResponses: () => {} }, '../store/slices/leaderboardSlice': leaderboard,
    '../services/api/liveUpdates': { subscribeLiveUpdates: (_, callback) => { changed = callback; return () => { disconnected++; }; } },
  };
  for (const name of ['admin', 'dashboard', 'meal', 'plan', 'activity', 'profile', 'notification', 'memberAccess', 'adminMemberJournal']) deps[`../store/slices/${name}Slice`] = {};
  const hook = loadModule('../src/hooks/usePageRefresh.js', deps, { document,
    setInterval: () => { throw new Error('Leaderboard must not poll'); } }).default;
  hook(); const cleanup = focus();
  const flush = () => new Promise((resolve) => setImmediate(resolve));
  await flush(); assert.equal(requests, 1);
  changed(); await flush(); assert.equal(requests, 2);
  document.hidden = true; visible(); changed(); await flush(); assert.equal(requests, 2);
  assert.equal(disconnected, 1);
  document.hidden = false; visible(); await flush(); assert.equal(requests, 3);
  resume('active'); await flush(); assert.equal(requests, 4);
  cleanup(); assert.ok(disconnected >= 2); assert.equal(removed, true);
});

test('both leaderboard views render authenticated member profile photos', () => {
  const member = { memberId: 7, rank: 1, name: 'Member', initials: 'ME', score: 50,
    profileImageUrl: '/api/leaderboard/members/7/photo?v=new' };
  const flatten = (node) => !node || typeof node !== 'object' ? [] : Array.isArray(node)
    ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)];
  for (const admin of [false, true]) {
    const dependencies = {
      react: React, 'react-native': { Pressable: 'Button', View: 'View', StyleSheet: { create: (value) => value } },
      '@expo/vector-icons': { Ionicons: 'Icon' },
      'react-redux': { useDispatch: () => () => {}, useSelector: (fn) => fn({ auth: { token: 'jwt' }, leaderboard: { rows: [member] } }) },
      '../../store/slices/leaderboardSlice': { selectLeaderboardState: (state) => state.leaderboard },
      '../../components/admin/AdminMemberAvatar': { __esModule: true, default: 'Avatar' },
      '../../theme': { colors: {}, fonts: {}, radius: {}, type: {} },
      '../../theme/admin': { adminColors: {}, adminFonts: {} },
    };
    for (const path of ['common/Screen', 'user/UserHeader', 'admin/AdminHeader', 'admin/AdminScreen']) dependencies[`../../components/${path}`] = { __esModule: true, default: 'View' };
    const component = loadModule(`../src/screens/${admin ? 'admin/Admin' : 'user/'}LeaderboardScreen.jsx`, dependencies).default;
    const avatar = flatten(component({ navigation: {} })).find((node) => node.type === 'Avatar');
    assert.equal(avatar.props.profileImageUrl, member.profileImageUrl);
    assert.equal(avatar.props.token, 'jwt');
  }
});
