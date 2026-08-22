import { configureStore } from '@reduxjs/toolkit';
import auth from './slices/authSlice';
import dashboard from './slices/dashboardSlice';
import plan from './slices/planSlice';
import meals from './slices/mealSlice';
import activity from './slices/activitySlice';
import notifications from './slices/notificationSlice';
import admin from './slices/adminSlice';
import profile from './slices/profileSlice';

export const store = configureStore({ reducer: { auth, dashboard, plan, meals, activity, notifications, admin, profile } });
