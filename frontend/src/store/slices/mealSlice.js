import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getMeals } from '../../services/api/mealApi';
import { getPlan } from '../../services/api/planApi';
import { request } from '../../services/api/client';
import { formatJournalClock } from '../../utils/memberJournal';
import { createMealPost } from '../../services/api/mealPostApi';

export const normalizeMeal = (meal) => {
  const parts = String(meal.time || '00:00').split(':').map(Number);
  return { ...meal, time: formatJournalClock(meal.time), hour: parts[0] + parts[1] / 60, protein: meal.proteinGrams ?? meal.protein ?? 0 };
};
export const loadMeals = createAsyncThunk('meals/load', async (_, { getState }) => {
  const token = getState().auth.token;
  const [items, plan, posts] = await Promise.all([
    getMeals(token), getPlan(token), request('/meal-posts', { headers: { Authorization: `Bearer ${token}` } }),
  ]);
  return {
    planName: plan?.title || '', consultant: plan ? 'Coach Arpan' : '',
    items: items.map((meal) => {
      const post = posts.find((p) => p.plannedMealId === meal.id);
      return { ...normalizeMeal(meal), uploadedAt: post ? formatJournalClock(post.postedAt) : null,
        imageUri: post?.imageUrl || null, detectedName: post?.mealName, detectedCalories: post?.calories, detectedProtein: post?.proteinGrams };
    }),
    postHistory: posts.map((p) => ({ ...p, targetMealId: p.plannedMealId, type: p.mealType, name: p.mealName, imageUri: p.imageUrl, loggedAt: formatJournalClock(p.postedAt), protein: p.proteinGrams })),
  };
}, { condition: (_, { getState }) => !getState().meals.pendingPost && !getState().meals.readId });

export const postMeal = createAsyncThunk('meals/post', async ({ optimisticCompletion, ...post }, { getState }) => {
  return createMealPost(getState().auth.token, post);
}, { condition: (_, { getState }) => !getState().meals.pendingPost });

const displayPost = (post) => ({ ...post, targetMealId: post.plannedMealId, type: post.mealType, name: post.mealName,
  imageUri: post.imageUrl || post.imageUri, loggedAt: formatJournalClock(post.postedAt), protein: post.proteinGrams });
const slice = createSlice({
  name: 'meals',
  initialState: { planName: '', consultant: '', items: [], uploads: [], postHistory: [], status: 'idle', error: null, readId: null, pendingPost: null, failedPost: null, postError: null },
  reducers: { prunePostHistory: (state, action) => { state.postHistory = state.postHistory.filter((p) => new Date(p.postedAt) >= new Date(action.payload)); } },
  extraReducers: (builder) => builder
    .addCase(loadMeals.pending, (state, action) => { state.status = 'loading'; state.readId = action.meta.requestId; })
    .addCase(loadMeals.fulfilled, (state, action) => {
      if (state.readId !== action.meta.requestId) return;
      Object.assign(state, action.payload, { uploads: action.payload.postHistory, status: 'succeeded', error: null, readId: null });
      if (state.failedPost && action.payload.postHistory.some((post) => post.clientRequestId === state.failedPost.clientRequestId)) {
        state.failedPost = null; state.postError = null;
      }
    })
    .addCase(loadMeals.rejected, (state, action) => { if (state.readId === action.meta.requestId) { state.readId = null; state.status = 'failed'; state.error = action.error.message; } })
    .addCase(postMeal.pending, (state, action) => {
      state.readId = null; state.postError = null; state.failedPost = null;
      const post = action.meta.arg;
      const meal = state.items.find((item) => item.id === post.plannedMealId);
      state.pendingPost = { id: action.meta.requestId, previous: meal ? { ...meal } : null };
      const preview = displayPost({ ...post, id: action.meta.requestId, postedAt: new Date().toISOString(), pending: true });
      state.postHistory.unshift(preview); state.uploads = state.postHistory;
      if (meal) Object.assign(meal, { consumed: true, uploadedAt: preview.loggedAt, imageUri: post.imageUri,
        detectedName: post.mealName, detectedCalories: post.calories, detectedProtein: post.proteinGrams });
    })
    .addCase(postMeal.fulfilled, (state, action) => {
      const post = displayPost(action.payload);
      state.postHistory = state.postHistory.map((item) => item.id === action.meta.requestId ? post : item);
      state.uploads = state.postHistory; state.pendingPost = null;
      const meal = state.items.find((item) => item.id === post.plannedMealId);
      if (meal) meal.imageUri = post.imageUri;
    })
    .addCase(postMeal.rejected, (state, action) => {
      const previous = state.pendingPost?.previous;
      if (previous) state.items = state.items.map((item) => item.id === previous.id ? previous : item);
      state.postHistory = state.postHistory.filter((item) => item.id !== action.meta.requestId);
      state.uploads = state.postHistory; state.pendingPost = null; state.failedPost = action.meta.arg; state.postError = action.error.message;
    }),
});
export const { prunePostHistory } = slice.actions;
export default slice.reducer;
