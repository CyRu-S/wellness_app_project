import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { loadModule, deferred } from './loadModule.js';

const cacheStub = () => {
  const values = new Map();
  let version = 0;
  const key = (path, authorization) => `${authorization}:${path}`;
  return {
    cacheVersion: () => version,
    invalidateCachedResponses: async () => { version++; values.clear(); },
    readCachedResponse: async (path, authorization) => values.has(key(path, authorization))
      ? { hit: true, value: values.get(key(path, authorization)) } : { hit: false },
    saveCachedResponse: async (path, authorization, value, started) => {
      if (version === started && authorization) values.set(key(path, authorization), value);
    },
  };
};

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

test('native protected images download with authorization before rendering', async () => {
  let downloaded;
  let resolved;
  const react = {
    __esModule: true,
    default: { createElement: (type, props) => ({ type, props }) },
    useState: () => [null, (value) => { resolved = value; }],
    useRef: (value) => ({ current: value }),
    useEffect: (effect) => effect(),
  };
  const { default: ProtectedImage } = loadModule('../src/components/common/ProtectedImage.jsx', {
    react,
    'react-native': { Image: 'Image', Platform: { OS: 'android' } },
    '../../services/storage/protectedImageCache': { cachedProtectedImage: async (uri, authorization) => {
      downloaded = { uri, authorization };
      return { uri: 'file:///private-photo.img' };
    } },
  });
  const source = { uri: 'http://192.168.1.20:8080/api/meal-posts/7/image', headers: { Authorization: 'Bearer secret' } };
  const firstRender = ProtectedImage({ source });
  assert.equal(firstRender.props.source, null, 'native image waits for its authenticated local copy');
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(downloaded.uri, source.uri);
  assert.equal(downloaded.authorization, 'Bearer secret');
  assert.equal(resolved.image.uri, 'file:///private-photo.img');
});

test('web can use localhost while mobile follows the current Expo LAN host', () => {
  const environment = { env: {
    EXPO_PUBLIC_API_URL: 'http://fallback:8080/api',
    EXPO_PUBLIC_WEB_API_URL: 'http://localhost:8080/api',
  } };
  const expoConstants = { __esModule: true, default: { expoConfig: { hostUri: '10.123.7.238:8082' } } };
  const web = loadModule('../src/services/api/client.js', {
    'react-native': { Platform: { OS: 'web' } }, 'expo-constants': expoConstants,
    './responseCache': cacheStub(),
  }, { process: environment });
  const mobile = loadModule('../src/services/api/client.js', {
    'react-native': { Platform: { OS: 'android' } }, 'expo-constants': expoConstants,
    './responseCache': cacheStub(),
  }, { process: environment });
  assert.equal(web.API_URL, 'http://localhost:8080/api');
  assert.equal(mobile.API_URL, 'http://10.123.7.238:8080/api');
});

test('an explicit mobile API URL remains available for production builds', () => {
  const environment = { env: { EXPO_PUBLIC_MOBILE_API_URL: 'https://api.example.test/api' } };
  const mobile = loadModule('../src/services/api/client.js', {
    'react-native': { Platform: { OS: 'android' } },
    'expo-constants': { __esModule: true, default: { expoConfig: { hostUri: '10.0.0.5:8081' } } },
    './responseCache': cacheStub(),
  }, { process: environment });
  assert.equal(mobile.API_URL, 'https://api.example.test/api');
});

test('duplicate GETs share one fetch, persist settled data, and never share across accounts or writes', async () => {
  const pending = deferred();
  let calls = 0;
  const { request } = loadModule('../src/services/api/client.js', {
    'react-native': { Platform: { OS: 'android' } },
    'expo-constants': { __esModule: true, default: { expoConfig: null } },
    './responseCache': cacheStub(),
  }, {
    fetch: () => { calls++; return pending.promise; },
  });
  const options = { headers: { Authorization: 'Bearer one' } };
  const first = request('/profile', options);
  assert.equal(request('/profile', options), first);
  const otherAccount = request('/profile', { headers: { Authorization: 'Bearer two' } });
  const write = request('/water', { method: 'POST' });
  const afterWrite = request('/profile', options);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(calls, 4);
  pending.resolve({ ok: true, status: 200, text: async () => '{}' });
  await Promise.all([first, otherAccount, write, afterWrite]);
  await request('/profile', options);
  assert.equal(calls, 5, 'reads racing a write cannot populate the cache');
  await request('/profile', options);
  assert.equal(calls, 5, 'settled GET responses are served from the account cache');
  await request('/profile', { ...options, cachePolicy: 'network-only' });
  assert.equal(calls, 6, 'session validation bypasses the cache');
});
