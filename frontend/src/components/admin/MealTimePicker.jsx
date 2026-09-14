import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { adminColors, adminFonts } from '../../theme/admin';

const CLOCK = /^(0?[1-9]|1[0-2]):([0-5]\d)\s?(AM|PM)$/i;
export function parseMealTime(value) {
  const match = String(value || '').trim().match(CLOCK);
  return match ? { hour: Number(match[1]), minute: Number(match[2]), period: match[3].toUpperCase() }
    : { hour: 8, minute: 0, period: 'AM' };
}

function Column({ label, values, selected, onSelect }) {
  return <View style={styles.column}>
    <Text style={styles.columnLabel}>{label}</Text>
    <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled contentContainerStyle={styles.options}>
      {values.map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: value === selected }}
        onPress={() => onSelect(value)} style={[styles.option, value === selected && styles.selected]}>
        <Text style={[styles.optionText, value === selected && styles.selectedText]}>{value}</Text>
      </Pressable>)}
    </ScrollView>
  </View>;
}

export default function MealTimePicker({ value, onCancel, onConfirm }) {
  const initial = parseMealTime(value);
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [period, setPeriod] = useState(initial.period);
  return <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
    <View style={styles.backdrop}>
      <View style={styles.sheet}>
        <Text style={styles.title}>Choose meal time</Text>
        <Text style={styles.preview}>{hour}:{String(minute).padStart(2, '0')} {period}</Text>
        <View style={styles.columns}>
          <Column label="HOUR" values={Array.from({ length: 12 }, (_, i) => i + 1)} selected={hour} onSelect={setHour} />
          <Column label="MINUTE" values={Array.from({ length: 60 }, (_, i) => i)} selected={minute} onSelect={setMinute} />
          <Column label="AM / PM" values={['AM', 'PM']} selected={period} onSelect={setPeriod} />
        </View>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={onCancel} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => onConfirm(`${hour}:${String(minute).padStart(2, '0')} ${period}`)} style={styles.confirm}><Text style={styles.confirmText}>Set time</Text></Pressable>
        </View>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0, 25, 28, 0.62)' },
  sheet: { padding: 20, borderRadius: 24, backgroundColor: adminColors.surface },
  title: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 21 },
  preview: { alignSelf: 'center', color: adminColors.deepTeal, fontFamily: adminFonts.semibold, fontSize: 30, marginVertical: 14 },
  columns: { flexDirection: 'row', gap: 8, height: 240 },
  column: { flex: 1, minWidth: 0 },
  columnLabel: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 11, textAlign: 'center', marginBottom: 6 },
  options: { paddingBottom: 8 },
  option: { height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 11 },
  selected: { backgroundColor: adminColors.aqua },
  optionText: { color: adminColors.muted, fontFamily: adminFonts.medium, fontSize: 14 },
  selectedText: { color: adminColors.deepTeal, fontFamily: adminFonts.semibold },
  actions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  cancel: { flex: 1, height: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: adminColors.line },
  cancelText: { color: adminColors.muted, fontFamily: adminFonts.semibold },
  confirm: { flex: 1, height: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 14, backgroundColor: adminColors.teal },
  confirmText: { color: adminColors.white, fontFamily: adminFonts.semibold },
});
