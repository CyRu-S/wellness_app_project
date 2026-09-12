import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getPlan } from '../../services/api/planApi';
export const loadPlan = createAsyncThunk('plan/load', async (_, { getState }) => getPlan(getState().auth.token));
const initialState = { title: '', daysRemaining: 0, tasks: [], error: null };
const slice = createSlice({
  name: 'plan', initialState, reducers: {},
  extraReducers: (builder) => builder
    .addCase(loadPlan.fulfilled, (state, action) => {
      const plan = action.payload;
      state.title = plan?.title || ''; state.daysRemaining = 0;
      state.tasks = (plan?.items || []).map((item) => ({ ...item, done: item.completed }));
      state.error = null;
    })
    .addCase(loadPlan.rejected, (state, action) => { state.error = action.error.message; }),
});
export default slice.reducer;
