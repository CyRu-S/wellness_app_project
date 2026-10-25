import { createSlice, nanoid } from '@reduxjs/toolkit';

const slice = createSlice({
  name: 'toast',
  initialState: { current: null, dialog: null },
  reducers: {
    showToast: {
      reducer: (state, action) => { state.current = action.payload; },
      prepare: (toast) => ({ payload: { id: nanoid(), kind: 'success', celebrate: ['meal', 'water', 'activity'].includes(toast.kind), ...toast } }),
    },
    clearToast: (state, action) => {
      if (!action.payload || state.current?.id === action.payload) state.current = null;
    },
    showDialog: {
      reducer: (state, action) => { state.dialog = action.payload; state.current = null; },
      prepare: (dialog) => ({ payload: { ...dialog, id: nanoid(), confirmation: true, celebrate: false } }),
    },
    clearDialog: (state, action) => {
      if (state.dialog?.id === action.payload) state.dialog = null;
    },
  },
});

export const { showToast, clearToast, showDialog, clearDialog } = slice.actions;
export default slice.reducer;
