import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';
import Alert from '../utils/appAlert';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { refreshPageResponses } from '../services/api/client';
import { subscribeLiveUpdates } from '../services/api/liveUpdates';
import { loadAdminMembers, loadAdminAttention, loadAdminDirectory, loadAdminApprovals, loadAdminMemberPlan, loadAdminProducts } from '../store/slices/adminSlice';
import { refreshDashboard } from '../store/slices/dashboardSlice';
import { loadMeals } from '../store/slices/mealSlice';
import { loadPlan } from '../store/slices/planSlice';
import { loadActivities } from '../store/slices/activitySlice';
import { loadProfile } from '../store/slices/profileSlice';
import { loadNotifications, loadNotificationPreferences } from '../store/slices/notificationSlice';
import { loadSharedMembers, loadSharedMemberToday, loadAdminMemberAccess } from '../store/slices/memberAccessSlice';
import { loadAdminMemberJournal } from '../store/slices/adminMemberJournalSlice';
import { loadLeaderboard } from '../store/slices/leaderboardSlice';

const LIVE_SYNC_PAGES = new Set(['AdminDashboard', 'Reports', 'Alerts', 'Dashboard', 'TodayTimeline', 'DailyPlan', 'UserDetails', 'SharedMembers', 'SharedMemberToday', 'Leaderboard']);

export default function usePageRefresh() {
  const route = useRoute();
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);
  const busy = useRef(null);
  const rerun = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const name = route.name;
  const memberId = route.params?.memberId ?? route.params?.id;
  const config = useCallback((force = false) => {
    if (['AdminDashboard', 'Reports', 'DietPlans'].includes(name))
      return { paths: ['/admin/workspace', '/admin/members', '/admin/approvals'], actions: [loadAdminMembers({ force })] };
    if (name === 'Products') return { paths: ['/admin/products'], actions: [loadAdminProducts()] };
    if (name === 'Alerts') return { paths: ['/admin/attention'], actions: [loadAdminAttention()] };
    if (name === 'UserList') return { paths: ['/admin/members'], actions: [loadAdminDirectory()] };
    if (name === 'UserRequests') return { paths: ['/admin/approvals'], actions: [loadAdminApprovals()] };
    if (name === 'Dashboard') return { paths: ['/dashboard', '/meals/today', '/plans/today', '/meal-posts', '/leaderboard'], actions: [refreshDashboard(), loadMeals(), loadPlan(), loadLeaderboard({ force })] };
    if (name === 'Leaderboard') return { paths: ['/leaderboard'], actions: [loadLeaderboard({ force })] };
    if (['TodayTimeline', 'MealDetails'].includes(name)) return { paths: ['/meals/today', '/plans/today', '/meal-posts'], actions: [loadMeals(), loadPlan()] };
    if (name === 'ActivityTimer' || name === 'Move') return { paths: ['/activities'], actions: [loadActivities()] };
    if (name === 'DailyPlan') return { paths: ['/plans/today'], actions: [loadPlan()] };
    if (['Notifications', 'AdminNotifications'].includes(name)) return { paths: ['/notifications'], actions: [loadNotifications()] };
    if (['NotificationSettings', 'HealthPreferences'].includes(name)) return { paths: ['/notifications/preferences', '/profile'], actions: [loadNotificationPreferences(), loadProfile(token)] };
    if (['ProfileHome', 'AdminProfile', 'EditProfile', 'BodyDetails', 'PrivacyData'].includes(name)) return { paths: ['/profile'], actions: [loadProfile(token)] };
    if (['MemberAccess', 'ManageMemberAccess'].includes(name)) return { paths: ['/admin/member-access'], actions: [loadAdminMemberAccess()] };
    if (name === 'SharedMembers') return { paths: ['/shared-members'], actions: [loadSharedMembers()] };
    if (name === 'SharedMemberToday') return { paths: [`/shared-members/${memberId}/today`, `/shared-members/${memberId}/journal`, `/shared-members/${memberId}/attention`], actions: [loadSharedMemberToday(memberId)] };
    if (name === 'UserDetails') return { paths: [`/admin/users/${memberId}/journal`, `/admin/plans/members/${memberId}`, '/admin/members'], actions: [loadAdminMemberJournal({ memberId }), loadAdminMemberPlan(memberId), loadAdminDirectory()] };
    return null;
  }, [name, memberId, token]);
  const load = useCallback(async function refreshPage(force = false) {
    if (!token || (AppState.currentState && AppState.currentState !== 'active')
      || (typeof document !== 'undefined' && document.hidden)) return;
    if (busy.current) {
      if (!force) { rerun.current = true; return; }
      // A real pull must wait for the current load and then fetch fresh data;
      // previously it silently did nothing while focus/live loading was busy.
      setRefreshing(true);
      await busy.current;
      return refreshPage(true);
    }
    const page = config(force);
    if (!page) return;
    // Opening a page and pulling to refresh both read current server data.
    refreshPageResponses(page.paths);
    if (force) setRefreshing(true);
    const operation = (async () => {
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
      const rejected = results.filter((result) => result.meta?.requestStatus === 'rejected');
      const failed = rejected.find((result) => !result.meta?.condition) || rejected[0];
      if (force && failed) {
        if (failed.meta?.condition) Alert.alert('Refresh pending', 'Updates are still syncing. Please try again shortly.');
        else Alert.alert('Refresh failed', failed.payload?.message || failed.error?.message || 'Please try again.');
      }
    })();
    busy.current = operation;
    try { await operation; }
    finally {
      busy.current = null;
      if (force) setRefreshing(false);
      if (rerun.current) { rerun.current = false; refreshPage(); }
    }
  }, [token, config, dispatch]);
  useFocusEffect(useCallback(() => {
    load();
    let stopped = false, unsubscribe = null;
    const active = () => (!AppState.currentState || AppState.currentState === 'active')
      && (typeof document === 'undefined' || !document.hidden);
    const syncConnection = () => {
      unsubscribe?.(); unsubscribe = null;
      if (!stopped && active()) {
        if (LIVE_SYNC_PAGES.has(name)) unsubscribe = subscribeLiveUpdates(token, () => load());
        load();
      }
    };
    if (LIVE_SYNC_PAGES.has(name) && active()) unsubscribe = subscribeLiveUpdates(token, () => load());
    const subscription = AppState.addEventListener?.('change', syncConnection);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', syncConnection);
    return () => {
      stopped = true; rerun.current = false;
      unsubscribe?.();
      subscription?.remove();
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', syncConnection);
    };
  }, [load, name, token]));
  return { refreshing, onRefresh: useCallback(() => load(true), [load]), enabled: !!token && !!config() };
}
