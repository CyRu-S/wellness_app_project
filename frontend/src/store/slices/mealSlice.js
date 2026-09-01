import { createSlice } from '@reduxjs/toolkit';

const daysAgo = (days, hour) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 12, 0, 0);
  return date.toISOString();
};

const initialPostHistory = [
  { id: 'post-1', targetMealId: 1, type: 'Breakfast', name: 'Oats, berries & seed crunch', imageUri: null, loggedAt: '8:12 AM', postedAt: daysAgo(1, 8) },
  { id: 'post-2', targetMealId: 4, type: 'Dinner', name: 'Ginger tofu & vegetables', imageUri: null, loggedAt: '7:42 PM', postedAt: daysAgo(4, 19) },
  { id: 'post-3', targetMealId: 2, type: 'Lunch', name: 'Green grain power bowl', imageUri: null, loggedAt: '1:08 PM', postedAt: daysAgo(9, 13) },
];

const mealSlice = createSlice({
  name: 'meals',
  initialState: {
    planName: 'Balanced energy daily plan',
    consultant: 'Coach Arpan',
    items: [
      { id: 1, hour: 8, time: '8:00 AM', type: 'Breakfast', name: 'Oats, berries & seed crunch', calories: 410, protein: 24, consumed: true, uploadedAt: '8:12 AM', ingredients: ['Rolled oats', 'Greek yoghurt', 'Seasonal berries', 'Pumpkin seeds'] },
      { id: 2, hour: 13, time: '1:00 PM', type: 'Lunch', name: 'Green grain power bowl', calories: 520, protein: 31, consumed: false, uploadedAt: null, ingredients: ['Brown rice', 'Roasted chickpeas', 'Greens', 'Lemon tahini'] },
      { id: 3, hour: 16.5, time: '4:30 PM', type: 'Snack', name: 'Apple with almond butter', calories: 190, protein: 6, consumed: false, uploadedAt: null, ingredients: ['Apple', 'Almond butter'] },
      { id: 4, hour: 19.5, time: '7:30 PM', type: 'Dinner', name: 'Ginger tofu & vegetables', calories: 470, protein: 29, consumed: false, uploadedAt: null, ingredients: ['Tofu', 'Broccoli', 'Carrot', 'Ginger tamari'] },
    ],
    uploads: [],
    postHistory: initialPostHistory,
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
      const targetType = target?.type || 'Meal';
      const postedAt = action.payload.postedAt || new Date().toISOString();
      const cutoff = new Date(postedAt).getTime() - 21 * 24 * 60 * 60 * 1000;
      state.postHistory = [
        {
          id: action.payload.id,
          targetMealId,
          type: targetType,
          name: analysis.name,
          imageUri,
          loggedAt,
          postedAt,
          calories: analysis.calories,
          protein: analysis.protein,
        },
        ...state.postHistory,
      ].filter((item) => new Date(item.postedAt).getTime() >= cutoff);
    },
    prunePostHistory: (state, action) => {
      const cutoff = new Date(action.payload).getTime();
      state.postHistory = state.postHistory.filter((item) => new Date(item.postedAt).getTime() >= cutoff);
    },
  },
  extraReducers: (builder) => {
    builder.addCase('admin/updateMemberMealPlan', (state, action) => {
      if (action.payload.memberId !== 1) return;
      state.planName = action.payload.planName;
      state.consultant = 'Coach Arpan';
      state.items = action.payload.items.map((item, index) => {
        const exact = state.items.find((meal) => meal.id === item.id);
        const newlyAdded = typeof item.id === 'string' && item.id.includes('-new-');
        const previous = exact || (!newlyAdded ? state.items.find((meal) => meal.type === item.type) || state.items[index] : undefined);
        return {
          ...previous,
          ...item,
          id: previous?.id || item.id || index + 1,
          consumed: previous?.consumed || false,
          uploadedAt: previous?.uploadedAt || null,
          imageUri: previous?.imageUri || null,
        };
      });
    });
  },
});
export const { logDetectedMeal, prunePostHistory } = mealSlice.actions;
export default mealSlice.reducer;
