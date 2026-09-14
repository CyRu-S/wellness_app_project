import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { login, register as registerApi } from '../../services/api/authApi';
import { revokePushBeforeLogout } from '../../services/notifications/pushNotifications';
import { getProfile } from '../../services/api/profileApi';
import { clearSession, readSession, writeSession } from '../../services/storage/sessionStorage';
import { clearCachedResponses } from '../../services/api/responseCache';

const initialState = { user: null, token: null, hasOnboarded: false, bootstrapped: false, status: 'idle', error: null, source: null };
export const restoreSession = createAsyncThunk('auth/restoreSession', async () => {
  const saved = await readSession();
  if (!saved) return null;
  try {
    const profile = await getProfile(saved.token, 'network-only');
    if (String(profile.id) !== String(saved.user.id) || profile.role !== saved.user.role) {
      await clearSession(); await clearCachedResponses();
      return null;
    }
    return { token: saved.token, user: { ...saved.user, name: profile.name, profileImageUrl: profile.profileImageUrl } };
  } catch (error) {
    if (error.status === 401 || error.status === 403) { await clearSession(); await clearCachedResponses(); return null; }
    // Keep an encrypted, previously active session through a temporary network outage.
    return saved;
  }
});
export const signIn = createAsyncThunk('auth/signIn', async (credentials) => {
  const response = await login(credentials);
  await writeSession(response);
  return { ...response, source: 'api' };
});
export const register = createAsyncThunk('auth/register', async (profile) => ({ ...await registerApi(profile), source: 'api' }));
export const signOutSafely = createAsyncThunk('auth/signOutSafely', async (_, { getState, dispatch }) => {
  await revokePushBeforeLogout(getState().auth.token);
  await clearSession();
  await clearCachedResponses();
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
    .addCase('profile/saveDetails/fulfilled', (state, action) => { if (state.user) state.user.name = action.payload.name; })
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
