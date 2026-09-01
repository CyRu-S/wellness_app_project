import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { googleLogin, login as loginApi, register as registerApi } from '../../services/api/authApi';
import { uploadProfilePhoto } from '../../services/api/profileApi';
import { getDemoProfilePhoto, setDemoProfilePhoto } from '../../services/storage/profilePhotoStorage';

const initialState = { user: null, token: null, hasOnboarded: false, status: 'idle', error: null, source: null };

const DEMO_EMAILS = new Set(['user@mr-care.app', 'admin@mr-care.app']);
const useApiDemoAccounts = process.env.EXPO_PUBLIC_USE_API_DEMO_ACCOUNTS === 'true';
const demoModeEnabled = !useApiDemoAccounts && process.env.EXPO_PUBLIC_DISABLE_DEMO_FALLBACK !== 'true';

const isDemoAccount = ({ email, password }) => (
  demoModeEnabled
  && DEMO_EMAILS.has(email?.trim().toLowerCase())
  && password === 'password'
);

const demoLogin = ({ email }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const isAdmin = normalizedEmail === 'admin@mr-care.app';

  return {
    token: 'demo-token',
    id: isAdmin ? 2 : 1,
    name: isAdmin ? 'Arpan' : 'Aarav',
    email: normalizedEmail,
    role: isAdmin ? 'ADMIN' : 'USER',
    ...(isAdmin && {
      phone: '+91 98765 43210',
      clubName: 'Mr_Care Collective',
    }),
    source: 'demo',
  };
};

export const signIn = createAsyncThunk('auth/signIn', async (credentials) => {
  if (isDemoAccount(credentials)) {
    const account = demoLogin(credentials);
    return { ...account, profileImageUrl: await getDemoProfilePhoto(account) };
  }
  const response = await loginApi(credentials);
  return { ...response, source: 'api' };
});

export const register = createAsyncThunk('auth/register', async (profile) => {
  let response;
  try {
    response = await registerApi({ name: profile.name, email: profile.email, password: profile.password });
  } catch (error) {
    if (!demoModeEnabled) throw error;
    const demoAccount = { token: 'demo-token', id: 1, name: profile.name, email: profile.email, role: 'USER', source: 'demo' };
    if (!profile.photo?.persistentUri) return demoAccount;
    const profileImageUrl = await setDemoProfilePhoto(demoAccount, profile.photo.persistentUri);
    return { ...demoAccount, profileImageUrl };
  }
  if (!profile.photo?.uri) return { ...response, source: 'api' };
  try {
    const updated = await uploadProfilePhoto(response.token, profile.photo);
    return { ...response, profileImageUrl: updated.profileImageUrl, source: 'api' };
  } catch {
    return { ...response, source: 'api' };
  }
});

export const signInWithGoogle = createAsyncThunk('auth/signInWithGoogle', async ({ idToken }) => {
  const response = await googleLogin(idToken);
  return { ...response, source: 'google' };
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    finishOnboarding: (state) => { state.hasOnboarded = true; },
    setAuthError: (state, action) => { state.error = action.payload; state.status = action.payload ? 'error' : 'idle'; },
    signOut: (state) => { state.user = null; state.token = null; state.status = 'idle'; state.error = null; state.source = null; },
    updateProfile: (state, action) => {
      if (state.user) state.user = { ...state.user, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher((action) => [signIn.pending.type, register.pending.type, signInWithGoogle.pending.type].includes(action.type), (state) => { state.status = 'loading'; state.error = null; })
      .addMatcher((action) => [signIn.fulfilled.type, register.fulfilled.type, signInWithGoogle.fulfilled.type].includes(action.type), (state, action) => {
        const { token, source, ...user } = action.payload;
        const isAdmin = user.role === 'ADMIN' || user.email?.toLowerCase() === 'admin@mr-care.app';
        state.user = isAdmin ? {
          ...user,
          name: 'Arpan',
          phone: user.phone || '+91 98765 43210',
          clubName: user.clubName || 'Mr_Care Collective',
        } : user;
        state.token = token;
        state.source = source;
        state.status = 'authenticated';
      })
      .addMatcher((action) => [signIn.rejected.type, register.rejected.type, signInWithGoogle.rejected.type].includes(action.type), (state, action) => { state.status = 'error'; state.error = action.error.message || 'Authentication failed'; });
  },
});

export const { finishOnboarding, setAuthError, signOut, updateProfile } = authSlice.actions;
export default authSlice.reducer;
