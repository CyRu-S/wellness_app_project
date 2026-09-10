import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { clearToast } from '../../store/slices/toastSlice';
import useReducedMotion from '../../hooks/useReducedMotion';
import { colors, fonts, radius, shadows } from '../../theme';

const icons = { water: 'water', activity: 'walk', meal: 'camera' };
const confettiColors = ['#F4B942', '#24B9AD', '#FF746C', '#6FD4C9', '#F6CA65', '#0F8F91', '#FF9A72'];
const confettiPieces = Array.from({ length: 72 }, (_, index) => {
  const fromLeft = index % 2 === 0;
  const ribbon = index % 13 === 0;
  const round = !ribbon && index % 9 === 0;
  return {
    direction: fromLeft ? 1 : -1,
    color: confettiColors[index % confettiColors.length],
    reach: 0.26 + ((index * 31) % 66) / 100,
    finishReach: 0.32 + ((index * 43) % 78) / 100,
    launchHeight: 0.28 + ((index * 17) % 14) / 100,
    apexHeight: 0.08 + ((index * 29) % 22) / 100,
    fallHeight: 0.43 + ((index * 13) % 15) / 100,
    landingHeight: 0.74 + ((index * 19) % 31) / 100,
    spin: (index % 3 ? -1 : 1) * (420 + (index * 67) % 620),
    delay: 0.01 + ((index * 7) % 20) / 100,
    width: ribbon ? 14 : round ? 7 : 4 + index % 5,
    height: ribbon ? 5 : round ? 7 : 8 + (index * 3) % 8,
    round,
  };
});

function Confetti({ progress, screenWidth, screenHeight, topOffset }) {
  return (
    <View pointerEvents="none" style={[styles.confettiLayer, { top: -topOffset, left: -16, width: screenWidth, height: screenHeight }]}>
      {confettiPieces.map((piece, index) => {
        const ignition = piece.delay + 0.035;
        const launch = piece.delay + 0.14;
        const apex = piece.delay + 0.36;
        const falling = Math.min(piece.delay + 0.7, 0.88);
        const fade = Math.min(piece.delay + 0.82, 0.94);
        const launchX = piece.direction * screenWidth * piece.reach * 0.48;
        const apexX = piece.direction * screenWidth * piece.reach;
        const landingX = piece.direction * screenWidth * piece.finishReach;
        const sourceY = screenHeight - 10;
        const launchY = sourceY - screenHeight * piece.launchHeight;
        const apexY = screenHeight * piece.apexHeight;
        const fallingY = screenHeight * piece.fallHeight;
        const landingY = screenHeight * piece.landingHeight;
        return (
          <Animated.View
            key={`${index}-${piece.color}`}
            style={[
              styles.confetti,
              {
                left: piece.direction === 1 ? 0 : screenWidth,
                top: 0,
                width: piece.width,
                height: piece.height,
                borderRadius: piece.round ? piece.width / 2 : 2,
                backgroundColor: piece.color,
                opacity: progress.interpolate({ inputRange: [0, piece.delay, ignition, fade, 1], outputRange: [0, 0, 1, 0.9, 0], extrapolate: 'clamp' }),
                transform: [
                  { translateX: progress.interpolate({ inputRange: [0, piece.delay, launch, apex, falling, 1], outputRange: [0, 0, launchX, apexX, landingX * 0.92, landingX], extrapolate: 'clamp' }) },
                  { translateY: progress.interpolate({ inputRange: [0, piece.delay, launch, apex, falling, 1], outputRange: [sourceY, sourceY, launchY, apexY, fallingY, landingY], extrapolate: 'clamp' }) },
                  { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${piece.spin}deg`] }) },
                  { scale: progress.interpolate({ inputRange: [0, piece.delay, launch, 1], outputRange: [0.3, 0.3, 1, 0.74], extrapolate: 'clamp' }) },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

export default function InAppToast() {
  const toast = useSelector((state) => state.toast.current);
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [visibility] = useState(() => new Animated.Value(0));
  const [celebration] = useState(() => new Animated.Value(0));
  const timerRef = useRef(null);
  const closingRef = useRef(null);

  const dismiss = useCallback((id) => {
    if (!id || closingRef.current === id) return;
    closingRef.current = id;
    clearTimeout(timerRef.current);
    if (reduceMotion) {
      dispatch(clearToast(id));
      return;
    }
    Animated.timing(visibility, {
      toValue: 0,
      duration: 360,
      easing: Easing.bezier(0.4, 0, 1, 1),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) dispatch(clearToast(id));
      else closingRef.current = null;
    });
  }, [dispatch, reduceMotion, visibility]);

  useEffect(() => {
    if (!toast) return undefined;
    closingRef.current = null;
    clearTimeout(timerRef.current);
    visibility.stopAnimation();
    celebration.stopAnimation();
    visibility.setValue(reduceMotion ? 1 : 0);
    celebration.setValue(reduceMotion ? 1 : 0);
    const entrance = reduceMotion ? null : Animated.parallel([
      Animated.spring(visibility, { toValue: 1, speed: 16, bounciness: 3, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(90),
        Animated.timing(celebration, { toValue: 1, duration: 3600, easing: Easing.linear, useNativeDriver: true }),
      ]),
    ]);
    entrance?.start();
    timerRef.current = setTimeout(() => dismiss(toast.id), reduceMotion ? 5000 : 4640);
    return () => {
      clearTimeout(timerRef.current);
      entrance?.stop();
      celebration.stopAnimation();
    };
  }, [celebration, dismiss, reduceMotion, toast, visibility]);

  if (!toast) return null;
  const opacity = visibility.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' });
  const topOffset = Math.max(insets.top, 10) + 8;
  return (
    <Animated.View
      accessibilityRole="alert"
      style={[
        styles.position,
        {
          top: topOffset,
          opacity,
          transform: [
            { translateY: visibility.interpolate({ inputRange: [0, 1], outputRange: [-28, 0], extrapolate: 'clamp' }) },
            { scale: visibility.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1], extrapolate: 'clamp' }) },
          ],
        },
      ]}
    >
      <Confetti progress={celebration} screenWidth={screenWidth} screenHeight={screenHeight} topOffset={topOffset} />
      <View style={styles.toast}>
        <View style={styles.icon}><Ionicons name={icons[toast.kind] || 'checkmark'} size={19} color={colors.white} /></View>
        <View style={styles.copy}><Text style={styles.title}>{toast.title}</Text>{toast.message ? <Text style={styles.message}>{toast.message}</Text> : null}</View>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss notification" hitSlop={10} onPress={() => dismiss(toast.id)} style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
          <Ionicons name="close" size={19} color={colors.tealDark} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  position: { position: 'absolute', zIndex: 1000, elevation: 20, left: 16, right: 16, alignItems: 'center' },
  confettiLayer: { position: 'absolute', overflow: 'visible', zIndex: 2 },
  confetti: { position: 'absolute', top: 0 },
  toast: { zIndex: 1, width: '100%', maxWidth: 410, minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, ...shadows.raised },
  icon: { width: 43, height: 43, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tealMid },
  copy: { flex: 1, minWidth: 0 },
  title: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19 },
  message: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 17, marginTop: 2 },
  close: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.accentSoft },
  pressed: { opacity: 0.6 },
});
