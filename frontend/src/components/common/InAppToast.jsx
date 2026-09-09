import React, { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { clearToast } from '../../store/slices/toastSlice';
import { colors, fonts, radius, shadows } from '../../theme';

const icons = { water: 'water', activity: 'walk', meal: 'camera' };

export default function InAppToast() {
  const toast = useSelector((state) => state.toast.current);
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!toast) return undefined;
    progress.setValue(0);
    Animated.spring(progress, { toValue: 1, speed: 18, bounciness: 4, useNativeDriver: true }).start();
    const timer = setTimeout(() => dispatch(clearToast(toast.id)), 5000);
    return () => clearTimeout(timer);
  }, [dispatch, progress, toast]);

  if (!toast) return null;
  return (
    <Animated.View
      accessibilityRole="alert"
      style={[styles.position, { top: Math.max(insets.top, 10) + 8, opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }] }]}
    >
      <View style={styles.toast}>
        <View style={styles.icon}><Ionicons name={icons[toast.kind] || 'checkmark'} size={19} color={colors.white} /></View>
        <View style={styles.copy}><Text style={styles.title}>{toast.title}</Text>{toast.message ? <Text style={styles.message}>{toast.message}</Text> : null}</View>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss notification" hitSlop={10} onPress={() => dispatch(clearToast(toast.id))} style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
          <Ionicons name="close" size={19} color={colors.tealDark} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  position: { position: 'absolute', zIndex: 1000, elevation: 20, left: 16, right: 16, alignItems: 'center' },
  toast: { width: '100%', maxWidth: 410, minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, ...shadows.raised },
  icon: { width: 43, height: 43, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tealMid },
  copy: { flex: 1, minWidth: 0 },
  title: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19 },
  message: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 17, marginTop: 2 },
  close: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.accentSoft },
  pressed: { opacity: 0.6 },
});
