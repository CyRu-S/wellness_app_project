import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import StaggeredView from '../../components/auth/StaggeredView';
import Screen from '../../components/common/Screen';
import MealSchedule, { getMealStatus } from '../../components/meal/MealSchedule';
import UserHeader from '../../components/user/UserHeader';
import { colors, fonts, radius, shadows, type } from '../../theme';

export default function MealLogScreen({ navigation }) {
  const meals = useSelector((state) => state.meals);
  const remaining = meals.items.filter((meal) => !meal.consumed).length;
  const openCamera = (meal) => navigation.navigate('MealCapture', { category: 'meal', targetMealId: meal.id });

  return (
    <Screen>
      <UserHeader navigation={navigation} />
      <StaggeredView delay={40} style={styles.head}>
        <Text style={styles.kicker}>PHOTO CHECK-IN</Text>
        <Text style={styles.title}>Today’s timeline</Text>
        <Text style={styles.body}>Take a photo from the correct time slot. No category selection is needed.</Text>
      </StaggeredView>

      <StaggeredView delay={115} style={styles.status}>
        <View style={styles.statusIcon}><Ionicons name="notifications-outline" size={20} color={colors.tealDark} /></View>
        <View style={styles.statusCopy}><Text style={styles.statusLabel}>AUTOMATIC REMINDERS</Text><Text style={styles.statusText}>Check-ins follow the times assigned by {meals.consultant}.</Text></View>
        <View style={styles.live}><View style={styles.liveDot} /><Text style={styles.liveText}>ON</Text></View>
      </StaggeredView>

      <StaggeredView delay={190} style={styles.timeline}>
        <View style={styles.timelineHead}><View><Text style={styles.timelineLabel}>DAILY SCHEDULE</Text><Text style={styles.timelineTitle}>{meals.planName}</Text></View><Text style={styles.remaining}>{remaining} left</Text></View>
        <MealSchedule items={meals.items} showType={false} onLog={(meal) => getMealStatus(meal) !== 'logged' && openCamera(meal)} />
      </StaggeredView>

      <StaggeredView delay={270} style={styles.note}>
        <Ionicons name="camera-outline" size={20} color={colors.tealDark} />
        <View style={styles.noteCopy}><Text style={styles.noteTitle}>Photos are taken only from Log</Text><Text style={styles.noteText}>Tap the camera beside the matching time. Completed slots remain checked on your dashboard.</Text></View>
      </StaggeredView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { marginTop: 24 }, kicker: { ...type.label, color: colors.tealMid }, title: { ...type.display, color: colors.ink, marginTop: 6 }, body: { ...type.body, color: colors.muted, marginTop: 7, maxWidth: 340 },
  status: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 23, paddingHorizontal: 14, backgroundColor: colors.accentSoft, borderRadius: radius.md }, statusIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }, statusCopy: { flex: 1 }, statusLabel: { ...type.label, color: colors.tealDark, fontSize: 7 }, statusText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10, lineHeight: 14, marginTop: 3 }, live: { flexDirection: 'row', alignItems: 'center', gap: 4 }, liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.tealMid }, liveText: { ...type.label, color: colors.tealMid, fontSize: 7 },
  timeline: { marginTop: 29 }, timelineHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line }, timelineLabel: { ...type.label, color: colors.muted, fontSize: 8 }, timelineTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 18, marginTop: 4 }, remaining: { color: colors.tealMid, fontFamily: fonts.semibold, fontSize: 11 },
  note: { flexDirection: 'row', gap: 12, marginTop: 28, padding: 17, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, ...shadows.soft }, noteCopy: { flex: 1 }, noteTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 12 }, noteText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10, lineHeight: 15, marginTop: 3 },
});
