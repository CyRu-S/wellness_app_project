import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import * as toolkit from '@reduxjs/toolkit';
import { loadModule, deferred } from './loadModule.js';

function setup(request, now = Date.now()) {
  const admin = loadModule('../src/store/slices/adminSlice.js', {
    '@reduxjs/toolkit': toolkit, '../../services/api/client': { request },
    './mealSlice': { normalizeMeal: (meal) => meal },
  });
  const store = toolkit.configureStore({ reducer: { auth: () => ({ token: 'jwt' }), admin: admin.default } });
  const component = loadModule('../src/components/admin/ClubHydrationReminder.jsx', {
    react: { ...React, useCallback: (fn) => fn, useState: () => [now, () => {}] },
    'react-native': { AppState: { currentState: 'active' }, Pressable: 'Button', View: 'View', StyleSheet: { create: (value) => value } },
    '@react-navigation/native': { useFocusEffect: () => {} },
    'react-redux': { useDispatch: () => store.dispatch, useSelector: (fn) => fn(store.getState()) },
    '@expo/vector-icons': { Ionicons: 'Icon' },
    '../../theme/admin': { adminColors: {}, adminFonts: {} },
    '../../store/slices/adminSlice': admin,
  }).default;
  const flatten = (tree) => tree == null || typeof tree === 'boolean' ? [] : Array.isArray(tree)
    ? tree.flatMap(flatten) : typeof tree === 'object' ? [tree, ...flatten(tree.props?.children)] : [tree];
  return { admin, store, view: () => flatten(component()) };
}

test('club hydration reports success inside the button and blocks duplicate sends for 30 minutes', async () => {
  const now = Date.now();
  let calls = 0;
  const pending = deferred();
  const app = setup(async () => { calls++; return pending.promise; }, now);
  const sending = app.store.dispatch(app.admin.nudgeClubHydration());
  assert.ok(app.view().includes('Sending reminder…'));
  assert.equal(app.view().find((node) => node?.type === 'Button').props.disabled, true);
  await app.store.dispatch(app.admin.nudgeClubHydration());
  assert.equal(calls, 1);
  pending.resolve({ notified: 3, availableAt: new Date(now + 1800000).toISOString(), attention: [] });
  await sending.unwrap();
  assert.ok(app.view().includes('Reminder sent · 30:00'));
  await app.store.dispatch(app.admin.nudgeClubHydration());
  assert.equal(calls, 1);
});

test('a timeout is shown inline without claiming success; restoring server cooldown does not claim this send succeeded', async () => {
  const now = Date.now();
  const app = setup(async (_path, options) => {
    if (options.method === 'POST') throw new Error('Request timed out after 20 seconds');
    return { availableAt: new Date(now + 1200000).toISOString() };
  }, now);
  await app.store.dispatch(app.admin.nudgeClubHydration());
  assert.ok(app.view().some((node) => typeof node === 'string' && node.includes('Request timed out')));
  assert.equal(app.view().find((node) => node?.type === 'Button').props.disabled, false);
  await app.store.dispatch(app.admin.loadHydrationStatus()).unwrap();
  assert.ok(app.view().includes('On cooldown · 20:00'));
  assert.equal(app.store.getState().admin.hydrationNudge.notified, 0);
});

test('an older status read cannot erase a successfully saved cooldown', async () => {
  const stale = deferred();
  const availableAt = new Date(Date.now() + 1800000).toISOString();
  const app = setup(async (_path, options) => options.method === 'POST' ? { notified: 1, availableAt } : stale.promise);
  const reading = app.store.dispatch(app.admin.loadHydrationStatus());
  await app.store.dispatch(app.admin.nudgeClubHydration()).unwrap();
  stale.resolve({ availableAt: null }); await reading;
  assert.equal(app.store.getState().admin.hydrationNudge.availableAt, availableAt);
});
