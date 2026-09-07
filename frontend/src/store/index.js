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

const combined = combineReducers({ auth, dashboard, plan, meals, activity, notifications, admin, profile, memberAccess, adminMemberJournal });
const reducer = (state, action) => {
  if (action.type === 'auth/signOut' || ['auth/signIn/fulfilled', 'auth/signInWithGoogle/fulfilled'].includes(action.type)) {
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
export const store = configureStore({ reducer, middleware: (getDefault) => getDefault().concat(sessionGuard, refreshAfterSave.middleware) });
