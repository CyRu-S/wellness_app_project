import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, View } from 'react-native';
import { colors } from '../../theme';

const logo = require('../../../assets/images/arjun-nutrition-logo.png');

export default function AnimatedLogo({ size = 220, halo = true, delay = 80 }) {
  const [entrance] = useState(() => new Animated.Value(0));
  const [float] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(0));
  const [orbit] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let loop;
    let pulseLoop;
    let orbitLoop;
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
      orbitLoop = Animated.loop(Animated.timing(orbit, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true }));
      orbitLoop.start();
    });
    return () => { mounted = false; loop?.stop(); pulseLoop?.stop(); orbitLoop?.stop(); };
  }, [delay, entrance, float, orbit, pulse]);

  const rotation = orbit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={[styles.frame, { width: size + 56, height: size + 56 }]}>
      {halo ? <Animated.View style={[styles.haloFar, { width: size * 1.02, height: size * 1.02, borderRadius: size, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.3] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.12] }) }] }]} /> : null}
      {halo ? <Animated.View style={[styles.halo, { width: size * 0.9, height: size * 0.9, borderRadius: size, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.56] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.04] }) }] }]} /> : null}
      {halo ? <Animated.View style={[styles.orbit, { width: size + 34, height: size + 34, borderRadius: size, transform: [{ rotate: rotation }] }]}><View style={styles.goldDot} /><View style={styles.tealDot} /></Animated.View> : null}
      <Animated.View style={[styles.logoPlate, { width: size, height: size, borderRadius: size / 2, opacity: entrance, transform: [{ translateY: float }, { scale: entrance }] }]}>
        <Image accessibilityLabel="Arjun Nutrition logo" source={logo} resizeMode="contain" style={styles.image} />
        <View pointerEvents="none" style={[styles.gloss, { borderRadius: size / 2 }]} />
      </Animated.View>
      {halo ? <><View style={[styles.spark, styles.sparkLeft]} /><View style={[styles.spark, styles.sparkRight]} /></> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { alignItems: 'center', justifyContent: 'center' },
  haloFar: { position: 'absolute', backgroundColor: colors.accent },
  halo: { position: 'absolute', backgroundColor: '#7FE1D2' },
  orbit: { position: 'absolute', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(216,170,66,0.52)' },
  goldDot: { position: 'absolute', top: -4, left: '50%', width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold, shadowColor: colors.gold, shadowOpacity: 0.8, shadowRadius: 6, elevation: 4 },
  tealDot: { position: 'absolute', bottom: 8, right: 8, width: 6, height: 6, borderRadius: 3, backgroundColor: '#72E2D3' },
  logoPlate: { overflow: 'hidden', backgroundColor: colors.ink, borderWidth: 2, borderColor: 'rgba(255,255,255,0.18)', shadowColor: '#000000', shadowOpacity: 0.34, shadowRadius: 18, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
  image: { width: '100%', height: '100%' },
  gloss: { position: 'absolute', top: 0, left: 0, right: 0, height: '45%', backgroundColor: 'rgba(255,255,255,0.055)' },
  spark: { position: 'absolute', width: 6, height: 6, backgroundColor: colors.gold, transform: [{ rotate: '45deg' }] },
  sparkLeft: { left: 12, top: '36%' },
  sparkRight: { right: 9, bottom: '29%', backgroundColor: colors.accent },
});
