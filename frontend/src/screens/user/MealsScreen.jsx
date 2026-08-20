import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import StaggeredView from '../../components/auth/StaggeredView';
import AmbientBackground from '../../components/common/AmbientBackground';
import MealSchedule, { getMealStatus } from '../../components/meal/MealSchedule';
import Screen from '../../components/common/Screen';
import { colors, fonts, radius, type } from '../../theme';

export default function MealsScreen({ navigation }) {
  const meals = useSelector((state) => state.meals);
  const overdue = meals.items.filter((meal) => getMealStatus(meal) === 'overdue');
  const logged = meals.items.filter((meal) => meal.consumed).length;
  const openMeal = (meal) => meal.consumed ? navigation.navigate('MealDetails', { mealId: meal.id }) : navigation.navigate('MealCapture', { category: 'meal', targetMealId: meal.id });
  return (
    <Screen>
      <StaggeredView delay={35} style={styles.head}><Text style={styles.kicker}>PERSONALISED NUTRITION</Text><Text style={styles.title}>Meal sheet</Text><Text style={styles.body}>Your assigned meals, times, and photo check-ins in one place.</Text></StaggeredView>
      <StaggeredView delay={110} style={styles.summary}>
        <AmbientBackground />
        <View style={styles.summaryTop}><View><Text style={styles.summaryLabel}>CURRENT PLAN</Text><Text style={styles.summaryTitle}>{meals.planName}</Text><Text style={styles.coach}>Assigned by {meals.consultant}</Text></View><Text style={styles.count}>{logged}/{meals.items.length}</Text></View>
        <View style={styles.progress}><View style={[styles.progressFill, { width: `${(logged / meals.items.length) * 100}%` }]} /></View>
        <View style={styles.summaryFoot}><Text style={styles.summaryMeta}>{overdue.length ? `${overdue.length} overdue check-in${overdue.length > 1 ? 's' : ''}` : 'All check-ins are on time'}</Text><Pressable onPress={() => navigation.navigate('MealLog')} style={styles.logButton}><Ionicons name="add" size={17} color={colors.ink} /><Text style={styles.logButtonText}>Log entry</Text></Pressable></View>
      </StaggeredView>
      {overdue.length ? <StaggeredView delay={150} style={styles.alert}><Ionicons name="alert-circle-outline" size={19} color={colors.danger} /><View style={styles.alertCopy}><Text style={styles.alertTitle}>{overdue[0].type} photo is overdue</Text><Text style={styles.alertText}>Scheduled for {overdue[0].time}. Upload now or add a note.</Text></View><Pressable onPress={() => openMeal(overdue[0])}><Ionicons name="camera" size={18} color={colors.danger} /></Pressable></StaggeredView> : null}
      <StaggeredView delay={210} style={styles.schedule}><View style={styles.scheduleHead}><Text style={styles.scheduleLabel}>TODAY’S SCHEDULE</Text><Text style={styles.scheduleDate}>{new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).toUpperCase()}</Text></View><MealSchedule items={meals.items} onLog={openMeal} /></StaggeredView>
      {meals.uploads.length ? <StaggeredView delay={270} style={styles.uploads}><Text style={styles.uploadLabel}>RECENTLY ANALYSED</Text>{meals.uploads.slice(0, 3).map((item) => <View key={item.id} style={styles.uploadRow}><View style={styles.uploadIcon}><Ionicons name="sparkles-outline" size={19} color={colors.tealDark} /></View><View style={styles.uploadCopy}><Text style={styles.uploadName}>{item.name}</Text><Text style={styles.uploadMeta}>{item.loggedAt} · {item.calories} kcal · {item.protein}g protein</Text></View><Ionicons name="checkmark-circle" size={19} color={colors.tealMid} /></View>)}</StaggeredView> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { marginTop: 18 }, kicker: { ...type.label, color: colors.tealMid }, title: { ...type.display, color: colors.ink, marginTop: 6 }, body: { ...type.body, color: colors.muted, marginTop: 7, maxWidth: 340 },
  summary: { minHeight: 180, backgroundColor: colors.ink, borderRadius: radius.lg, marginTop: 24, padding: 21, overflow: 'hidden' }, summaryTop: { flexDirection: 'row', justifyContent: 'space-between' }, summaryLabel: { ...type.label, color: '#8DC3C5', fontSize: 8 }, summaryTitle: { color: colors.white, fontFamily: fonts.semibold, fontSize: 21, marginTop: 5 }, coach: { color: '#9BBFC1', fontFamily: fonts.regular, fontSize: 11, marginTop: 4 }, count: { color: colors.accent, fontFamily: fonts.semibold, fontSize: 28 }, progress: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.12)', marginTop: 21, overflow: 'hidden' }, progressFill: { height: 6, borderRadius: 3, backgroundColor: colors.accent }, summaryFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 17 }, summaryMeta: { color: '#A8C7C9', fontFamily: fonts.regular, fontSize: 10 }, logButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.accent, borderRadius: radius.pill, paddingVertical: 9, paddingHorizontal: 12 }, logButtonText: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 10 },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF4F2', borderRadius: radius.md, padding: 14, marginTop: 14 }, alertCopy: { flex: 1 }, alertTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 12 }, alertText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 9, marginTop: 3 },
  schedule: { marginTop: 27 }, scheduleHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 4 }, scheduleLabel: { ...type.label, color: colors.muted, fontSize: 8 }, scheduleDate: { ...type.label, color: colors.tealMid, fontSize: 8 },
  uploads: { marginTop: 28 }, uploadLabel: { ...type.label, color: colors.muted, fontSize: 8, marginBottom: 5 }, uploadRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line }, uploadIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, uploadCopy: { flex: 1 }, uploadName: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 13 }, uploadMeta: { color: colors.muted, fontFamily: fonts.regular, fontSize: 9, marginTop: 3 },
});
