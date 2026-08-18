import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { login as loginApi, register as registerApi } from '../../services/api/authApi';

const initialState = { user: null, token: null, hasOnboarded: false, status: 'idle', error: null, source: null };

const demoLogin = ({ email }) => ({
  token: 'demo-token',
  id: email.toLowerCase() === 'admin@wellnest.app' ? 2 : 1,
  name: email.toLowerCase() === 'admin@wellnest.app' ? 'Maya Admin' : 'Aarav',
  email: email.toLowerCase(),
  role: email.toLowerCase() === 'admin@wellnest.app' ? 'ADMIN' : 'USER',
  source: 'demo',
});

export const signIn = createAsyncThunk('auth/signIn', async (credentials) => {
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
  },
  extraReducers: (builder) => {
    builder
      .addMatcher((action) => action.type === signIn.pending.type || action.type === register.pending.type, (state) => { state.status = 'loading'; state.error = null; })
      .addMatcher((action) => action.type === signIn.fulfilled.type || action.type === register.fulfilled.type, (state, action) => {
        const { token, id, name, email, role, source } = action.payload;
        state.user = { id, name, email, role };
        state.token = token;
        state.source = source;
        state.status = 'authenticated';
      })
      .addMatcher((action) => action.type === signIn.rejected.type || action.type === register.rejected.type, (state, action) => { state.status = 'error'; state.error = action.error.message || 'Authentication failed'; });
  },
});

export const { finishOnboarding, signOut } = authSlice.actions;
export default authSlice.reducer;
