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

test('native protected images download with authorization before rendering', async () => {
  let downloaded;
  let resolved;
  class MockFile {
    constructor(...parts) { this.uri = `file:///${parts.at(-1)}`; this.exists = false; }
    static downloadFileAsync(uri, destination, options) {
      downloaded = { uri, destination, options };
      return Promise.resolve({ uri: destination.uri, exists: false });
    }
  }
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
    'expo-file-system': { File: MockFile, Paths: { cache: 'cache' } },
  });
  const source = { uri: 'http://192.168.1.20:8080/api/meal-posts/7/image', headers: { Authorization: 'Bearer secret' } };
  const firstRender = ProtectedImage({ source });
  assert.equal(firstRender.props.source, null, 'native image waits for its authenticated local copy');
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(downloaded.uri, source.uri);
  assert.equal(downloaded.options.headers.Authorization, 'Bearer secret');
  assert.equal(resolved.image.uri, downloaded.destination.uri);
});

test('web and mobile can use separate reachable API addresses', () => {
  const environment = { env: {
    EXPO_PUBLIC_API_URL: 'http://fallback:8080/api',
    EXPO_PUBLIC_WEB_API_URL: 'http://localhost:8080/api',
    EXPO_PUBLIC_MOBILE_API_URL: 'http://192.168.1.20:8080/api',
  } };
  const web = loadModule('../src/services/api/client.js', { 'react-native': { Platform: { OS: 'web' } } }, { process: environment });
  const mobile = loadModule('../src/services/api/client.js', { 'react-native': { Platform: { OS: 'android' } } }, { process: environment });
  assert.equal(web.API_URL, 'http://localhost:8080/api');
  assert.equal(mobile.API_URL, 'http://192.168.1.20:8080/api');
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
