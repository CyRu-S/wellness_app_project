import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getProfile, updateBodyMetrics as updateBodyMetricsApi, updateProfileDetails, uploadProfilePhoto } from '../../services/api/profileApi';
import { setDemoProfilePhoto } from '../../services/storage/profilePhotoStorage';

export const BODY_UPDATE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const initialProfileState = {
  name: '',
  email: '',
  goal: null,
  dietaryPreferences: '',
  profileImageUrl: null,
  profileImageVersion: null,
  bodyMetrics: { heightCm: 174, weightKg: 72.4, waistCm: 84, bodyFatPercent: 19.2 },
  lastBodyMetricsUpdatedAt: null,
  status: 'idle',
  error: null,
};

export const loadProfile = createAsyncThunk('profile/load', async (token, { getState }) => {
  if (getState().auth?.source === 'demo') return null;
  return getProfile(token);
});

export const saveBodyMetrics = createAsyncThunk('profile/saveBodyMetrics', async ({ token, metrics }, { getState }) => {
  if (getState().auth?.source === 'demo') {
    return { ...metrics, lastBodyMetricsUpdatedAt: new Date().toISOString(), source: 'demo' };
  }
  return updateBodyMetricsApi(token, metrics);
});

export const saveProfileDetails = createAsyncThunk('profile/saveDetails', async ({ token, details }, { getState }) => {
  if (getState().auth?.source === 'demo') return { ...getState().profile, ...details, source: 'demo' };
  return updateProfileDetails(token, details);
});

export const saveProfilePhoto = createAsyncThunk('profile/savePhoto', async ({ token, photo }, { getState }) => {
  const auth = getState().auth;
  if (auth?.source === 'demo') {
    const profileImageUrl = await setDemoProfilePhoto(auth.user, photo.persistentUri || photo.uri);
    return { profileImageUrl, profileImageVersion: Date.now(), source: 'demo', userId: auth.user?.id, email: auth.user?.email };
  }
  const response = await uploadProfilePhoto(token, photo);
  return { ...response, profileImageVersion: Date.now(), userId: auth.user?.id, email: auth.user?.email };
});

const profileSlice = createSlice({
  name: 'profile',
  initialState: initialProfileState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase('auth/signOut', () => initialProfileState)
      .addCase(loadProfile.pending, (state) => { state.status = 'loading'; state.error = null; })
      .addCase(loadProfile.fulfilled, (state, action) => {
        state.status = 'idle';
        if (!action.payload) return;
        const { name, email, goal, dietaryPreferences, heightCm, weightKg, waistCm, bodyFatPercent, lastBodyMetricsUpdatedAt, profileImageUrl } = action.payload;
        state.name = name ?? state.name;
        state.email = email ?? state.email;
        state.goal = goal ?? state.goal;
        state.dietaryPreferences = dietaryPreferences ?? '';
        state.bodyMetrics = {
          heightCm: heightCm ?? state.bodyMetrics.heightCm,
          weightKg: weightKg ?? state.bodyMetrics.weightKg,
          waistCm: waistCm ?? state.bodyMetrics.waistCm,
          bodyFatPercent: bodyFatPercent ?? state.bodyMetrics.bodyFatPercent,
        };
        state.lastBodyMetricsUpdatedAt = lastBodyMetricsUpdatedAt || null;
        state.profileImageUrl = profileImageUrl || null;
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
    builder
      .addCase(saveProfileDetails.pending, (state) => { state.status = 'saving'; state.error = null; })
      .addCase(saveProfileDetails.fulfilled, (state, action) => {
        state.name = action.payload.name ?? state.name;
        state.email = action.payload.email ?? state.email;
        state.goal = action.payload.goal ?? state.goal;
        state.dietaryPreferences = action.payload.dietaryPreferences ?? '';
        state.status = 'saved';
      })
      .addCase(saveProfileDetails.rejected, (state, action) => { state.status = 'error'; state.error = action.error.message || 'Could not update profile'; });
    builder
      .addCase(saveProfilePhoto.pending, (state) => { state.status = 'saving'; state.error = null; })
      .addCase(saveProfilePhoto.fulfilled, (state, action) => {
        state.profileImageUrl = action.payload.profileImageUrl;
        state.profileImageVersion = action.payload.profileImageVersion || Date.now();
        state.status = 'saved';
      })
      .addCase(saveProfilePhoto.rejected, (state, action) => { state.status = 'error'; state.error = action.error.message || 'Could not update profile photo'; });
  },
});

export default profileSlice.reducer;
