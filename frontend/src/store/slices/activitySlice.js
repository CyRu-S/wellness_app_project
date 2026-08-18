import { createSlice } from '@reduxjs/toolkit';

const activitySlice = createSlice({
  name: 'activity',
  initialState: {
    weeklyMinutes: 164,
    sessions: 4,
    history: [
      { id: 1, activity: 'Morning walk', minutes: 32, calories: 145, when: 'Today · 7:10 AM' },
      { id: 2, activity: 'Evening yoga', minutes: 18, calories: 63, when: 'Yesterday · 6:40 PM' },
    ],
  },
  reducers: {
    completeActivity: (state, action) => {
      state.history.unshift(action.payload);
      state.weeklyMinutes += action.payload.minutes;
      state.sessions += 1;
    },
  },
});
export const { completeActivity } = activitySlice.actions;
export default activitySlice.reducer;
