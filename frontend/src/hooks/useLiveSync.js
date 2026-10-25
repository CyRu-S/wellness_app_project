import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { loadNotifications } from '../store/slices/notificationSlice';
import { request, refreshPageResponses } from '../services/api/client';
import { subscribeLiveUpdates } from '../services/api/liveUpdates';
import { validateRestoredSession } from '../store/slices/authSlice';

// Presence needs a small heartbeat. Page data and badges use change signals,
// never repeated GETs while nothing has changed.
export default function useLiveSync() {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);
  useEffect(() => {
    if (!token) return undefined;
    let stopped = false;
    let busy = false;
    let unsubscribe = null;
    const active = () => (!AppState.currentState || AppState.currentState === 'active')
      && (typeof document === 'undefined' || !document.hidden);
    const notifications = () => {
      if (stopped || !active()) return;
      refreshPageResponses(['/notifications']);
      dispatch(loadNotifications());
    };
    const connect = () => {
      unsubscribe?.(); unsubscribe = null;
      if (!stopped && active()) unsubscribe = subscribeLiveUpdates(token, notifications);
    };
    const heartbeat = async () => {
      if (stopped || busy || (AppState.currentState && AppState.currentState !== 'active')
        || (typeof document !== 'undefined' && document.hidden)) return;
      busy = true;
      try { await request('/presence', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }); }
      catch { /* The next foreground heartbeat retries after an outage. */ }
      finally { busy = false; }
    };
    dispatch(validateRestoredSession());
    notifications(); connect();
    heartbeat();
    const timer = setInterval(heartbeat, 45000);
    const foreground = () => { connect(); if (active()) { notifications(); heartbeat(); } };
    const subscription = AppState.addEventListener('change', foreground);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', foreground);
    return () => {
      stopped = true; unsubscribe?.(); clearInterval(timer); subscription.remove();
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', foreground);
    };
  }, [dispatch, token]);
}
