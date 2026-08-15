import { createSlice } from '@reduxjs/toolkit';
const activitySlice = createSlice({ name: 'activity', initialState: { weeklyMinutes: 164, sessions: 4 }, reducers: {} });
export default activitySlice.reducer;

