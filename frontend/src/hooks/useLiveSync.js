import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { loadAdminMembers } from '../store/slices/adminSlice';
import { refreshDashboard } from '../store/slices/dashboardSlice';
import { loadMeals } from '../store/slices/mealSlice';
import { loadPlan } from '../store/slices/planSlice';
import { loadActivities } from '../store/slices/activitySlice';
import { loadProfile } from '../store/slices/profileSlice';
import { loadNotifications, loadNotificationPreferences } from '../store/slices/notificationSlice';
import { loadSharedMembers, loadAdminMemberAccess } from '../store/slices/memberAccessSlice';

export default function useLiveSync() {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);
  const role = useSelector((state) => state.auth.user?.role);
  useEffect(() => {
    if (!token) return undefined;
    let stopped = false;
    let busy = false;
    let lastSlowRefresh = 0;
    const refresh = async (force = false) => {
      if (stopped || busy || (AppState.currentState && AppState.currentState !== 'active')) return;
      busy = true;
      try {
        const slowRefresh = force || Date.now() - lastSlowRefresh >= 30000;
        const actions = role === 'ADMIN'
          ? [loadAdminMembers(), loadNotifications(), ...(slowRefresh ? [loadAdminMemberAccess(), loadNotificationPreferences()] : [])]
          : [refreshDashboard(), loadMeals(), loadActivities(), loadNotifications(), ...(slowRefresh ? [loadPlan(), loadSharedMembers(), loadNotificationPreferences()] : [])];
        if (slowRefresh) { actions.push(loadProfile(token)); lastSlowRefresh = Date.now(); }
        await Promise.all(actions.map((action) => dispatch(action)));
      } finally { busy = false; }
    };
    refresh();
    const timer = setInterval(refresh, 10000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(true); });
    return () => { stopped = true; clearInterval(timer); subscription.remove(); };
  }, [dispatch, role, token]);
}
