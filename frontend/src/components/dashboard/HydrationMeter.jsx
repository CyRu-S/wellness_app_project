import React, { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, fonts, radius, type } from '../../theme';

function WaterSegment({ filled, index }) {
  const [motion] = useState(() => new Animated.Value(filled ? 1 : 0));
  useEffect(() => {
    Animated.spring(motion, { toValue: filled ? 1 : 0, delay: filled ? index * 22 : 0, speed: 18, bounciness: 6, useNativeDriver: true }).start();
  }, [filled, index, motion]);
  return <View style={styles.segment}><Animated.View style={[styles.fill, { opacity: motion, transform: [{ scaleY: motion }] }]} /></View>;
}

export default function HydrationMeter({ value, target, onAdd }) {
  const add = () => {
    Haptics.selectionAsync().catch(() => {});
    onAdd?.();
  };
  return (
    <View>
      <View style={styles.head}>
        <View><Text style={styles.eyebrow}>HYDRATION</Text><Text style={styles.title}>{value} of {target} glasses</Text></View>
        <Pressable accessibilityLabel="Add one glass of water" onPress={add} disabled={value >= target} style={({ pressed }) => [styles.add, pressed && styles.pressed, value >= target && styles.disabled]}>
          <Ionicons name={value >= target ? 'checkmark' : 'add'} size={18} color={colors.ink} /><Text style={styles.addText}>{value >= target ? 'Done' : 'Add glass'}</Text>
        </Pressable>
      </View>
      <View style={styles.track}>{Array.from({ length: target }).map((_, index) => <WaterSegment key={index} index={index} filled={index < value} />)}</View>
      <View style={styles.caption}><Ionicons name="water-outline" size={14} color={colors.tealMid} /><Text style={styles.hint}>{value >= target ? 'Daily target complete' : `${(target - value) * 250} ml remaining today`}</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, eyebrow: { ...type.label, color: colors.tealMid }, title: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 20, marginTop: 4 },
  add: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 40, borderRadius: radius.pill, backgroundColor: colors.accentSoft, paddingHorizontal: 13 }, pressed: { opacity: 0.62, transform: [{ scale: 0.97 }] }, disabled: { opacity: 0.58 }, addText: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 11 },
  track: { flexDirection: 'row', gap: 6, marginTop: 17 }, segment: { flex: 1, height: 14, borderRadius: 7, backgroundColor: colors.line, overflow: 'hidden', justifyContent: 'flex-end' }, fill: { ...StyleSheet.absoluteFillObject, borderRadius: 7, backgroundColor: colors.accent },
  caption: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 9 }, hint: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11 },
});
