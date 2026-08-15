import { createSlice } from '@reduxjs/toolkit';

const planSlice = createSlice({
  name: 'plan',
  initialState: {
    title: 'Balanced energy',
    daysRemaining: 18,
    tasks: [
      { id: 1, title: 'Morning hydration', detail: '500 ml before breakfast', done: true },
      { id: 2, title: 'Protein-led breakfast', detail: 'Within 90 minutes of waking', done: true },
      { id: 3, title: 'Midday movement', detail: '20 minute brisk walk', done: false },
      { id: 4, title: 'Evening reset', detail: '5 minute breathing practice', done: false },
    ],
  },
  reducers: { toggleTask: (state, action) => { const task = state.tasks.find((item) => item.id === action.payload); if (task) task.done = !task.done; } },
});
export const { toggleTask } = planSlice.actions;
export default planSlice.reducer;

