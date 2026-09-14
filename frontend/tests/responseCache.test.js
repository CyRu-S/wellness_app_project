import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { loadModule } from './loadModule.js';

test('API responses survive a cold start, stay account-scoped, expire, and clear on sign-out', async () => {
  const disk = new Map();
  let now = 1000000;
  class Clock extends Date { static now() { return now; } }
  const storage = {
    getItem: async (key) => disk.get(key) ?? null,
    setItem: async (key, value) => { disk.set(key, value); },
    removeItem: async (key) => { disk.delete(key); },
    getAllKeys: async () => [...disk.keys()],
    multiRemove: async (keys) => { keys.forEach((key) => disk.delete(key)); },
  };
  const crypto = { CryptoDigestAlgorithm: { SHA256: 'SHA256' }, digestStringAsync: async (_, value) => createHash('sha256').update(value).digest('hex') };
  const makeCache = () => loadModule('../src/services/api/responseCache.js', {
    '@react-native-async-storage/async-storage': storage,
    'expo-crypto': crypto,
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
  assert.equal((await reopened.readCachedResponse('/dashboard', 'Bearer member-a')).hit, false);
  await reopened.saveCachedResponse('/profile', 'Bearer member-a', { name: 'Member A' }, reopened.cacheVersion());
  await reopened.clearCachedResponses();
  assert.equal(disk.size, 0);
  assert.equal((await reopened.readCachedResponse('/profile', 'Bearer member-a')).hit, false);
});
