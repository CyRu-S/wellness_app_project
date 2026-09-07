import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { googleLogin, login, register as registerApi } from '../../services/api/authApi';
import { revokePushBeforeLogout } from '../../services/notifications/pushNotifications';

const initialState = { user: null, token: null, hasOnboarded: false, status: 'idle', error: null, source: null };
export const signIn = createAsyncThunk('auth/signIn', async (credentials) => ({ ...await login(credentials), source: 'api' }));
export const register = createAsyncThunk('auth/register', async (profile) => ({ ...await registerApi(profile), source: 'api' }));
export const signInWithGoogle = createAsyncThunk('auth/signInWithGoogle', async ({ idToken }) => ({ ...await googleLogin(idToken), source: 'api' }));
export const signOutSafely = createAsyncThunk('auth/signOutSafely', async (_, { getState, dispatch }) => {
  await revokePushBeforeLogout(getState().auth.token);
  dispatch(signOut());
});
const slice = createSlice({
  name: 'auth', initialState,
  reducers: {
    finishOnboarding: (state) => { state.hasOnboarded = true; },
    setAuthError: (state, action) => { state.error = action.payload; state.status = action.payload ? 'error' : 'idle'; },
    signOut: (state) => { Object.assign(state, initialState, { hasOnboarded: state.hasOnboarded }); },
    updateProfile: (state, action) => { if (state.user) Object.assign(state.user, action.payload); },
  },
  extraReducers: (builder) => builder
    .addCase('profile/saveDetails/fulfilled', (state, action) => { if (state.user) state.user.name = action.payload.name; })
    .addCase('profile/savePhoto/fulfilled', (state, action) => { if (state.user) state.user.profileImageUrl = action.payload.profileImageUrl; })
    .addMatcher((a) => [signIn.pending.type, register.pending.type, signInWithGoogle.pending.type].includes(a.type), (state) => { state.status = 'loading'; state.error = null; })
    .addMatcher((a) => [signIn.fulfilled.type, register.fulfilled.type, signInWithGoogle.fulfilled.type].includes(a.type), (state, action) => {
      const { token, source, ...user } = action.payload;
      if (!token || user.status !== 'ACTIVE') {
        state.user = null; state.token = null; state.status = 'pending';
        state.error = 'Registration submitted. Your admin must approve your account before you can sign in.';
        return;
      }
      state.user = user; state.token = token; state.source = source; state.status = 'authenticated';
    })
    .addMatcher((a) => [signIn.rejected.type, register.rejected.type, signInWithGoogle.rejected.type].includes(a.type), (state, action) => {
      state.status = 'error'; state.error = action.error.message || 'Authentication failed';
    }),
});
export const { finishOnboarding, setAuthError, signOut, updateProfile } = slice.actions;
export default slice.reducer;
