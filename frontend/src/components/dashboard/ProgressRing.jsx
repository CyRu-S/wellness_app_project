import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import AnimatedNumber from '../common/AnimatedNumber';
import { colors, fonts } from '../../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function ProgressRing({ value = 72, label = 'complete', size = 124 }) {
  const [scale] = useState(() => new Animated.Value(0.82));
  const [progress] = useState(() => new Animated.Value(0));
  const strokeWidth = Math.max(9, size * 0.085);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = progress.interpolate({ inputRange: [0, 100], outputRange: [circumference, 0] });
  useEffect(() => {
    scale.setValue(0.92);
    progress.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, speed: 14, bounciness: 7, useNativeDriver: true }),
      Animated.timing(progress, { toValue: Math.max(0, Math.min(100, value)), duration: 950, useNativeDriver: false }),
    ]).start();
  }, [progress, scale, value]);
  return (
    <Animated.View style={[styles.motion, { width: size, height: size, transform: [{ scale }] }]} accessibilityLabel={`${value} percent ${label}`}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="progressStroke" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#8AE6D7" />
            <Stop offset="1" stopColor="#27C3B2" />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={radius} fill="rgba(7,59,58,0.34)" stroke="rgba(255,255,255,0.14)" strokeWidth={strokeWidth} />
        <AnimatedCircle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="url(#progressStroke)" strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={offset} rotation="-90" origin={`${size / 2}, ${size / 2}`} />
      </Svg>
      <View style={styles.cutout}>
          <Text style={styles.today}>TODAY</Text>
          <AnimatedNumber value={value} style={[styles.value, { fontSize: size * 0.23 }]} suffix="%" />
          <Text style={[styles.label, { fontSize: Math.max(9, size * 0.075) }]}>{label}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  motion: { alignItems: 'center', justifyContent: 'center' },
  cutout: { alignItems: 'center', justifyContent: 'center' },
  today: { color: '#A9D8D2', fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 1, marginBottom: 1 },
  value: { color: colors.white, fontFamily: fonts.bold, fontSize: 30, letterSpacing: -1 },
  label: { color: '#C8E8E2', fontFamily: fonts.medium, fontSize: 12, marginTop: 1 },
});
