import { createSlice } from '@reduxjs/toolkit';

const initialState = { user: null, token: null, hasOnboarded: false };

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    finishOnboarding: (state) => { state.hasOnboarded = true; },
    signIn: (state, action) => {
      const email = action.payload.email.toLowerCase();
      state.user = {
        id: email === 'admin@wellnest.app' ? 2 : 1,
        name: email === 'admin@wellnest.app' ? 'Maya Admin' : 'Aarav',
        email,
        role: email === 'admin@wellnest.app' ? 'ADMIN' : 'USER',
      };
      state.token = 'demo-token';
    },
    register: (state, action) => {
      state.user = { id: 1, name: action.payload.name, email: action.payload.email, role: 'USER' };
      state.token = 'demo-token';
    },
    signOut: (state) => { state.user = null; state.token = null; },
  },
});

export const { finishOnboarding, signIn, register, signOut } = authSlice.actions;
export default authSlice.reducer;

