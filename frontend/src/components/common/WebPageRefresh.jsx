import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme';

// React Native Web does not implement the native RefreshControl gesture.
export default function WebPageRefresh({ children, enabled, refreshing, onRefresh }) {
  const root = useRef(null);
  const gesture = useRef(null);
  const pending = useRef(false);
  const activeRefresh = useRef(refreshing);
  const [progress] = useState(() => new Animated.Value(0));
  const [distance, setDistance] = useState(0);
  useEffect(() => {
    activeRefresh.current = refreshing;
    const animation = Animated.timing(progress, {
      toValue: enabled && refreshing ? 64 : 0, duration: 180, useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [enabled, refreshing, progress]);
  useEffect(() => {
    const element = root.current;
    if (!enabled || !element) return undefined;
    const start = (event) => {
      gesture.current = null;
      if (refreshing || pending.current || event.touches.length !== 1 || event.target.closest?.('input,textarea,button,[role="button"],[contenteditable="true"]')) return;
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
      if (!current) return;
      if (event.touches.length !== 1) {
        gesture.current = null; setDistance(0); progress.setValue(0); return;
      }
      const dy = event.touches[0].clientY - current.y;
      if (dy <= 0 || Math.abs(event.touches[0].clientX - current.x) > dy) {
        gesture.current = null; setDistance(0); progress.setValue(0); return;
      }
      current.distance = Math.min(100, dy * 0.5);
      if (dy > 8 && event.cancelable) event.preventDefault();
      setDistance(current.distance);
      progress.setValue(current.distance);
    };
    const finish = () => {
      const current = gesture.current;
      if (!current) return;
      gesture.current = null; setDistance(0);
      const released = current?.distance >= 60 && !refreshing;
      Animated.timing(progress, { toValue: released ? 64 : 0, duration: 180, useNativeDriver: false }).start();
      if (released) {
        pending.current = true;
        const settled = () => {
          pending.current = false;
          if (!activeRefresh.current && !gesture.current) {
            Animated.timing(progress, { toValue: 0, duration: 180, useNativeDriver: false }).start();
          }
        };
        try { Promise.resolve(onRefresh()).then(settled, settled); }
        catch (error) { settled(); throw error; }
      }
    };
    const cancel = () => {
      if (!gesture.current) return;
      gesture.current = null; setDistance(0);
      Animated.timing(progress, { toValue: 0, duration: 180, useNativeDriver: false }).start();
    };
    element.addEventListener('touchstart', start, { passive: true });
    element.addEventListener('touchmove', move, { passive: false });
    element.addEventListener('touchend', finish);
    element.addEventListener('touchcancel', cancel);
    return () => {
      element.removeEventListener('touchstart', start); element.removeEventListener('touchmove', move);
      element.removeEventListener('touchend', finish); element.removeEventListener('touchcancel', cancel);
    };
  }, [enabled, refreshing, onRefresh, progress]);
  return <View ref={root} style={styles.fill}>
    {children}
    {enabled ? <Animated.View pointerEvents="none" accessibilityElementsHidden={!refreshing && distance === 0}
      importantForAccessibility={!refreshing && distance === 0 ? 'no-hide-descendants' : 'auto'}
      accessibilityRole="progressbar" accessibilityLabel={refreshing ? 'Refreshing page' : distance >= 60 ? 'Release to refresh' : 'Pull to refresh'}
      style={[styles.indicator, {
        opacity: progress.interpolate({ inputRange: [0, 12], outputRange: [0, 1], extrapolate: 'clamp' }),
        transform: [{ translateY: progress.interpolate({ inputRange: [0, 64, 100], outputRange: [-48, 16, 28], extrapolate: 'clamp' }) }],
      }]}>
      {refreshing ? <ActivityIndicator size="small" color={colors.tealMid} accessibilityLabel="Refreshing page" />
        : <Animated.View style={{ transform: [{ rotate: progress.interpolate({ inputRange: [0, 60], outputRange: ['0deg', '180deg'], extrapolate: 'clamp' }) }] }}>
          <Text accessible={false} style={styles.arrow}>↓</Text>
        </Animated.View>}
    </Animated.View> : null}
  </View>;
}
const styles = StyleSheet.create({
  fill: { flex: 1, position: 'relative' },
  indicator: { position: 'absolute', top: 0, alignSelf: 'center', width: 40, height: 40, borderRadius: 20,
    zIndex: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.line, boxShadow: '0 3px 10px rgba(8, 56, 61, 0.16)' },
  arrow: { fontSize: 25, lineHeight: 30, color: colors.tealMid },
});
