import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';

export default function MealRow({ meal, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.time}><Text style={styles.timeText}>{meal.time}</Text></View>
      <View style={styles.copy}>
        <Text style={styles.type}>{meal.type}</Text>
        <Text style={styles.name}>{meal.name}</Text>
        <Text style={styles.meta}>{meal.calories} kcal · {meal.protein}g protein</Text>
      </View>
      <Ionicons name="chevron-forward" size={19} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line, gap: 14 },
  pressed: { opacity: 0.55 },
  time: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  timeText: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 11 },
  copy: { flex: 1 },
  type: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.7 },
  name: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 16, marginTop: 2 },
  meta: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, marginTop: 3 },
});
