import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import { colors } from '../../theme';

const logo = require('../../../assets/images/arjun-nutrition-logo.png');

export default function AnimatedLogo({ size = 220, halo = true, delay = 80 }) {
  const [entrance] = useState(() => new Animated.Value(0));
  const [float] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let loop;
    let pulseLoop;
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!mounted) return;
      if (reduced) {
        entrance.setValue(1);
        return;
      }
      Animated.spring(entrance, { toValue: 1, delay, speed: 10, bounciness: 7, useNativeDriver: true }).start();
      loop = Animated.loop(Animated.sequence([
        Animated.timing(float, { toValue: -7, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float, { toValue: 7, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]));
      loop.start();
      pulseLoop = Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]));
      pulseLoop.start();
    });
    return () => { mounted = false; loop?.stop(); pulseLoop?.stop(); };
  }, [delay, entrance, float, pulse]);

  return (
    <View style={[styles.frame, { width: size + 28, height: size + 28 }]}>
      {halo ? <Animated.View style={[styles.halo, { width: size * 0.86, height: size * 0.86, borderRadius: size, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.72] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] }) }] }]} /> : null}
      {halo ? <View style={[styles.orbit, { width: size + 18, height: size + 18, borderRadius: size }]} /> : null}
      <Animated.Image accessibilityLabel="Arjun Nutrition logo" source={logo} resizeMode="contain" style={{ width: size, height: size, opacity: entrance, transform: [{ translateY: float }, { scale: entrance }] }} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', backgroundColor: colors.accentSoft },
  orbit: { position: 'absolute', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(17,184,191,0.35)' },
});
