import { useCallback } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

// Detail screens must not poll while hidden, backgrounded, or already loading.
export default function useFocusedPolling(load, interval = 10000) {
  useFocusEffect(useCallback(() => {
    let active = true;
    let busy = false;
    const refresh = async () => {
      if (!active || busy || (AppState.currentState && AppState.currentState !== 'active')) return;
      busy = true;
      try { await load(); } finally { busy = false; }
    };
    refresh();
    const timer = setInterval(refresh, interval);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(); });
    return () => { active = false; clearInterval(timer); subscription.remove(); };
  }, [interval, load]));
}
