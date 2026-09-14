import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { loadModule } from './loadModule.js';

test('settled account data survives a cold start without sharing it with another account', async () => {
  const disk = new Map();
  const crypto = { CryptoDigestAlgorithm: { SHA256: 'SHA256' }, digestStringAsync: async (_, value) => createHash('sha256').update(value).digest('hex') };
  const modules = () => loadModule('../src/services/storage/persistedState.js', {
    'expo-crypto': crypto,
    './encryptedStorage': {
      readEncryptedJson: async (key) => disk.get(key) || null,
      writeEncryptedJson: async (key, value) => { disk.set(key, value); },
    },
  });
  const state = {
    auth: { token: 'private-jwt', user: { id: 7 } },
    dashboard: { completion: 50, waterGlasses: 2, optimistic: {} },
    meals: { items: [{ id: 1, name: 'Lunch' }], uploads: [], postHistory: [] },
    activity: { sessions: [], history: [] }, plan: { tasks: [] },
    notifications: { items: [] },
    admin: { members: [], approvals: [], writes: {} },
    profile: { name: 'Member Seven', writes: {} },
    memberAccess: { sharedMembers: [] }, adminMemberJournal: { byMemberId: {} },
  };
  const first = modules();
  first.beginPersistedStateWrites();
  first.schedulePersistedState(state);
  await new Promise((resolve) => setTimeout(resolve, 600));
  await first.cancelPersistedState();
  assert.equal(disk.size, 1);
  assert.ok([...disk.keys()].every((key) => !key.includes('private-jwt')));
  const reopened = modules();
  assert.equal((await reopened.readPersistedState('private-jwt', 7)).meals.items[0].name, 'Lunch');
  assert.equal(await reopened.readPersistedState('private-jwt', 8), null);
  assert.equal(await reopened.readPersistedState('other-jwt', 7), null);
});
