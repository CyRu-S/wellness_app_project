import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { loadModule } from './loadModule.js';

test('API responses survive a cold start, stay account-scoped, become stale, and clear on sign-out', async () => {
  const disk = new Map();
  let now = 1000000;
  class Clock extends Date { static now() { return now; } }
  const crypto = { CryptoDigestAlgorithm: { SHA256: 'SHA256' }, digestStringAsync: async (_, value) => createHash('sha256').update(value).digest('hex') };
  const makeCache = () => loadModule('../src/services/api/responseCache.js', {
    'expo-crypto': crypto,
    '../storage/encryptedStorage': {
      readEncryptedJson: async (key) => JSON.parse(disk.get(key) || 'null'),
      writeEncryptedJson: async (key, value) => { disk.set(key, JSON.stringify(value)); },
      removeEncryptedPrefix: async (prefix) => { [...disk.keys()].filter((key) => key.startsWith(prefix)).forEach((key) => disk.delete(key)); },
      clearEncryptedData: async () => { disk.clear(); },
    },
  }, { Date: Clock });

  const first = makeCache();
  const version = first.cacheVersion();
  await first.saveCachedResponse('/dashboard', 'Bearer member-a', { count: 3 }, version);
  assert.equal((await first.readCachedResponse('/dashboard', 'Bearer member-a')).value.count, 3);
  assert.equal((await first.readCachedResponse('/dashboard', 'Bearer member-b')).hit, false);
  assert.ok([...disk.keys()].every((key) => !key.includes('member-a')), 'JWT must never appear in a storage key');

  const reopened = makeCache();
  assert.equal((await reopened.readCachedResponse('/dashboard', 'Bearer member-a')).value.count, 3);
  now += 60001;
  assert.equal((await reopened.readCachedResponse('/dashboard', 'Bearer member-a')).stale, true);
  await reopened.saveCachedResponse('/profile', 'Bearer member-a', { name: 'Member A' }, reopened.cacheVersion());
  await reopened.clearCachedResponses();
  assert.equal(disk.size, 0);
  assert.equal((await reopened.readCachedResponse('/profile', 'Bearer member-a')).hit, false);
});

test('a timed-out GET retains stale read-only data, but a failed write is never retried or reported as saved', async () => {
  let fetches = 0;
  let invalidations = 0;
  const client = loadModule('../src/services/api/client.js', {
    'react-native': { Platform: { OS: 'android' } },
    'expo-constants': { expoConfig: null },
    './responseCache': {
      cacheVersion: () => 0,
      invalidateCachedResponses: async () => { invalidations += 1; },
      readCachedResponse: async () => ({ hit: true, stale: true, value: { meals: ['cached'] } }),
      saveCachedResponse: async () => {},
    },
  }, { fetch: async () => { fetches += 1; throw new TypeError('Network unavailable'); } });
  assert.deepEqual(client.API_URL, 'http://10.0.2.2:8080/api');
  assert.equal((await client.request('/meals', { headers: { Authorization: 'Bearer jwt' } })).meals[0], 'cached');
  assert.equal(fetches, 2);
  await assert.rejects(client.request('/meals', { method: 'POST', headers: { Authorization: 'Bearer jwt' }, body: '{}' }), TypeError);
  assert.equal(fetches, 3, 'writes must not be replayed after an uncertain failure');
  const afterWrite = invalidations;
  await assert.rejects(client.request('/meals/analyze', { method: 'POST', timeoutMs: 60000 }), TypeError);
  assert.equal(fetches, 4);
  assert.equal(invalidations, afterWrite, 'analysis must not discard otherwise valid dashboard data');
});
