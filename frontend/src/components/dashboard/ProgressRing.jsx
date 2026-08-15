import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme';

export default function ProgressRing({ value = 72, label = 'complete' }) {
  return (
    <View style={styles.outer} accessibilityLabel={`${value} percent ${label}`}>
      <View style={styles.cutout}>
        <Text style={styles.value}>{value}%</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { width: 148, height: 148, borderRadius: 74, padding: 13, backgroundColor: colors.accent, borderWidth: 13, borderColor: colors.accentSoft },
  cutout: { flex: 1, borderRadius: 60, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  value: { color: colors.white, fontSize: 30, fontWeight: '800', letterSpacing: -1 },
  label: { color: '#C7D4CD', fontSize: 12, marginTop: 1 },
});

