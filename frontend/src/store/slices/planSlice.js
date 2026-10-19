import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getPlan } from '../../services/api/planApi';
import { request } from '../../services/api/client';
export const loadPlan = createAsyncThunk('plan/load', async (_, { getState }) => getPlan(getState().auth.token));
export const completeHealthyHabit = createAsyncThunk('plan/completeHabit', async (itemId, { getState }) =>
  request(`/plans/items/${itemId}/complete`, { method: 'POST', headers: { Authorization: `Bearer ${getState().auth.token}` } }));
const initialState = { title: '', daysRemaining: 0, tasks: [], error: null, completingId: null };
const applyPlan = (state, plan) => {
  state.title = plan?.title || ''; state.daysRemaining = 0;
  state.tasks = (plan?.items || []).map((item) => ({ ...item, done: item.completed }));
  state.error = null;
};
const slice = createSlice({
  name: 'plan', initialState, reducers: {},
  extraReducers: (builder) => builder
    .addCase(loadPlan.fulfilled, (state, action) => {
      const plan = action.payload;
      applyPlan(state, plan);
    })
    .addCase(loadPlan.rejected, (state, action) => { state.error = action.error.message; })
    .addCase(completeHealthyHabit.pending, (state, action) => { state.completingId = action.meta.arg; state.error = null; })
    .addCase(completeHealthyHabit.fulfilled, (state, action) => { state.completingId = null; applyPlan(state, action.payload); })
    .addCase(completeHealthyHabit.rejected, (state, action) => { state.completingId = null; state.error = action.error.message; }),
});
export default slice.reducer;
