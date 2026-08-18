import { createSlice } from '@reduxjs/toolkit';

const mealSlice = createSlice({
  name: 'meals',
  initialState: {
    planName: 'Balanced energy · Day 12',
    consultant: 'Coach Mira',
    items: [
      { id: 1, hour: 8, time: '8:00 AM', type: 'Breakfast', name: 'Oats, berries & seed crunch', calories: 410, protein: 24, consumed: true, uploadedAt: '8:12 AM', ingredients: ['Rolled oats', 'Greek yoghurt', 'Seasonal berries', 'Pumpkin seeds'] },
      { id: 2, hour: 13, time: '1:00 PM', type: 'Lunch', name: 'Green grain power bowl', calories: 520, protein: 31, consumed: false, uploadedAt: null, ingredients: ['Brown rice', 'Roasted chickpeas', 'Greens', 'Lemon tahini'] },
      { id: 3, hour: 16.5, time: '4:30 PM', type: 'Snack', name: 'Apple with almond butter', calories: 190, protein: 6, consumed: false, uploadedAt: null, ingredients: ['Apple', 'Almond butter'] },
      { id: 4, hour: 19.5, time: '7:30 PM', type: 'Dinner', name: 'Ginger tofu & vegetables', calories: 470, protein: 29, consumed: false, uploadedAt: null, ingredients: ['Tofu', 'Broccoli', 'Carrot', 'Ginger tamari'] },
    ],
    uploads: [],
  },
  reducers: {
    logDetectedMeal: (state, action) => {
      const { targetMealId, analysis, imageUri, loggedAt } = action.payload;
      const target = state.items.find((item) => item.id === targetMealId);
      if (target) {
        target.consumed = true;
        target.uploadedAt = loggedAt;
        target.imageUri = imageUri;
        target.detectedName = analysis.name;
        target.detectedCalories = analysis.calories;
        target.detectedProtein = analysis.protein;
      }
      state.uploads.unshift({ id: action.payload.id, targetMealId, ...analysis, imageUri, loggedAt });
    },
  },
});
export const { logDetectedMeal } = mealSlice.actions;
export default mealSlice.reducer;
