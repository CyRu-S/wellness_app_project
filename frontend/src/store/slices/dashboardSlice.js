import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getDemoWaterGoal } from '../../data/demoWaterGoals';
import { getDashboard } from '../../services/api/dashboardApi';

export const refreshDashboard = createAsyncThunk('dashboard/refresh', async (_, { getState }) => {
  const auth = getState().auth || {};
  if (auth.source === 'demo' || auth.token === 'demo-token') {
    const waterGoalMl = await getDemoWaterGoal(auth.user?.id || 1);
    return { waterGoalMl, waterTarget: waterGoalMl / 250 };
  }
  if (!auth.token) return null;
  return getDashboard(auth.token);
});

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: { completion: 72, waterGlasses: 5, waterTarget: 8, waterGoalMl: 2000, streak: 8, calories: 1240, protein: 61, activeMinutes: 34, activeCalories: 148, lastMeal: null, lastActivity: null, status: 'idle' },
  reducers: {
    drinkWater: (state) => { state.waterGlasses = Math.min(state.waterGlasses + 1, state.waterTarget); },
    logMealNutrition: (state, action) => {
      state.calories += action.payload.calories || 0;
      state.protein += action.payload.protein || 0;
      state.lastMeal = { name: action.payload.name, calories: action.payload.calories, loggedAt: action.payload.loggedAt };
      state.completion = Math.min(100, state.completion + 4);
    },
    recordActivity: (state, action) => {
      state.activeMinutes += action.payload.minutes;
      state.activeCalories += action.payload.calories;
      state.lastActivity = action.payload;
      state.completion = Math.min(100, state.completion + 5);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(refreshDashboard.pending, (state) => { state.status = 'loading'; })
      .addCase(refreshDashboard.fulfilled, (state, action) => {
        state.status = 'idle';
        if (!action.payload) return;
        Object.entries(action.payload).forEach(([key, value]) => {
          if (value != null && Object.prototype.hasOwnProperty.call(state, key)) state[key] = value;
        });
      })
      .addCase(refreshDashboard.rejected, (state) => { state.status = 'error'; });
  },
});
export const { drinkWater, logMealNutrition, recordActivity } = dashboardSlice.actions;
export default dashboardSlice.reducer;
