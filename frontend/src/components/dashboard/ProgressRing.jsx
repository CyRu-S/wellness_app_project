import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import AnimatedNumber from '../common/AnimatedNumber';
import { colors, fonts } from '../../theme';

export default function ProgressRing({ value = 72, label = 'complete' }) {
  const [scale] = useState(() => new Animated.Value(0.82));
  useEffect(() => {
    scale.setValue(0.92);
    Animated.spring(scale, { toValue: 1, speed: 14, bounciness: 7, useNativeDriver: true }).start();
  }, [scale, value]);
  return (
    <Animated.View style={[styles.motion, { transform: [{ scale }] }]}>
      <View style={styles.outer} accessibilityLabel={`${value} percent ${label}`}>
        <View style={styles.cutout}>
          <AnimatedNumber value={value} style={styles.value} suffix="%" />
          <Text style={styles.label}>{label}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  motion: { width: 148, height: 148 },
  outer: { width: 148, height: 148, borderRadius: 74, padding: 13, backgroundColor: colors.accent, borderWidth: 13, borderColor: '#6ED6DA' },
  cutout: { flex: 1, borderRadius: 60, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  value: { color: colors.white, fontFamily: fonts.bold, fontSize: 30, letterSpacing: -1 },
  label: { color: '#BCE6E7', fontFamily: fonts.regular, fontSize: 12, marginTop: 1 },
});
