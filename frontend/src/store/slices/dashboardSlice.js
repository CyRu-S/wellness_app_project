import { createSlice } from '@reduxjs/toolkit';

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: { completion: 72, waterGlasses: 5, waterTarget: 8, streak: 8, calories: 1240, protein: 61, activeMinutes: 34, activeCalories: 148, lastMeal: null, lastActivity: null },
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
});
export const { drinkWater, logMealNutrition, recordActivity } = dashboardSlice.actions;
export default dashboardSlice.reducer;
