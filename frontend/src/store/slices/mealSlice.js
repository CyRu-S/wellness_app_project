import { createSlice } from '@reduxjs/toolkit';

const mealSlice = createSlice({
  name: 'meals',
  initialState: { items: [
    { id: 1, time: '8:00', type: 'Breakfast', name: 'Oats, berries & seed crunch', calories: 410, protein: 24, ingredients: ['Rolled oats', 'Greek yoghurt', 'Seasonal berries', 'Pumpkin seeds'] },
    { id: 2, time: '1:00', type: 'Lunch', name: 'Green grain power bowl', calories: 520, protein: 31, ingredients: ['Brown rice', 'Roasted chickpeas', 'Greens', 'Lemon tahini'] },
    { id: 3, time: '4:30', type: 'Snack', name: 'Apple with almond butter', calories: 190, protein: 6, ingredients: ['Apple', 'Almond butter'] },
    { id: 4, time: '7:30', type: 'Dinner', name: 'Ginger tofu & vegetables', calories: 470, protein: 29, ingredients: ['Tofu', 'Broccoli', 'Carrot', 'Ginger tamari'] },
  ] },
  reducers: {},
});
export default mealSlice.reducer;

