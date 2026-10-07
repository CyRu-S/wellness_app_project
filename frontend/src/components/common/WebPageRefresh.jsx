import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme';

// React Native Web does not implement the native RefreshControl gesture.
export default function WebPageRefresh({ children, enabled, refreshing, onRefresh }) {
  const root = useRef(null);
  const gesture = useRef(null);
  const [distance, setDistance] = useState(0);
  useEffect(() => {
    const element = root.current;
    if (!enabled || !element) return undefined;
    const start = (event) => {
      gesture.current = null;
      if (refreshing || event.touches.length !== 1 || event.target.closest?.('input,textarea,button,[role="button"],[contenteditable="true"]')) return;
      // All enclosing scrollers must be at the top, including lists nested in Screen.
      let node = event.target;
      while (node && element.contains(node)) {
        if (node.scrollTop > 0) return;
        node = node.parentElement;
      }
      gesture.current = { x: event.touches[0].clientX, y: event.touches[0].clientY, distance: 0 };
    };
    const move = (event) => {
      const current = gesture.current;
      if (!current || event.touches.length !== 1) return;
      const dy = event.touches[0].clientY - current.y;
      if (dy <= 0 || Math.abs(event.touches[0].clientX - current.x) > dy) {
        gesture.current = null; setDistance(0); return;
      }
      current.distance = Math.min(100, dy * 0.5);
      if (dy > 8 && event.cancelable) event.preventDefault();
      setDistance(current.distance);
    };
    const finish = () => {
      const current = gesture.current;
      gesture.current = null; setDistance(0);
      if (current?.distance >= 60 && !refreshing) onRefresh();
    };
    const cancel = () => { gesture.current = null; setDistance(0); };
    element.addEventListener('touchstart', start, { passive: true });
    element.addEventListener('touchmove', move, { passive: false });
    element.addEventListener('touchend', finish);
    element.addEventListener('touchcancel', cancel);
    return () => {
      element.removeEventListener('touchstart', start); element.removeEventListener('touchmove', move);
      element.removeEventListener('touchend', finish); element.removeEventListener('touchcancel', cancel);
    };
  }, [enabled, refreshing, onRefresh]);
  return <View ref={root} style={styles.fill}>
    {enabled ? <View style={styles.bar}>
      {refreshing ? <ActivityIndicator size="small" color={colors.tealMid} accessibilityLabel="Refreshing page" />
        : <Pressable accessibilityRole="button" accessibilityLabel="Refresh this page" onPress={onRefresh} style={styles.button}>
          <Text style={styles.text}>{distance >= 60 ? 'Release to refresh' : distance > 0 ? 'Pull to refresh' : 'Refresh'}</Text>
        </Pressable>}
    </View> : null}
    {children}
  </View>;
}
const styles = StyleSheet.create({
  fill: { flex: 1 }, bar: { minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  button: { minHeight: 44, paddingHorizontal: 16, justifyContent: 'center' },
  text: { fontSize: 12, color: colors.tealMid },
});
