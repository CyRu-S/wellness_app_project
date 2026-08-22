import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getProfile, updateBodyMetrics as updateBodyMetricsApi } from '../../services/api/profileApi';

export const BODY_UPDATE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

export const loadProfile = createAsyncThunk('profile/load', async (token) => {
  try {
    return await getProfile(token);
  } catch (error) {
    if (process.env.EXPO_PUBLIC_DISABLE_DEMO_FALLBACK === 'true') throw error;
    return null;
  }
});

export const saveBodyMetrics = createAsyncThunk('profile/saveBodyMetrics', async ({ token, metrics }) => {
  try {
    return await updateBodyMetricsApi(token, metrics);
  } catch (error) {
    if (error.status || process.env.EXPO_PUBLIC_DISABLE_DEMO_FALLBACK === 'true') throw error;
    return { ...metrics, lastBodyMetricsUpdatedAt: new Date().toISOString(), source: 'demo' };
  }
});

const profileSlice = createSlice({
  name: 'profile',
  initialState: {
    bodyMetrics: { heightCm: 174, weightKg: 72.4, waistCm: 84, bodyFatPercent: 19.2 },
    lastBodyMetricsUpdatedAt: null,
    status: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadProfile.pending, (state) => { state.status = 'loading'; state.error = null; })
      .addCase(loadProfile.fulfilled, (state, action) => {
        state.status = 'idle';
        if (!action.payload) return;
        const { heightCm, weightKg, waistCm, bodyFatPercent, lastBodyMetricsUpdatedAt } = action.payload;
        state.bodyMetrics = {
          heightCm: heightCm ?? state.bodyMetrics.heightCm,
          weightKg: weightKg ?? state.bodyMetrics.weightKg,
          waistCm: waistCm ?? state.bodyMetrics.waistCm,
          bodyFatPercent: bodyFatPercent ?? state.bodyMetrics.bodyFatPercent,
        };
        state.lastBodyMetricsUpdatedAt = lastBodyMetricsUpdatedAt || null;
      })
      .addCase(loadProfile.rejected, (state, action) => { state.status = 'error'; state.error = action.error.message || 'Could not load body details'; })
      .addCase(saveBodyMetrics.pending, (state) => { state.status = 'saving'; state.error = null; })
      .addCase(saveBodyMetrics.fulfilled, (state, action) => {
        const { heightCm, weightKg, waistCm, bodyFatPercent, lastBodyMetricsUpdatedAt } = action.payload;
        state.bodyMetrics = { heightCm, weightKg, waistCm, bodyFatPercent };
        state.lastBodyMetricsUpdatedAt = lastBodyMetricsUpdatedAt;
        state.status = 'saved';
      })
      .addCase(saveBodyMetrics.rejected, (state, action) => { state.status = 'error'; state.error = action.error.message || 'Could not update body details'; });
  },
});

export default profileSlice.reducer;
