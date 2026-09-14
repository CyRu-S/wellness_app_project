import test from 'node:test';
import assert from 'node:assert/strict';
import * as toolkit from '@reduxjs/toolkit';
import { loadModule } from './loadModule.js';

function setup() {
  const values = new Map();
  const session = loadModule('../src/services/storage/sessionStorage.js', {
    'react-native': { Platform: { OS: 'android' } },
    'expo-secure-store': {
      getItemAsync: async (key) => values.get(key) ?? null,
      setItemAsync: async (key, value) => { values.set(key, value); },
      deleteItemAsync: async (key) => { values.delete(key); },
    },
  });
  let profileError = null;
  const auth = loadModule('../src/store/slices/authSlice.js', {
    '@reduxjs/toolkit': toolkit,
    '../../services/api/authApi': { login: async () => ({ token: 'jwt', id: 4, name: 'Member', email: 'member@example.com', role: 'USER', status: 'ACTIVE' }), register: async () => ({}) },
    '../../services/notifications/pushNotifications': { revokePushBeforeLogout: async () => {} },
    '../../services/api/profileApi': { getProfile: async () => {
      if (profileError) throw profileError;
      return { id: 4, name: 'Member', role: 'USER', profileImageUrl: null };
    } },
    '../../services/storage/sessionStorage': session,
    '../../services/api/responseCache': { clearCachedResponses: async () => {} },
    '../../services/storage/protectedImageCache': { clearProtectedImageCache: async () => {} },
  });
  const makeStore = () => toolkit.configureStore({ reducer: { auth: auth.default } });
  return { auth, makeStore, values, setProfileError: (value) => { profileError = value; } };
}

test('manual sign-in is restored from encrypted storage after a cold start', async () => {
  const { auth, makeStore, values } = setup();
  const first = makeStore();
  await first.dispatch(auth.signIn({ email: 'member@example.com', password: 'secret' }));
  assert.equal(first.getState().auth.token, 'jwt');
  assert.equal(values.size, 1);
  const reopened = makeStore();
  await reopened.dispatch(auth.restoreSession());
  assert.equal(reopened.getState().auth.user.id, 4);
  assert.equal(reopened.getState().auth.bootstrapped, true);
});

test('expired server session is deleted and explicit sign-out stays bootstrapped', async () => {
  const { auth, makeStore, values, setProfileError } = setup();
  const first = makeStore();
  await first.dispatch(auth.signIn({ email: 'member@example.com', password: 'secret' }));
  const signedOut = await first.dispatch(auth.signOutSafely());
  assert.equal(signedOut.type, auth.signOutSafely.fulfilled.type);
  assert.equal(values.size, 0);
  assert.equal(first.getState().auth.bootstrapped, true);
  await first.dispatch(auth.signIn({ email: 'member@example.com', password: 'secret' }));
  setProfileError(Object.assign(new Error('Expired'), { status: 401 }));
  const reopened = makeStore();
  await reopened.dispatch(auth.restoreSession());
  assert.equal(reopened.getState().auth.user, null);
  assert.equal(values.size, 0);
});
