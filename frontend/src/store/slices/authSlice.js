import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { login, register as registerApi } from '../../services/api/authApi';
import { revokePushBeforeLogout } from '../../services/notifications/pushNotifications';
import { getProfile } from '../../services/api/profileApi';
import { clearSession, readSession, writeSession } from '../../services/storage/sessionStorage';
import { clearCachedResponses } from '../../services/api/responseCache';
import { clearProtectedImageCache } from '../../services/storage/protectedImageCache';
import { cancelPersistedState } from '../../services/storage/persistedState';

const initialState = { user: null, token: null, hasOnboarded: false, bootstrapped: false, status: 'idle', error: null, source: null };
export const restoreSession = createAsyncThunk('auth/restoreSession', async () => {
  const saved = await readSession();
  return saved;
});
export const validateRestoredSession = createAsyncThunk('auth/validateRestoredSession', async (_, { getState, dispatch }) => {
  const { token, user } = getState().auth;
  if (!token || !user) return null;
  try {
    const profile = await getProfile(token, 'network-only');
    if (String(profile.id) !== String(user.id) || profile.role !== user.role) throw Object.assign(new Error('Session changed'), { status: 401 });
    return { name: profile.name, profileImageUrl: profile.profileImageUrl, phone: profile.phone, clubName: profile.clubName };
  } catch (error) {
    if (error.status === 401 || error.status === 403) await dispatch(expireSession());
    return null;
  }
});
export const expireSession = createAsyncThunk('auth/expireSession', async (_, { dispatch }) => {
  await cancelPersistedState();
  await clearSession(); await clearCachedResponses(); await clearProtectedImageCache();
  dispatch(signOut());
});
export const signIn = createAsyncThunk('auth/signIn', async (credentials) => {
  await clearProtectedImageCache();
  const response = await login(credentials);
  await writeSession(response);
  return { ...response, source: 'api' };
});
export const register = createAsyncThunk('auth/register', async (profile) => ({ ...await registerApi(profile), source: 'api' }));
export const signOutSafely = createAsyncThunk('auth/signOutSafely', async (_, { getState, dispatch }) => {
  await revokePushBeforeLogout(getState().auth.token);
  await cancelPersistedState();
  await clearSession();
  await clearCachedResponses();
  await clearProtectedImageCache();
  dispatch(signOut());
});
const slice = createSlice({
  name: 'auth', initialState,
  reducers: {
    finishOnboarding: (state) => { state.hasOnboarded = true; },
    setAuthError: (state, action) => { state.error = action.payload; state.status = action.payload ? 'error' : 'idle'; },
    signOut: (state) => { Object.assign(state, initialState, { hasOnboarded: state.hasOnboarded, bootstrapped: true }); },
    updateProfile: (state, action) => { if (state.user) Object.assign(state.user, action.payload); },
  },
  extraReducers: (builder) => builder
    .addCase(restoreSession.fulfilled, (state, action) => {
      state.bootstrapped = true;
      if (action.payload) {
        state.token = action.payload.token; state.user = action.payload.user;
        state.source = 'api'; state.status = 'authenticated';
      }
    })
    .addCase(restoreSession.rejected, (state) => { state.bootstrapped = true; })
    .addCase(validateRestoredSession.fulfilled, (state, action) => { if (state.user && action.payload) Object.assign(state.user, action.payload); })
    .addCase('profile/saveDetails/fulfilled', (state, action) => { if (state.user) Object.assign(state.user, { name: action.payload.name, phone: action.payload.phone, clubName: action.payload.clubName }); })
    .addCase('profile/savePhoto/fulfilled', (state, action) => { if (state.user) state.user.profileImageUrl = action.payload.profileImageUrl; })
    .addMatcher((a) => [signIn.pending.type, register.pending.type].includes(a.type), (state) => { state.status = 'loading'; state.error = null; })
    .addMatcher((a) => [signIn.fulfilled.type, register.fulfilled.type].includes(a.type), (state, action) => {
      const { token, source, ...user } = action.payload;
      if (!token || user.status !== 'ACTIVE') {
        state.user = null; state.token = null; state.status = 'pending';
        state.error = 'Check your email for the verification code before admin approval.';
        return;
      }
      state.user = user; state.token = token; state.source = source; state.status = 'authenticated';
    })
    .addMatcher((a) => [signIn.rejected.type, register.rejected.type].includes(a.type), (state, action) => {
      state.status = 'error'; state.error = action.error.message || 'Authentication failed';
    }),
});
export const { finishOnboarding, setAuthError, signOut, updateProfile } = slice.actions;
export default slice.reducer;
