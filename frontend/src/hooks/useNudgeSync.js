import { useCallback } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { loadAdminAttention } from '../store/slices/adminSlice';
import { syncSharedMemberAttention } from '../store/slices/memberAccessSlice';

// Refresh only lightweight nudge state while its buttons are visible.
export default function useNudgeSync(memberId, enabled = true) {
  const dispatch = useDispatch();
  useFocusEffect(useCallback(() => {
    if (!enabled) return undefined;
    let active = true;
    let pending = false;
    const sync = async () => {
      if (!active || pending || (AppState.currentState && AppState.currentState !== 'active')) return;
      pending = true;
      try { await dispatch(memberId == null ? loadAdminAttention() : syncSharedMemberAttention(memberId)); }
      finally { pending = false; }
    };
    sync();
    const timer = setInterval(sync, 5000);
    const foreground = AppState.addEventListener('change', (state) => { if (state === 'active') sync(); });
    return () => { active = false; clearInterval(timer); foreground.remove(); };
  }, [dispatch, memberId, enabled]));
}
