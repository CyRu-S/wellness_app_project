import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';
import useReducedMotion from '../../hooks/useReducedMotion';
import { adminColors, adminFonts } from '../../theme/admin';

const CHART_HEIGHT = 126;
const TOP_GUTTER = 12;
const BOTTOM_GUTTER = 13;
const HORIZONTAL_GUTTER = 5;

function createPaths(data, width, maxValue) {
  if (!data.length || width <= 0) return { areaPath: '', linePath: '', points: [], peak: null };

  const plotHeight = CHART_HEIGHT - TOP_GUTTER - BOTTOM_GUTTER;
  const plotWidth = Math.max(0, width - HORIZONTAL_GUTTER * 2);
  const step = data.length > 1 ? plotWidth / (data.length - 1) : 0;
  const scaleMaximum = Math.max(maxValue, ...data.map((item) => item.value), 1);
  const points = data.map((item, index) => ({
    ...item,
    x: HORIZONTAL_GUTTER + index * step,
    y: TOP_GUTTER + plotHeight - (Math.max(0, Math.min(item.value, scaleMaximum)) / scaleMaximum) * plotHeight,
  }));

  let linePath = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const midpoint = (previous.x + current.x) / 2;
    linePath += ` C ${midpoint} ${previous.y}, ${midpoint} ${current.y}, ${current.x} ${current.y}`;
  }

  const baseline = CHART_HEIGHT - BOTTOM_GUTTER;
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`;
  const peak = points.reduce((highest, point) => (point.value > highest.value ? point : highest), points[0]);
  return { areaPath, linePath, points, peak };
}

export default function AdminMealRhythmChart({
  data,
  label,
  accessible = true,
  maxValue = 100,
  valueUnit = 'percent',
  valueSuffix = '%',
}) {
  const reduceMotion = useReducedMotion();
  const reveal = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const [width, setWidth] = useState(0);
  const chart = useMemo(() => createPaths(data, width, maxValue), [data, maxValue, width]);
  const summary = data.map((item) => `${item.label}: ${item.value} ${valueUnit}`).join(', ');

  useEffect(() => {
    reveal.setValue(reduceMotion ? 1 : 0);
    Animated.timing(reveal, {
      toValue: 1,
      duration: reduceMotion ? 120 : 340,
      useNativeDriver: true,
    }).start();
  }, [data, reduceMotion, reveal]);

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
                <SvgGradient id="mealRhythmFill" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={adminColors.teal} stopOpacity="0.28" />
                  <Stop offset="1" stopColor={adminColors.teal} stopOpacity="0.015" />
                </SvgGradient>
                <SvgGradient id="mealRhythmStroke" x1="0" y1="0" x2="1" y2="0">
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
              <Path d={chart.areaPath} fill="url(#mealRhythmFill)" />
              <Path d={chart.linePath} fill="none" stroke="url(#mealRhythmStroke)" strokeWidth="4" strokeLinecap="round" />
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
  wrap: { minHeight: CHART_HEIGHT + 27 },
  plot: { height: CHART_HEIGHT, marginHorizontal: 3 },
  peakBubble: { position: 'absolute', minWidth: 44, height: 27, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.deepTeal },
  peakText: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 12 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 1, marginTop: 4 },
  label: { minWidth: 24, color: adminColors.muted, fontFamily: adminFonts.medium, fontSize: 12, textAlign: 'center' },
});
