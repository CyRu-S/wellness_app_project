import { combineReducers, configureStore, createListenerMiddleware } from '@reduxjs/toolkit';
import auth from './slices/authSlice';
import dashboard from './slices/dashboardSlice';
import plan from './slices/planSlice';
import meals from './slices/mealSlice';
import activity from './slices/activitySlice';
import notifications from './slices/notificationSlice';
import admin, { loadAdminMembers } from './slices/adminSlice';
import profile from './slices/profileSlice';
import memberAccess from './slices/memberAccessSlice';
import adminMemberJournal from './slices/adminMemberJournalSlice';
import toast, { showToast } from './slices/toastSlice';
import { schedulePersistedState } from '../services/storage/persistedState';
import { writeSession } from '../services/storage/sessionStorage';

const combined = combineReducers({ auth, dashboard, plan, meals, activity, notifications, admin, profile, memberAccess, adminMemberJournal, toast });
const reducer = (state, action) => {
  if (action.type === 'app/hydrateCachedState' && state?.auth?.token && String(state.auth.user?.id) === String(action.payload?.userId)) {
    const defaults = combined(undefined, { type: '@@INIT' });
    const hydrated = Object.fromEntries(Object.entries(action.payload.data).filter(([key]) => key !== 'auth' && key in defaults)
      .map(([key, value]) => [key, { ...defaults[key], ...value }]));
    state = { ...state, ...hydrated };
  }
  if (action.type === 'auth/signOut' || action.type === 'auth/signIn/fulfilled') {
    state = { auth: state?.auth };
  }
  return combined(state, action);
};
const sessionGuard = (store) => {
  const pending = new Map();
  return (next) => (action) => {
    const id = action.meta?.requestId;
    if (id && !action.type.startsWith('auth/')) {
      if (action.meta.requestStatus === 'pending') pending.set(id, store.getState().auth.token);
      else if (pending.has(id)) {
        const token = pending.get(id); pending.delete(id);
        if (token !== store.getState().auth.token) return action;
      }
    }
    return next(action);
  };
};
const refreshAfterSave = createListenerMiddleware();
refreshAfterSave.startListening({
  matcher: (action) => ['admin/approve/fulfilled', 'admin/decline/fulfilled', 'admin/nudge/fulfilled', 'admin/resolve/fulfilled', 'admin/savePlan/fulfilled'].includes(action.type),
  effect: (_, { dispatch }) => { dispatch(loadAdminMembers()); },
});
const completionToasts = createListenerMiddleware();
const persistAccountDetails = createListenerMiddleware();
persistAccountDetails.startListening({
  matcher: (action) => ['profile/saveDetails/fulfilled', 'profile/savePhoto/fulfilled'].includes(action.type),
  effect: async (_, api) => {
    const { token, user } = api.getState().auth;
    if (token && user) await writeSession({ token, ...user }).catch(() => {});
  },
});
completionToasts.startListening({
  matcher: (action) => ['dashboard/drinkWater/fulfilled', 'activity/complete/fulfilled', 'meals/post/fulfilled'].includes(action.type),
  effect: (action, api) => {
    if (action.type === 'dashboard/drinkWater/fulfilled') {
      const before = api.getOriginalState().dashboard;
      const operation = before.optimistic.water;
      if (!operation || operation.previous.waterGlasses >= before.waterTarget || before.waterGlasses < before.waterTarget) return;
      api.dispatch(showToast({ kind: 'water', title: 'Congratulations! Water goal complete', message: `You reached all ${before.waterTarget} glasses today. Keep it up!` }));
      return;
    }
    if (action.type === 'activity/complete/fulfilled') {
      api.dispatch(showToast({ kind: 'activity', title: 'Congratulations! Training complete', message: `Great work completing ${action.payload.activity} for ${action.payload.minutes} minutes!` }));
      return;
    }
    api.dispatch(showToast({ kind: 'meal', title: 'Congratulations! Meal check-in complete', message: `${action.payload.mealName || action.meta.arg.mealName} is now part of today’s progress. Well done!` }));
  },
});
export const store = configureStore({ reducer, middleware: (getDefault) => getDefault().concat(sessionGuard, refreshAfterSave.middleware, completionToasts.middleware, persistAccountDetails.middleware) });
store.subscribe(() => schedulePersistedState(store.getState()));
