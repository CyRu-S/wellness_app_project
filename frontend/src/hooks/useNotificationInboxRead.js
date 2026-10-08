import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { markInboxNotificationsRead } from '../store/slices/notificationSlice';

export default function useNotificationInboxRead() {
  const dispatch = useDispatch();
  const items = useSelector((state) => state.notifications.items);
  const error = useSelector((state) => state.notifications.readInboxError);
  const markDisplayed = useCallback(() => {
    const ids = items.filter((item) => !item.read).map((item) => item.id);
    if (ids.length) dispatch(markInboxNotificationsRead(ids));
  }, [dispatch, items]);
  useFocusEffect(useCallback(() => { markDisplayed(); }, [markDisplayed]));
  return { error, onRetry: markDisplayed };
}
