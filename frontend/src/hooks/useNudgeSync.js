import { useCallback } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { syncSharedMemberAttention } from '../store/slices/memberAccessSlice';

// Refresh only lightweight nudge state while its buttons are visible.
export default function useNudgeSync(memberId, enabled = true) {
  const dispatch = useDispatch();
  useFocusEffect(useCallback(() => {
    if (!enabled || memberId == null) return undefined;
    let active = true;
    let pending = false;
    const sync = async () => {
      if (!active || pending || (AppState.currentState && AppState.currentState !== 'active')
        || (typeof document !== 'undefined' && document.hidden)) return;
      pending = true;
      try { await dispatch(syncSharedMemberAttention(memberId)); }
      finally { pending = false; }
    };
    sync();
    const timer = setInterval(sync, 30000);
    const foreground = AppState.addEventListener('change', (state) => { if (state === 'active') sync(); });
    return () => { active = false; clearInterval(timer); foreground.remove(); };
  }, [dispatch, memberId, enabled]));
}
