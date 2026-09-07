import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getDashboard } from '../../services/api/dashboardApi';
import { request } from '../../services/api/client';
import { normalizeActivity } from '../../utils/activitySession';

export const refreshDashboard = createAsyncThunk('dashboard/refresh', async (_, { getState }) => getDashboard(getState().auth.token), {
  condition: (_, { getState }) => !Object.keys(getState().dashboard.optimistic).length && !getState().dashboard.refreshRequestId,
});
export const drinkWater = createAsyncThunk('dashboard/drinkWater', async (_, { getState }) => {
  return request('/water', { method: 'POST', headers: { Authorization: `Bearer ${getState().auth.token}` }, body: JSON.stringify({ amountMl: 250 }) });
}, { condition: (_, { getState }) => !getState().dashboard.optimistic.water });

const initialState = { completion: 0, waterGlasses: 0, waterTarget: 8, waterGoalMl: 2000, streak: 0, calories: 0, protein: 0, activeMinutes: 0, activeCalories: 0, lastMeal: null, lastActivity: null, status: 'idle', error: null, waterError: null, optimistic: {}, refreshRequestId: null };

function begin(state, action, kind, values) {
  state.refreshRequestId = null; // Reads started before this write must not undo it.
  state.optimistic[kind] = { id: action.meta.requestId, previous: Object.fromEntries(Object.keys(values).map((key) => [key, state[key]])) };
  Object.assign(state, values);
}
function settle(state, action, kind, failed = false) {
  const operation = state.optimistic[kind];
  if (operation?.id !== action.meta.requestId) return;
  if (failed) Object.assign(state, operation.previous);
  delete state.optimistic[kind];
  state.refreshRequestId = null;
}

const slice = createSlice({
  name: 'dashboard', initialState, reducers: {},
  extraReducers: (builder) => builder
    .addCase(refreshDashboard.pending, (state, action) => { state.refreshRequestId = action.meta.requestId; })
    .addCase(refreshDashboard.fulfilled, (state, action) => {
      if (state.refreshRequestId !== action.meta.requestId || Object.keys(state.optimistic).length) return;
      Object.assign(state, action.payload, { status: 'idle', error: null, refreshRequestId: null });
    })
    .addCase(refreshDashboard.rejected, (state, action) => {
      if (state.refreshRequestId !== action.meta.requestId) return;
      state.refreshRequestId = null; state.error = action.error.message;
    })
    .addCase(drinkWater.pending, (state, action) => {
      begin(state, action, 'water', { waterGlasses: state.waterGlasses + 1 }); state.waterError = null;
    })
    .addCase(drinkWater.fulfilled, (state, action) => { settle(state, action, 'water'); })
    .addCase(drinkWater.rejected, (state, action) => { settle(state, action, 'water', true); state.waterError = action.error.message; })
    .addCase('activity/complete/pending', (state, action) => {
      const session = normalizeActivity(action.meta.arg);
      begin(state, action, 'activity', { activeMinutes: state.activeMinutes + session.minutes, activeCalories: state.activeCalories + session.calories, lastActivity: session });
    })
    .addCase('activity/complete/fulfilled', (state, action) => { settle(state, action, 'activity'); state.lastActivity = action.payload; })
    .addCase('activity/complete/rejected', (state, action) => { settle(state, action, 'activity', true); })
    .addCase('meals/post/pending', (state, action) => {
      const meal = action.meta.arg;
      begin(state, action, 'meal', { calories: state.calories + meal.calories, protein: state.protein + meal.proteinGrams,
        completion: meal.optimisticCompletion, lastMeal: { name: meal.mealName, nutrition: { calories: meal.calories } } });
    })
    .addCase('meals/post/fulfilled', (state, action) => { settle(state, action, 'meal'); })
    .addCase('meals/post/rejected', (state, action) => { settle(state, action, 'meal', true); }),
});
export default slice.reducer;
