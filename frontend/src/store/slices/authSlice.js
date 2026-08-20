import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { login as loginApi, register as registerApi } from '../../services/api/authApi';

const initialState = { user: null, token: null, hasOnboarded: false, status: 'idle', error: null, source: null };

const DEMO_EMAILS = new Set(['user@wellnest.app', 'admin@wellnest.app']);

const isDemoAccount = ({ email, password }) => (
  process.env.EXPO_PUBLIC_DISABLE_DEMO_FALLBACK !== 'true'
  && DEMO_EMAILS.has(email?.trim().toLowerCase())
  && password === 'password'
);

const demoLogin = ({ email }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const isAdmin = normalizedEmail === 'admin@wellnest.app';

  return {
    token: 'demo-token',
    id: isAdmin ? 2 : 1,
    name: isAdmin ? 'Arpan' : 'Aarav',
    email: normalizedEmail,
    role: isAdmin ? 'ADMIN' : 'USER',
    ...(isAdmin && {
      phone: '+91 98765 43210',
      clubName: 'Wellnest Collective',
    }),
    source: 'demo',
  };
};

export const signIn = createAsyncThunk('auth/signIn', async (credentials) => {
  if (isDemoAccount(credentials)) return demoLogin(credentials);

  try {
    const response = await loginApi(credentials);
    return { ...response, source: 'api' };
  } catch (error) {
    if (process.env.EXPO_PUBLIC_DISABLE_DEMO_FALLBACK === 'true') throw error;
    return demoLogin(credentials);
  }
});

export const register = createAsyncThunk('auth/register', async (profile) => {
  try {
    const response = await registerApi({ name: profile.name, email: profile.email, password: profile.password });
    return { ...response, source: 'api' };
  } catch (error) {
    if (process.env.EXPO_PUBLIC_DISABLE_DEMO_FALLBACK === 'true') throw error;
    return { token: 'demo-token', id: 1, name: profile.name, email: profile.email, role: 'USER', source: 'demo' };
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    finishOnboarding: (state) => { state.hasOnboarded = true; },
    signOut: (state) => { state.user = null; state.token = null; state.status = 'idle'; state.error = null; state.source = null; },
    updateProfile: (state, action) => {
      if (state.user) state.user = { ...state.user, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher((action) => action.type === signIn.pending.type || action.type === register.pending.type, (state) => { state.status = 'loading'; state.error = null; })
      .addMatcher((action) => action.type === signIn.fulfilled.type || action.type === register.fulfilled.type, (state, action) => {
        const { token, source, ...user } = action.payload;
        const isAdmin = user.role === 'ADMIN' || user.email?.toLowerCase() === 'admin@wellnest.app';
        state.user = isAdmin ? {
          ...user,
          name: 'Arpan',
          phone: user.phone || '+91 98765 43210',
          clubName: user.clubName || 'Wellnest Collective',
        } : user;
        state.token = token;
        state.source = source;
        state.status = 'authenticated';
      })
      .addMatcher((action) => action.type === signIn.rejected.type || action.type === register.rejected.type, (state, action) => { state.status = 'error'; state.error = action.error.message || 'Authentication failed'; });
  },
});

export const { finishOnboarding, signOut, updateProfile } = authSlice.actions;
export default authSlice.reducer;
