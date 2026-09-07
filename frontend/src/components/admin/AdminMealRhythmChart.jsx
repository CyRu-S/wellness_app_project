import React, { useEffect, useId, useMemo, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';
import useReducedMotion from '../../hooks/useReducedMotion';
import { adminColors, adminFonts } from '../../theme/admin';

import { normalizeChartData, createRhythmPaths } from '../../utils/chartData';

const CHART_HEIGHT = 126;
const TOP_GUTTER = 12;
const BOTTOM_GUTTER = 13;

export default function AdminMealRhythmChart({
  data: rawData,
  label,
  accessible = true,
  maxValue = 100,
  valueUnit = 'percent',
  valueSuffix = '%',
}) {
  const data = useMemo(() => normalizeChartData(rawData), [rawData]);
  const gradientId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const reduceMotion = useReducedMotion();
  const [reveal] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));
  const [width, setWidth] = useState(0);
  const chart = useMemo(() => createRhythmPaths(data, width, maxValue), [data, maxValue, width]);
  const summary = data.map((item) => `${item.label}: ${item.value} ${valueUnit}`).join(', ');

  useEffect(() => {
    reveal.setValue(reduceMotion ? 1 : 0);
    Animated.timing(reveal, {
      toValue: 1,
      duration: reduceMotion ? 120 : 340,
      useNativeDriver: true,
    }).start();
  }, [data, reduceMotion, reveal]);

  if (!data.length) return <View style={styles.empty}><Text style={styles.label}>No meal logs yet. Your chart will appear here.</Text></View>;

  return (
    <View
      accessible={accessible}
      accessibilityRole={accessible ? 'image' : undefined}
      accessibilityLabel={accessible ? `${label}. ${summary}` : undefined}
      style={styles.wrap}
    >
      <Animated.View
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={[
          styles.plot,
          {
            opacity: reveal,
            transform: [{ translateY: reduceMotion ? 0 : reveal.interpolate({ inputRange: [0, 1], outputRange: [7, 0] }) }],
          },
        ]}
      >
        {width > 0 && (
          <>
            <Svg width={width} height={CHART_HEIGHT} importantForAccessibility="no-hide-descendants">
              <Defs>
                <SvgGradient id={`mealRhythmFill${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={adminColors.teal} stopOpacity="0.28" />
                  <Stop offset="1" stopColor={adminColors.teal} stopOpacity="0.015" />
                </SvgGradient>
                <SvgGradient id={`mealRhythmStroke${gradientId}`} x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor={adminColors.deepTeal} />
                  <Stop offset="1" stopColor="#19AFB0" />
                </SvgGradient>
              </Defs>
              {[0.25, 0.5, 0.75].map((position) => (
                <Line
                  key={position}
                  x1="0"
                  x2={width}
                  y1={TOP_GUTTER + position * (CHART_HEIGHT - TOP_GUTTER - BOTTOM_GUTTER)}
                  y2={TOP_GUTTER + position * (CHART_HEIGHT - TOP_GUTTER - BOTTOM_GUTTER)}
                  stroke={adminColors.line}
                  strokeWidth="1"
                  strokeDasharray="3 6"
                />
              ))}
              <Path d={chart.areaPath} fill={`url(#mealRhythmFill${gradientId})`} />
              <Path d={chart.linePath} fill="none" stroke={`url(#mealRhythmStroke${gradientId})`} strokeWidth="4" strokeLinecap="round" />
              {chart.points.map((point, index) => (
                <Circle
                  key={`${point.label}-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r={point === chart.peak ? 5 : 3}
                  fill={point === chart.peak ? adminColors.surface : adminColors.teal}
                  stroke={adminColors.teal}
                  strokeWidth={point === chart.peak ? 3 : 1.5}
                />
              ))}
            </Svg>
            {chart.peak && (
              <View
                pointerEvents="none"
                style={[
                  styles.peakBubble,
                  {
                    left: Math.max(0, Math.min(width - 44, chart.peak.x - 22)),
                    top: Math.max(0, chart.peak.y - 35),
                  },
                ]}
              >
                <Text style={styles.peakText}>{chart.peak.value}{valueSuffix}</Text>
              </View>
            )}
          </>
        )}
      </Animated.View>
      <View style={styles.labels} importantForAccessibility="no-hide-descendants">
        {data.map((item, index) => <Text key={`${item.label}-${index}`} style={styles.label}>{item.label}</Text>)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { minHeight: CHART_HEIGHT + 27, justifyContent: 'center', alignItems: 'center', padding: 16 },
  wrap: { minHeight: CHART_HEIGHT + 27 },
  plot: { height: CHART_HEIGHT, marginHorizontal: 3 },
  peakBubble: { position: 'absolute', minWidth: 44, height: 27, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.deepTeal },
  peakText: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 12 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 1, marginTop: 4 },
  label: { minWidth: 24, color: adminColors.muted, fontFamily: adminFonts.medium, fontSize: 12, textAlign: 'center' },
});
