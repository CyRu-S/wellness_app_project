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
        name: email === 'admin@wellnest.app' ? 'Arpan' : 'Aarav',
        email,
        role: email === 'admin@wellnest.app' ? 'ADMIN' : 'USER',
        ...(email === 'admin@wellnest.app' && {
          phone: '+91 98765 43210',
          clubName: 'Wellnest Collective',
        }),
      };
      state.token = 'demo-token';
    },
    register: (state, action) => {
      state.user = { id: 1, name: action.payload.name, email: action.payload.email, role: 'USER' };
      state.token = 'demo-token';
    },
    signOut: (state) => { state.user = null; state.token = null; },
    updateProfile: (state, action) => {
      if (state.user) state.user = { ...state.user, ...action.payload };
    },
  },
});

export const { finishOnboarding, signIn, register, signOut, updateProfile } = authSlice.actions;
export default authSlice.reducer;

