import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { beginPushSession, endPushSession, isOwnNotification, notificationModule, syncPushRegistration } from '../services/notifications/pushNotifications';
import { loadNotifications, loadNotificationPreferences, setPushState } from '../store/slices/notificationSlice';

export default function usePushNotifications(navigationRef) {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);
  const userId = useSelector((state) => state.auth.user?.id);
  const role = useSelector((state) => state.auth.user?.role);
  const retry = useSelector((state) => state.notifications.pushRetry);
  const activeSession = useRef(null);
  const pendingTap = useRef(null);
  const seenTap = useRef(null);
  const flushTap = useCallback(() => {
    if (['USER', 'ADMIN'].includes(role) && pendingTap.current && navigationRef.isReady()) {
      pendingTap.current = null;
      if (role === 'ADMIN') navigationRef.navigate('AdminNotifications');
      else navigationRef.navigate('Today', { screen: 'Notifications' });
    }
  }, [navigationRef, role]);

  useEffect(() => {
    if (!token || !['USER', 'ADMIN'].includes(role) || !userId) return undefined;
    const s = beginPushSession(token, userId);
    activeSession.current = s;
    let stopped = false;
    const subscriptions = [];
    dispatch(loadNotificationPreferences());
    const sync = async (devicePushToken) => {
      try { const result = await syncPushRegistration(s, false, devicePushToken); if (!stopped) dispatch(setPushState(result)); }
      catch (error) { if (!stopped) dispatch(setPushState({ status: 'error', message: error.message })); }
    };
    sync();
    notificationModule().then((Notifications) => {
      if (!Notifications || stopped) return;
      Notifications.setNotificationHandler({ handleNotification: async (notification) => {
        const show = !stopped && isOwnNotification(notification, userId);
        return { shouldShowBanner: show, shouldShowList: show, shouldPlaySound: show, shouldSetBadge: false };
      } });
      const receive = (notification) => { if (!stopped && isOwnNotification(notification, userId)) dispatch(loadNotifications()); };
      const tap = (response) => {
        if (stopped || !response || !isOwnNotification(response.notification, userId)) return;
        const id = response.notification.request.identifier;
        if (seenTap.current === id) return;
        seenTap.current = id;
        pendingTap.current = id;
        receive(response.notification); flushTap();
        Notifications.clearLastNotificationResponse();
      };
      subscriptions.push(Notifications.addNotificationReceivedListener(receive), Notifications.addNotificationResponseReceivedListener(tap),
        Notifications.addPushTokenListener((devicePushToken) => sync(devicePushToken)));
      tap(Notifications.getLastNotificationResponse());
    }).catch((error) => { if (!stopped) dispatch(setPushState({ status: 'error', message: error.message })); });
    const foreground = AppState.addEventListener('change', (state) => {
      if (state === 'active') { sync(); dispatch(loadNotificationPreferences()); }
    });
    return () => {
      stopped = true; pendingTap.current = null; seenTap.current = null;
      subscriptions.forEach((subscription) => subscription.remove()); foreground.remove();
      activeSession.current = null;
      endPushSession(s).catch(() => {});
    };
  }, [dispatch, token, userId, role, flushTap]);

  useEffect(() => {
    const s = activeSession.current;
    if (!retry || !s) return undefined;
    let stopped = false;
    dispatch(setPushState({ status: 'registering', message: 'Connecting this phone…' }));
    syncPushRegistration(s, true).then((result) => { if (!stopped) dispatch(setPushState(result)); })
      .catch((error) => { if (!stopped) dispatch(setPushState({ status: 'error', message: error.message })); });
    return () => { stopped = true; };
  }, [retry, dispatch]);
  return flushTap;
}
