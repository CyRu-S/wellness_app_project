import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getProfile, updateBodyMetrics as updateBodyMetricsApi, updateProfileDetails, uploadProfilePhoto } from '../../services/api/profileApi';

export const BODY_UPDATE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const initialProfileState = {
  name: '', email: '', goal: null, dietaryPreferences: '', profileImageUrl: null, profileImageVersion: null,
  bodyMetrics: { heightCm: null, weightKg: null, age: null, bodyFatPercent: null },
  lastBodyMetricsUpdatedAt: null, status: 'idle', error: null, readId: null, writes: {},
};
export const loadProfile = createAsyncThunk('profile/load', (token) => getProfile(token), {
  condition: (_, { getState }) => !getState().profile.readId && !Object.keys(getState().profile.writes).length,
});
const available = (kind) => ({ condition: (_, { getState }) => !getState().profile.writes[kind] });
export const saveBodyMetrics = createAsyncThunk('profile/saveBodyMetrics', ({ token, metrics }) => updateBodyMetricsApi(token, metrics), available('metrics'));
export const saveProfileDetails = createAsyncThunk('profile/saveDetails', ({ token, details }) => updateProfileDetails(token, details), available('details'));
export const saveProfilePhoto = createAsyncThunk('profile/savePhoto', async ({ token, photo }) => ({
  ...await uploadProfilePhoto(token, photo), profileImageVersion: Date.now(),
}), available('photo'));

function begin(state, action, kind, values) {
  state.readId = null; state.status = 'saving'; state.error = null;
  state.writes[kind] = { id: action.meta.requestId, previous: Object.fromEntries(Object.keys(values).map((key) => [key, state[key]])) };
  Object.assign(state, values);
}
function finish(state, action, kind, values) {
  const operation = state.writes[kind];
  if (operation?.id !== action.meta.requestId) return;
  Object.assign(state, values || operation.previous);
  delete state.writes[kind]; state.readId = null;
  if (!values) state.error = action.error.message || 'Could not save. Please retry.';
  state.status = Object.keys(state.writes).length ? 'saving' : state.error ? 'error' : 'saved';
}
const metricsFrom = (payload) => Object.fromEntries(['heightCm', 'weightKg', 'age', 'bodyFatPercent'].map((key) => [key, payload[key] ?? null]));
const detailsFrom = (payload) => ({ name: payload.name, dietaryPreferences: payload.dietaryPreferences ?? '' });

const slice = createSlice({
  name: 'profile', initialState: initialProfileState, reducers: {},
  extraReducers: (builder) => builder
    .addCase(loadProfile.pending, (state, action) => { state.readId = action.meta.requestId; if (!state.email) state.status = 'loading'; })
    .addCase(loadProfile.fulfilled, (state, action) => {
      if (state.readId !== action.meta.requestId) return;
      state.readId = null;
      if (!action.payload) return;
      const payload = action.payload;
      Object.assign(state, detailsFrom(payload), { email: payload.email, goal: payload.goal, profileImageUrl: payload.profileImageUrl || null,
        lastBodyMetricsUpdatedAt: payload.lastBodyMetricsUpdatedAt || null, status: 'idle' });
      const metrics = metricsFrom(payload);
      if (Object.entries(metrics).some(([key, value]) => state.bodyMetrics[key] !== value)) state.bodyMetrics = metrics;
    })
    .addCase(loadProfile.rejected, (state, action) => {
      if (state.readId !== action.meta.requestId) return;
      state.readId = null; state.status = 'error'; state.error = action.error.message;
    })
    .addCase(saveBodyMetrics.pending, (state, action) => begin(state, action, 'metrics', { bodyMetrics: action.meta.arg.metrics }))
    .addCase(saveBodyMetrics.fulfilled, (state, action) => finish(state, action, 'metrics', { bodyMetrics: metricsFrom(action.payload), lastBodyMetricsUpdatedAt: action.payload.lastBodyMetricsUpdatedAt }))
    .addCase(saveBodyMetrics.rejected, (state, action) => finish(state, action, 'metrics'))
    .addCase(saveProfileDetails.pending, (state, action) => begin(state, action, 'details', detailsFrom(action.meta.arg.details)))
    .addCase(saveProfileDetails.fulfilled, (state, action) => finish(state, action, 'details', detailsFrom(action.payload)))
    .addCase(saveProfileDetails.rejected, (state, action) => finish(state, action, 'details'))
    .addCase(saveProfilePhoto.pending, (state, action) => begin(state, action, 'photo', { profileImageUrl: action.meta.arg.photo.uri, profileImageVersion: null }))
    .addCase(saveProfilePhoto.fulfilled, (state, action) => finish(state, action, 'photo', { profileImageUrl: action.payload.profileImageUrl, profileImageVersion: action.payload.profileImageVersion }))
    .addCase(saveProfilePhoto.rejected, (state, action) => finish(state, action, 'photo')),
});
export default slice.reducer;
