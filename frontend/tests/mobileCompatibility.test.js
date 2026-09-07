import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { loadModule, deferred } from './loadModule.js';

test('no frontend file uses the removed native absolute-fill export', () => {
  const root = new URL('../src/', import.meta.url);
  for (const path of readdirSync(root, { recursive: true }).filter((file) => /\.[jt]sx?$/.test(file))) {
    assert.doesNotMatch(readFileSync(new URL(path.replaceAll('\\', '/'), root), 'utf8'), /StyleSheet\.absoluteFillObject/, path);
  }
});

test('navbar pill and hydration fill retain all native absolute layout edges', () => {
  let styles;
  const absoluteFill = { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 };
  const native = { StyleSheet: { absoluteFill, create: (value) => { styles = value; return value; } }, Platform: { OS: 'android', select: (value) => value.default } };
  loadModule('../src/components/common/FluidTabBar.jsx', {
    react: {}, 'react-native': native, '@expo/vector-icons': {}, 'react-native-safe-area-context': {}, '../../hooks/useReducedMotion': {},
  });
  for (const [key, value] of Object.entries(absoluteFill)) assert.equal(styles.activeSurface[key], value, `pill ${key}`);
  loadModule('../src/components/dashboard/HydrationMeter.jsx', {
    react: {}, 'react-native': native, '@expo/vector-icons': {}, 'expo-haptics': {},
    '../../theme': { colors: {}, fonts: {}, radius: {}, type: { label: {} } },
  });
  for (const [key, value] of Object.entries(absoluteFill)) assert.equal(styles.fill[key], value, `water ${key}`);
});

test('photo sources preserve native content URIs and version keys, and do not leak tokens externally', () => {
  const { profileImageSource } = loadModule('../src/utils/profilePhoto.js', {
    'expo-image-picker': {}, 'react-native': { Platform: { OS: 'android' } }, '../services/api/client': { API_URL: 'http://local:8080/api' },
    './preparePhotoUpload': {},
  });
  assert.equal(profileImageSource('content://media/1', 'secret').uri, 'content://media/1');
  assert.equal(profileImageSource('content://media/1', 'secret').headers, undefined);
  const remote = profileImageSource('/api/profile/photo?v=server-key', 'secret', 123);
  assert.equal(remote.uri, 'http://local:8080/api/profile/photo?v=server-key&photoVersion=123');
  assert.equal(remote.headers.Authorization, 'Bearer secret');
  assert.equal(profileImageSource('https://elsewhere.test/photo', 'secret').headers, undefined);
});

test('duplicate GETs share one fetch but never share across accounts or writes', async () => {
  const pending = deferred();
  let calls = 0;
  const { request } = loadModule('../src/services/api/client.js', { 'react-native': { Platform: { OS: 'android' } } }, {
    fetch: () => { calls++; return pending.promise; },
  });
  const options = { headers: { Authorization: 'Bearer one' } };
  const first = request('/profile', options);
  assert.equal(request('/profile', options), first);
  const otherAccount = request('/profile', { headers: { Authorization: 'Bearer two' } });
  const write = request('/water', { method: 'POST' });
  const afterWrite = request('/profile', options);
  assert.equal(calls, 4);
  pending.resolve({ ok: true, status: 200, text: async () => '{}' });
  await Promise.all([first, otherAccount, write, afterWrite]);
  await request('/profile', options);
  assert.equal(calls, 5, 'settled GET responses must not be cached');
});
