import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, type } from '../../theme';

export const getMealStatus = (meal) => {
  if (meal.consumed) return 'logged';
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  return currentHour > meal.hour + 0.75 ? 'overdue' : 'scheduled';
};

export default function MealSchedule({ items, onLog, compact = false, showPhotoAction = true, showType = true }) {
  return (
    <View style={styles.list}>
      {items.map((meal, index) => {
        const status = getMealStatus(meal);
        return (
          <Pressable key={meal.id} disabled={!onLog} onPress={() => onLog?.(meal)} style={({ pressed }) => [styles.row, compact && styles.compactRow, pressed && styles.pressed]}>
            <View style={styles.timeline}><View style={[styles.node, status === 'logged' && styles.nodeLogged, status === 'overdue' && styles.nodeOverdue]}>{status === 'logged' ? <Ionicons name="checkmark" size={12} color={colors.white} /> : null}</View>{index < items.length - 1 ? <View style={styles.line} /> : null}</View>
            <View style={styles.timeBlock}><Text style={styles.time}>{meal.time}</Text>{showType ? <Text style={styles.type}>{meal.type.toUpperCase()}</Text> : null}</View>
            <View style={styles.copy}><Text numberOfLines={1} style={styles.name}>{meal.name}</Text><Text style={[styles.status, status === 'overdue' && styles.overdue]}>{status === 'logged' ? `Uploaded ${meal.uploadedAt}` : status === 'overdue' ? 'Photo check-in overdue' : 'Awaiting check-in'}</Text></View>
            {status !== 'logged' ? showPhotoAction ? <View style={[styles.action, status === 'overdue' && styles.actionOverdue]}><Ionicons name="camera-outline" size={17} color={status === 'overdue' ? colors.white : colors.tealDark} /></View> : <Ionicons name={status === 'overdue' ? 'alert-circle-outline' : 'time-outline'} size={20} color={status === 'overdue' ? colors.danger : colors.muted} /> : <Ionicons name="checkmark-circle" size={20} color={colors.tealMid} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: 8 }, row: { minHeight: 76, flexDirection: 'row', alignItems: 'center' }, compactRow: { minHeight: 68 }, pressed: { opacity: 0.62 },
  timeline: { width: 25, alignSelf: 'stretch', alignItems: 'center' }, node: { zIndex: 2, width: 17, height: 17, borderRadius: 9, marginTop: 28, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }, nodeLogged: { backgroundColor: colors.tealMid, borderColor: colors.tealMid }, nodeOverdue: { borderColor: colors.danger }, line: { position: 'absolute', top: 44, bottom: -29, width: 1, backgroundColor: colors.line },
  timeBlock: { width: 68, paddingLeft: 5 }, time: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 12 }, type: { ...type.label, color: colors.muted, fontSize: 7, letterSpacing: 0.9, marginTop: 3 }, copy: { flex: 1, paddingRight: 7 }, name: { color: colors.ink, fontFamily: fonts.medium, fontSize: 14 }, status: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10, marginTop: 4 }, overdue: { color: colors.danger, fontFamily: fonts.medium },
  action: { width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, actionOverdue: { backgroundColor: colors.danger },
});
