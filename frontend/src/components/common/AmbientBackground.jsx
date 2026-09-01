import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../theme';

export default function AmbientBackground({ light = false }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.orb, styles.orbLarge, light && styles.orbLight]} />
      <View style={[styles.orb, styles.orbSmall, light && styles.orbLight]} />
      <View style={[styles.ring, styles.ringOne, light && styles.ringLight]} />
      <View style={[styles.ring, styles.ringTwo, light && styles.ringLight]} />
      <View style={[styles.rule, light && styles.ruleLight]} />
    </View>
  );
}

const styles = StyleSheet.create({
  orb: { position: 'absolute', borderRadius: 999, backgroundColor: colors.accent },
  orbLarge: { width: 330, height: 330, opacity: 0.11, right: -150, top: -105 },
  orbSmall: { width: 150, height: 150, opacity: 0.07, left: -76, bottom: 110 },
  orbLight: { backgroundColor: colors.tealMid, opacity: 0.06 },
  ring: { position: 'absolute', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  ringOne: { width: 270, height: 270, right: -72, top: 38 },
  ringTwo: { width: 390, height: 390, right: -130, top: -21 },
  ringLight: { borderColor: 'rgba(0,78,86,0.08)' },
  rule: { position: 'absolute', left: 24, top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.07)' },
  ruleLight: { backgroundColor: 'rgba(0,78,86,0.06)' },
});
