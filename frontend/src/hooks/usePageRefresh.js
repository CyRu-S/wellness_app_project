import { useCallback, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { refreshPageResponses } from '../services/api/client';
import { loadAdminMembers, loadAdminAttention, loadAdminDirectory, loadAdminApprovals, loadAdminMemberPlan } from '../store/slices/adminSlice';
import { refreshDashboard } from '../store/slices/dashboardSlice';
import { loadMeals } from '../store/slices/mealSlice';
import { loadPlan } from '../store/slices/planSlice';
import { loadActivities } from '../store/slices/activitySlice';
import { loadProfile } from '../store/slices/profileSlice';
import { loadNotifications, loadNotificationPreferences } from '../store/slices/notificationSlice';
import { loadSharedMembers, loadSharedMemberToday, loadAdminMemberAccess } from '../store/slices/memberAccessSlice';
import { loadAdminMemberJournal } from '../store/slices/adminMemberJournalSlice';

export default function usePageRefresh() {
  const route = useRoute();
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);
  const busy = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const name = route.name;
  const memberId = route.params?.memberId ?? route.params?.id;
  const config = useCallback(() => {
    if (['AdminDashboard', 'Reports', 'DietPlans', 'Products'].includes(name))
      return { paths: ['/admin/workspace', '/admin/members', '/admin/approvals'], actions: [loadAdminMembers()] };
    if (name === 'Alerts') return { paths: ['/admin/attention'], actions: [loadAdminAttention()] };
    if (name === 'UserList') return { paths: ['/admin/members'], actions: [loadAdminDirectory()] };
    if (name === 'UserRequests') return { paths: ['/admin/approvals'], actions: [loadAdminApprovals()] };
    if (name === 'Dashboard') return { paths: ['/dashboard', '/meals/today', '/plans/today', '/meal-posts'], actions: [refreshDashboard(), loadMeals()] };
    if (['TodayTimeline', 'MealDetails', 'MealCapture'].includes(name)) return { paths: ['/meals/today', '/plans/today', '/meal-posts'], actions: [loadMeals()] };
    if (name === 'ActivityTimer' || name === 'Move') return { paths: ['/activities'], actions: [loadActivities()] };
    if (name === 'DailyPlan') return { paths: ['/plans/today'], actions: [loadPlan()] };
    if (['Notifications', 'AdminNotifications'].includes(name)) return { paths: ['/notifications'], actions: [loadNotifications()] };
    if (['NotificationSettings', 'HealthPreferences'].includes(name)) return { paths: ['/notifications/preferences', '/profile'], actions: [loadNotificationPreferences(), loadProfile(token)] };
    if (['ProfileHome', 'AdminProfile', 'EditProfile', 'BodyDetails', 'PrivacyData'].includes(name)) return { paths: ['/profile'], actions: [loadProfile(token)] };
    if (['MemberAccess', 'ManageMemberAccess'].includes(name)) return { paths: ['/admin/member-access'], actions: [loadAdminMemberAccess()] };
    if (name === 'SharedMembers') return { paths: ['/shared-members'], actions: [loadSharedMembers()] };
    if (name === 'SharedMemberToday') return { paths: [`/shared-members/${memberId}/today`], actions: [loadSharedMemberToday(memberId)] };
    if (name === 'UserDetails') return { paths: [`/admin/users/${memberId}/journal`, `/admin/plans/members/${memberId}`, '/admin/members'], actions: [loadAdminMemberJournal({ memberId }), loadAdminMemberPlan(memberId), loadAdminDirectory()] };
    return null;
  }, [name, memberId, token]);
  const load = useCallback(async (force = false) => {
    if (!token || busy.current || (AppState.currentState && AppState.currentState !== 'active')) return;
    const page = config();
    if (!page) return;
    busy.current = true;
    if (force) { setRefreshing(true); refreshPageResponses(page.paths); }
    try {
      const results = await Promise.all(page.actions.map(async (action) => {
        let result = await dispatch(action);
        // Wait for an existing read/write before forcing a new read of this page.
        const started = Date.now();
        while (force && result.meta?.condition && Date.now() - started < 20000) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          result = await dispatch(action);
        }
        return result;
      }));
      const failed = results.find((result) => result.meta?.requestStatus === 'rejected');
      if (force && failed) Alert.alert('Refresh failed', failed.payload?.message || failed.error?.message || 'Please try again.');
    } finally { busy.current = false; if (force) setRefreshing(false); }
  }, [token, config, dispatch]);
  useFocusEffect(useCallback(() => {
    load();
    const timer = ['AdminDashboard', 'Alerts', 'UserList'].includes(name) ? setInterval(() => load(), 60000) : null;
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') load(); });
    return () => { if (timer) clearInterval(timer); subscription.remove(); };
  }, [load, name]));
  return { refreshing, onRefresh: useCallback(() => load(true), [load]), enabled: !!token && !!config() };
}
