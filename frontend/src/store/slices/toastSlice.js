import { createSlice, nanoid } from '@reduxjs/toolkit';

const slice = createSlice({
  name: 'toast',
  initialState: { current: null },
  reducers: {
    showToast: {
      reducer: (state, action) => { state.current = action.payload; },
      prepare: (toast) => ({ payload: { id: nanoid(), kind: 'success', ...toast } }),
    },
    clearToast: (state, action) => {
      if (!action.payload || state.current?.id === action.payload) state.current = null;
    },
  },
});

export const { showToast, clearToast } = slice.actions;
export default slice.reducer;
