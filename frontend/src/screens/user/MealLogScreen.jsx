import React from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import StaggeredView from '../../components/auth/StaggeredView';
import Screen from '../../components/common/Screen';
import MealSchedule, { getMealStatus } from '../../components/meal/MealSchedule';
import UserHeader from '../../components/user/UserHeader';
import { colors, fonts, radius, shadows, type } from '../../theme';

const fittedText = { maxFontSizeMultiplier: 1.15 };

export default function MealLogScreen({ navigation }) {
  const meals = useSelector((state) => state.meals);
  const remindersEnabled = useSelector((state) => state.notifications.timelineRemindersEnabled);
  const { fontScale } = useWindowDimensions();
  const compactLayout = Platform.OS === 'ios' || fontScale > 1.15;
  const remaining = meals.items.filter((meal) => !meal.consumed).length;
  const openCamera = (meal) => navigation.navigate('MealCapture', { category: 'meal', targetMealId: meal.id });

  return (
    <Screen>
      <UserHeader navigation={navigation} />
      <StaggeredView delay={40} style={[styles.head, compactLayout && styles.headCompact]}>
        <Text {...fittedText} style={styles.kicker}>PHOTO CHECK-IN</Text>
        <Text {...fittedText} style={[styles.title, compactLayout && styles.titleCompact]}>Today’s timeline</Text>
      </StaggeredView>

      <StaggeredView delay={115} style={[styles.status, compactLayout && styles.statusCompact]}>
        <View style={styles.statusIcon}><Ionicons name="notifications-outline" size={20} color={colors.tealDark} /></View>
        <View style={styles.statusCopy}><Text {...fittedText} style={styles.statusLabel}>AUTOMATIC REMINDERS</Text><Text {...fittedText} style={[styles.statusText, compactLayout && styles.statusTextCompact]}>{remindersEnabled ? `Check-ins follow the times assigned by ${meals.consultant}.` : 'Timeline prompts are currently turned off in Profile.'}</Text></View>
        <View style={[styles.live, !remindersEnabled && styles.liveOff]}><View style={[styles.liveDot, !remindersEnabled && styles.liveDotOff]} /><Text {...fittedText} style={[styles.liveText, !remindersEnabled && styles.liveTextOff]}>{remindersEnabled ? 'ON' : 'OFF'}</Text></View>
      </StaggeredView>

      <StaggeredView delay={190} style={[styles.timeline, compactLayout && styles.timelineCompact]}>
        <View style={styles.timelineHead}><View style={styles.timelineCopy}><Text {...fittedText} style={styles.timelineLabel}>DAILY SCHEDULE</Text><Text {...fittedText} style={[styles.timelineTitle, compactLayout && styles.timelineTitleCompact]}>{meals.planName}</Text></View><Text {...fittedText} style={styles.remaining}>{remaining} left</Text></View>
        <MealSchedule items={meals.items} showType={false} onLog={(meal) => getMealStatus(meal) !== 'logged' && openCamera(meal)} />
      </StaggeredView>

      <StaggeredView delay={270} style={[styles.note, compactLayout && styles.noteCompact]}>
        <Ionicons name="camera-outline" size={20} color={colors.tealDark} />
        <View style={styles.noteCopy}><Text {...fittedText} style={styles.noteTitle}>Photos are taken only from Log</Text><Text {...fittedText} style={[styles.noteText, compactLayout && styles.noteTextCompact]}>Tap the camera beside the matching time. Completed slots remain checked on your dashboard.</Text></View>
      </StaggeredView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { marginTop: 26 }, kicker: { ...type.label, color: colors.tealMid }, title: { ...type.display, color: colors.ink, marginTop: 9 },
  headCompact: { marginTop: 22 }, titleCompact: { fontSize: 38, lineHeight: 41, letterSpacing: -1.4 },
  status: { minHeight: 96, flexDirection: 'row', alignItems: 'center', gap: 13, marginTop: 27, paddingHorizontal: 15, paddingVertical: 15, backgroundColor: colors.accentSoft, borderRadius: radius.md }, statusIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }, statusCopy: { flex: 1, minWidth: 0 }, statusLabel: { ...type.label, color: colors.tealDark, fontSize: 11 }, statusText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 18, marginTop: 6 }, live: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.surface }, liveOff: { backgroundColor: colors.mist }, liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.tealMid }, liveDotOff: { backgroundColor: colors.muted }, liveText: { color: colors.tealMid, fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 0.7 }, liveTextOff: { color: colors.muted },
  statusCompact: { minHeight: 90, marginTop: 23, paddingVertical: 12 }, statusTextCompact: { fontSize: 11, lineHeight: 16, marginTop: 5 },
  timeline: { marginTop: 34 }, timelineHead: { minHeight: 67, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line }, timelineCopy: { flex: 1, minWidth: 0 }, timelineLabel: { ...type.label, color: colors.muted, fontSize: 11 }, timelineTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 20, lineHeight: 26, marginTop: 6 }, remaining: { color: colors.tealDark, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 17, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.accentSoft },
  timelineCompact: { marginTop: 29 }, timelineTitleCompact: { fontSize: 18, lineHeight: 23, marginTop: 5 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 13, marginTop: 33, padding: 18, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, ...shadows.soft }, noteCopy: { flex: 1, minWidth: 0 }, noteTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 }, noteText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 19, marginTop: 6 },
  noteCompact: { marginTop: 28, padding: 16 }, noteTextCompact: { fontSize: 11, lineHeight: 17, marginTop: 5 },
});
