import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './loadModule.js';

const cache = { cacheVersion: () => 0, invalidateCachedResponses: async () => {},
  readCachedResponse: async () => ({ hit: false }), saveCachedResponse: async () => {} };

function native(env, expoConfig) {
  return loadModule('../src/services/api/client.js', {
    'react-native': { Platform: { OS: 'android' } }, 'expo-constants': { expoConfig }, './responseCache': cache,
  }, { process: { env } });
}

test('preview APK uses its bundled HTTPS URL when no Metro host is present', () => {
  const client = native({}, { extra: { apiUrl: 'https://api.example.test/api/' } });
  assert.equal(client.API_URL, 'https://api.example.test/api');
});

test('an explicit mobile API URL takes priority and never appends duplicate slashes', () => {
  const client = native({ EXPO_PUBLIC_MOBILE_API_URL: 'https://mobile.example.test/api/' }, {
    hostUri: '192.168.1.4:8081', extra: { apiUrl: 'http://localhost:8080/api' },
  });
  assert.equal(client.API_URL, 'https://mobile.example.test/api');
});

test('Expo Go retains LAN discovery when the shared local variable points to localhost', () => {
  const client = native({ EXPO_PUBLIC_API_URL: 'http://localhost:8080/api' }, {
    hostUri: '192.168.1.4:8081', extra: { apiUrl: 'http://localhost:8080/api' },
  });
  assert.equal(client.API_URL, 'http://192.168.1.4:8080/api');
});

test('an explicit shared HTTPS backend takes priority over Metro LAN discovery', () => {
  const client = native({ EXPO_PUBLIC_API_URL: 'https://api.example.test/api' }, { hostUri: '192.168.1.4:8081' });
  assert.equal(client.API_URL, 'https://api.example.test/api');
});

test('a timed-out read ends after one attempt instead of doubling the timeout', async () => {
  let calls = 0;
  const client = loadModule('../src/services/api/client.js', {
    'react-native': { Platform: { OS: 'android' } }, 'expo-constants': { expoConfig: null }, './responseCache': cache,
  }, { fetch: async (_, { signal }) => {
    calls++;
    return new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('Aborted'))));
  } });
  await assert.rejects(client.request('/admin/members', { timeoutMs: 10 }), /Request timed out/);
  assert.equal(calls, 1);
});
