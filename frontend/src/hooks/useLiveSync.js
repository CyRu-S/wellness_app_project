import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { loadNotifications } from '../store/slices/notificationSlice';
import { request } from '../services/api/client';
import { validateRestoredSession } from '../store/slices/authSlice';

// Global sync tracks presence and the notification badge; page data loads when its screen receives focus.
export default function useLiveSync() {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);
  useEffect(() => {
    if (!token) return undefined;
    let stopped = false;
    let busy = false;
    const heartbeat = async () => {
      if (stopped || busy || (AppState.currentState && AppState.currentState !== 'active')) return;
      busy = true;
      try { await Promise.all([request('/presence', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }), dispatch(loadNotifications())]); }
      catch { /* The next foreground heartbeat retries after an outage. */ }
      finally { busy = false; }
    };
    dispatch(validateRestoredSession());
    heartbeat();
    const timer = setInterval(heartbeat, 45000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') heartbeat(); });
    return () => { stopped = true; clearInterval(timer); subscription.remove(); };
  }, [dispatch, token]);
}
