import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import useReducedMotion from '../../hooks/useReducedMotion';
import { adminColors, adminFonts } from '../../theme/admin';

function Bar({ item, maxValue, progress, compact, valueSuffix }) {
  const targetHeight = Math.max(8, (item.value / maxValue) * (compact ? 58 : 112));
  return (
    <View style={styles.column}>
      {!compact && <Text style={styles.value}>{item.value}{valueSuffix}</Text>}
      <View style={[styles.track, { height: compact ? 62 : 116 }]}>
        <Animated.View style={[styles.bar, { height: progress.interpolate({ inputRange: [0, 1], outputRange: [4, targetHeight] }) }]} />
      </View>
      <Text style={styles.label}>{item.label}</Text>
    </View>
  );
}

export default function AdminBarChart({
  data,
  label,
  compact = false,
  maxValue: maximum,
  valueUnit = 'percent',
  valueSuffix = '%',
}) {
  const reduceMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const maxValue = useMemo(() => Math.max(maximum || 0, ...data.map((item) => item.value), 1), [data, maximum]);
  const summary = data.map((item) => `${item.label}: ${item.value} ${valueUnit}`).join(', ');

  useEffect(() => {
    progress.setValue(reduceMotion ? 1 : 0);
    Animated.timing(progress, { toValue: 1, duration: reduceMotion ? 0 : 350, useNativeDriver: false }).start();
  }, [data, progress, reduceMotion]);

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`${label}. ${summary}`} style={[styles.chart, compact && styles.compact]}>
      {data.map((item, index) => <Bar key={`${item.label}-${index}`} item={item} maxValue={maxValue} progress={progress} compact={compact} valueSuffix={valueSuffix} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { minHeight: 150, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 7 },
  compact: { minHeight: 80 },
  column: { flex: 1, alignItems: 'center' },
  track: { width: '100%', maxWidth: 28, borderRadius: 9, justifyContent: 'flex-end', overflow: 'hidden', backgroundColor: adminColors.sageSoft },
  bar: { width: '100%', borderRadius: 9, backgroundColor: adminColors.teal },
  value: { marginBottom: 6, color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 11 },
  label: { marginTop: 6, color: adminColors.muted, fontFamily: adminFonts.medium, fontSize: 11 },
});
