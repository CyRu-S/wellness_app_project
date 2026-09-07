import React, { useState, useEffect, useMemo } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import useReducedMotion from '../../hooks/useReducedMotion';
import { adminColors, adminFonts } from '../../theme/admin';

import { normalizeChartData } from '../../utils/chartData';

function Bar({ item, maxValue, progress, compact, valueSuffix }) {
  const targetHeight = (item.value / maxValue) * (compact ? 58 : 112);
  return (
    <View style={styles.column}>
      {!compact && <Text style={styles.value}>{item.value}{valueSuffix}</Text>}
      <View style={[styles.track, { height: compact ? 62 : 116 }]}>
        <Animated.View style={[styles.bar, { height: progress.interpolate({ inputRange: [0, 1], outputRange: [0, targetHeight] }) }]} />
      </View>
      <Text style={styles.label}>{item.label}</Text>
    </View>
  );
}

export default function AdminBarChart({
  data: rawData,
  label,
  compact = false,
  maxValue: maximum,
  valueUnit = 'percent',
  valueSuffix = '%',
}) {
  const data = useMemo(() => normalizeChartData(rawData), [rawData]);
  const reduceMotion = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));
  const maxValue = useMemo(() => Math.max(maximum || 0, ...data.map((item) => item.value), 1), [data, maximum]);
  const summary = data.map((item) => `${item.label}: ${item.value} ${valueUnit}`).join(', ');

  useEffect(() => {
    progress.setValue(reduceMotion ? 1 : 0);
    Animated.timing(progress, { toValue: 1, duration: reduceMotion ? 0 : 350, useNativeDriver: false }).start();
  }, [data, progress, reduceMotion]);

  if (!data.length) return <View style={styles.empty}><Text style={styles.label}>No data yet. The chart updates when meals are logged.</Text></View>;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={data.length > 7} contentContainerStyle={styles.scroll}>
    <View accessible accessibilityRole="image" accessibilityLabel={`${label}. ${summary}`} style={[styles.chart, { minWidth: data.length * 43 - 7 }, compact && styles.compact]}>
      {data.map((item, index) => <Bar key={`${item.label}-${index}`} item={item} maxValue={maxValue} progress={progress} compact={compact} valueSuffix={valueSuffix} />)}
    </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  empty: { minHeight: 150, justifyContent: 'center', alignItems: 'center', padding: 16 },
  chart: { flex: 1, minHeight: 150, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 7 },
  compact: { minHeight: 80 },
  column: { flex: 1, minWidth: 36, alignItems: 'center' },
  track: { width: '100%', maxWidth: 28, borderRadius: 9, justifyContent: 'flex-end', overflow: 'hidden', backgroundColor: adminColors.sageSoft },
  bar: { width: '100%', borderRadius: 9, backgroundColor: adminColors.teal },
  value: { marginBottom: 6, color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 11 },
  label: { marginTop: 6, color: adminColors.muted, fontFamily: adminFonts.medium, fontSize: 11, textAlign: 'center' },
});
