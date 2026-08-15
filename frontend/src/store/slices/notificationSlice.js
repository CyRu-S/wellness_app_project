import { createSlice } from '@reduxjs/toolkit';
const notificationSlice = createSlice({ name: 'notifications', initialState: { items: [
  { id: 1, title: 'Lunch in 30 minutes', body: 'Your green grain bowl is planned for 1:00 PM.', unread: true },
  { id: 2, title: 'Eight-day streak', body: 'You completed every hydration goal this week.', unread: false },
  { id: 3, title: 'Plan updated', body: 'Coach Mira adjusted your evening activity.', unread: false },
] }, reducers: {} });
export default notificationSlice.reducer;

