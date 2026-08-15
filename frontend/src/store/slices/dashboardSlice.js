import { createSlice } from '@reduxjs/toolkit';

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: { completion: 72, waterGlasses: 5, waterTarget: 8, streak: 8, calories: 1240, activeMinutes: 34 },
  reducers: {
    drinkWater: (state) => { state.waterGlasses = Math.min(state.waterGlasses + 1, state.waterTarget); },
  },
});
export const { drinkWater } = dashboardSlice.actions;
export default dashboardSlice.reducer;

