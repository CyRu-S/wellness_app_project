import React from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, type } from '../../theme';

const fittedText = { maxFontSizeMultiplier: 1.15 };

export const getMealStatus = (meal) => {
  if (meal.consumed) return 'logged';
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  return currentHour > meal.hour + 0.75 ? 'overdue' : 'scheduled';
};

export default function MealSchedule({ items, onLog, compact = false, showPhotoAction = true, showType = true }) {
  const { fontScale } = useWindowDimensions();
  const platformCompact = Platform.OS === 'ios' || fontScale > 1.15;
  return (
    <View style={styles.list}>
      {items.map((meal, index) => {
        const status = getMealStatus(meal);
        return (
          <Pressable key={meal.id} disabled={!onLog} onPress={() => onLog?.(meal)} style={({ pressed }) => [styles.row, compact ? styles.compactRow : platformCompact && styles.platformRow, pressed && styles.pressed]}>
            <View style={styles.timeline}><View style={[styles.node, compact ? styles.compactNode : platformCompact && styles.platformNode, status === 'logged' && styles.nodeLogged, status === 'overdue' && styles.nodeOverdue]}>{status === 'logged' ? <Ionicons name="checkmark" size={12} color={colors.white} /> : null}</View>{index < items.length - 1 ? <View style={[styles.line, compact ? styles.compactLine : platformCompact && styles.platformLine]} /> : null}</View>
            <View style={[styles.timeBlock, compact && styles.compactTimeBlock]}><Text {...fittedText} style={[styles.time, platformCompact && styles.timeCompact]}>{meal.time}</Text>{showType ? <Text {...fittedText} style={[styles.type, platformCompact && styles.typeCompact]}>{meal.type.toUpperCase()}</Text> : null}</View>
            <View style={styles.copy}><Text {...fittedText} numberOfLines={1} style={[styles.name, platformCompact && styles.nameCompact]}>{meal.name}</Text><Text {...fittedText} numberOfLines={1} style={[styles.status, platformCompact && styles.statusCompact, status === 'overdue' && styles.overdue]}>{status === 'logged' ? `Uploaded ${meal.uploadedAt}` : status === 'overdue' ? 'Photo check-in overdue' : 'Awaiting check-in'}</Text></View>
            {status !== 'logged' ? showPhotoAction ? <View style={[styles.action, platformCompact && styles.actionCompact, status === 'overdue' && styles.actionOverdue]}><Ionicons name="camera-outline" size={17} color={status === 'overdue' ? colors.white : colors.tealDark} /></View> : <Ionicons name={status === 'overdue' ? 'alert-circle-outline' : 'time-outline'} size={20} color={status === 'overdue' ? colors.danger : colors.muted} /> : <Ionicons name="checkmark-circle" size={20} color={colors.tealMid} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: 12 }, row: { minHeight: 90, flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }, compactRow: { minHeight: 74, paddingVertical: 6 }, pressed: { opacity: 0.62 },
  platformRow: { minHeight: 84, paddingVertical: 8 },
  timeline: { width: 27, alignSelf: 'stretch', alignItems: 'center' }, node: { zIndex: 2, width: 18, height: 18, borderRadius: 9, marginTop: 26, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }, compactNode: { marginTop: 21 }, platformNode: { marginTop: 25 }, nodeLogged: { backgroundColor: colors.tealMid, borderColor: colors.tealMid }, nodeOverdue: { borderColor: colors.danger }, line: { position: 'absolute', top: 44, bottom: -36, width: 1, backgroundColor: colors.line }, compactLine: { top: 39, bottom: -29 }, platformLine: { top: 43, bottom: -32 },
  timeBlock: { width: 78, alignSelf: 'stretch', justifyContent: 'center', paddingLeft: 7 }, compactTimeBlock: { width: 72, paddingLeft: 5 }, time: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 }, type: { ...type.label, color: colors.muted, fontSize: 11, letterSpacing: 0.8, marginTop: 5 }, copy: { flex: 1, minWidth: 0, justifyContent: 'center', paddingHorizontal: 7 }, name: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 }, status: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 18, marginTop: 6 }, overdue: { color: colors.danger, fontFamily: fonts.semibold },
  timeCompact: { fontSize: 13, lineHeight: 18 }, typeCompact: { fontSize: 10, lineHeight: 14, marginTop: 4 }, nameCompact: { fontSize: 15, lineHeight: 20 }, statusCompact: { fontSize: 11, lineHeight: 16, marginTop: 5 },
  action: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, actionOverdue: { backgroundColor: colors.danger },
  actionCompact: { width: 38, height: 38 },
});
