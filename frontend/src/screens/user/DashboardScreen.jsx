import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import StaggeredView from '../../components/auth/StaggeredView';
import AmbientBackground from '../../components/common/AmbientBackground';
import AnimatedNumber from '../../components/common/AnimatedNumber';
import BrandMark from '../../components/common/BrandMark';
import Screen from '../../components/common/Screen';
import HydrationMeter from '../../components/dashboard/HydrationMeter';
import ProgressRing from '../../components/dashboard/ProgressRing';
import MealSchedule, { getMealStatus } from '../../components/meal/MealSchedule';
import { drinkWater } from '../../store/slices/dashboardSlice';
import { colors, fonts, radius, shadows, type } from '../../theme';

const dayLabel = () => new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' }).toUpperCase();
const greeting = () => { const hour = new Date().getHours(); return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'; };

export default function DashboardScreen({ navigation }) {
  const user = useSelector((state) => state.auth.user);
  const dashboard = useSelector((state) => state.dashboard);
  const meals = useSelector((state) => state.meals);
  const activity = useSelector((state) => state.activity);
  const dispatch = useDispatch();
  const firstName = user?.name?.split(' ')[0] || 'there';
  const overdue = meals.items.filter((meal) => getMealStatus(meal) === 'overdue');
  const nextMeal = meals.items.find((meal) => !meal.consumed);
  const latestActivity = dashboard.lastActivity || activity.history[0];

  const logMeal = (meal = nextMeal) => navigation.navigate('MealCapture', { category: 'meal', targetMealId: meal?.id });

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.brandRow}><BrandMark /><Pressable accessibilityLabel="Open notifications" onPress={() => navigation.navigate('Notifications')} style={({ pressed }) => [styles.icon, pressed && styles.pressed]}><Ionicons name="notifications-outline" size={21} color={colors.ink} /><View style={styles.dot} /></Pressable></View>

      <StaggeredView delay={40} style={styles.intro}>
        <Text style={styles.date}>{dayLabel()}</Text>
        <Text style={styles.greeting}>{greeting()}, <Text style={styles.name}>{firstName}.</Text></Text>
        <Text style={styles.introCopy}>Here is your live plan status for today.</Text>
      </StaggeredView>

      <StaggeredView delay={110} style={styles.balance}>
        <AmbientBackground />
        <View style={styles.balanceTop}><View><Text style={styles.balanceLabel}>TODAY’S NUTRITION BALANCE</Text><Text style={styles.balanceTitle}>On plan</Text></View><View style={styles.sync}><View style={styles.syncDot} /><Text style={styles.syncText}>LIVE</Text></View></View>
        <View style={styles.balanceBody}>
          <View style={styles.energy}><AnimatedNumber value={dashboard.calories} style={styles.energyValue} /><Text style={styles.energyUnit}>of 1,900 kcal</Text><View style={styles.macroLine}><Text style={styles.macroStrong}>{dashboard.protein}g</Text><Text style={styles.macroCopy}> protein logged</Text></View></View>
          <ProgressRing value={dashboard.completion} label="complete" />
        </View>
        <View style={styles.balanceActions}><Pressable onPress={() => navigation.navigate('MealLog')} style={styles.primaryAction}><Ionicons name="add" size={18} color={colors.ink} /><Text style={styles.primaryActionText}>Log meal</Text></Pressable><Pressable onPress={() => navigation.navigate('Meals')} style={styles.textAction}><Text style={styles.textActionText}>Nutrition details</Text><Ionicons name="arrow-forward" size={15} color={colors.accent} /></Pressable></View>
      </StaggeredView>

      {dashboard.lastMeal ? <StaggeredView delay={40} style={styles.success}><View style={styles.successIcon}><Ionicons name="checkmark" size={17} color={colors.white} /></View><View style={styles.successCopy}><Text style={styles.successTitle}>{dashboard.lastMeal.name} added</Text><Text style={styles.successMeta}>+{dashboard.lastMeal.calories} kcal · Dashboard updated now</Text></View><Ionicons name="sparkles-outline" size={18} color={colors.tealMid} /></StaggeredView> : null}
      {overdue.length ? <StaggeredView delay={170} style={styles.alert}><Ionicons name="alert-circle" size={20} color={colors.danger} /><View style={styles.alertCopy}><Text style={styles.alertTitle}>{overdue.length} meal check-in{overdue.length > 1 ? 's' : ''} overdue</Text><Text style={styles.alertMeta}>Upload a photo to keep your plan record complete.</Text></View><Pressable onPress={() => logMeal(overdue[0])}><Text style={styles.alertAction}>Log now</Text></Pressable></StaggeredView> : null}

      <StaggeredView delay={210} style={styles.section}>
        <View style={styles.sectionHead}><View><Text style={styles.eyebrow}>PERSONALISED MEAL SHEET</Text><Text style={styles.sectionTitle}>{meals.planName}</Text><Text style={styles.sectionMeta}>Assigned by {meals.consultant}</Text></View><Pressable onPress={() => navigation.navigate('Meals')}><Text style={styles.allLink}>View all</Text></Pressable></View>
        <MealSchedule items={meals.items} compact onLog={(meal) => getMealStatus(meal) !== 'logged' && logMeal(meal)} />
      </StaggeredView>

      <StaggeredView delay={290} style={styles.section}><HydrationMeter value={dashboard.waterGlasses} target={dashboard.waterTarget} onAdd={() => dispatch(drinkWater())} /></StaggeredView>

      <StaggeredView delay={360} style={styles.section}>
        <View style={styles.sectionHead}><View><Text style={styles.eyebrow}>MOVEMENT</Text><Text style={styles.sectionTitle}>Today’s activity</Text></View><Pressable onPress={() => navigation.navigate('Move')}><Text style={styles.allLink}>Start timer</Text></Pressable></View>
        <View style={styles.activitySummary}><View style={styles.activityIcon}><Ionicons name="walk" size={24} color={colors.tealDark} /></View><View style={styles.activityCopy}><Text style={styles.activityName}>{latestActivity?.activity || 'No activity logged'}</Text><Text style={styles.activityMeta}>{latestActivity ? `${latestActivity.minutes} min · ${latestActivity.calories} kcal burned` : 'Start a guided activity to update this section'}</Text></View><View><AnimatedNumber value={dashboard.activeMinutes} style={styles.activityValue} suffix="m" /><Text style={styles.activityLabel}>TODAY</Text></View></View>
      </StaggeredView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 20 }, brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 }, icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadows.soft }, dot: { position: 'absolute', top: 10, right: 10, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent, borderWidth: 1.5, borderColor: colors.surface }, pressed: { opacity: 0.65 },
  intro: { marginTop: 26 }, date: { ...type.label, color: colors.tealMid }, greeting: { color: colors.ink, fontFamily: fonts.regular, fontSize: 29, lineHeight: 34, letterSpacing: -0.9, marginTop: 6 }, name: { fontFamily: fonts.semibold }, introCopy: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, marginTop: 5 },
  balance: { minHeight: 282, backgroundColor: colors.ink, borderRadius: radius.lg, marginTop: 22, padding: 21, overflow: 'hidden', ...shadows.raised }, balanceTop: { flexDirection: 'row', justifyContent: 'space-between' }, balanceLabel: { ...type.label, color: '#8FC6C8', fontSize: 8 }, balanceTitle: { color: colors.white, fontFamily: fonts.semibold, fontSize: 23, marginTop: 4 }, sync: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.08)', paddingVertical: 6, paddingHorizontal: 9, alignSelf: 'flex-start' }, syncDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }, syncText: { ...type.label, color: '#A9D7D9', fontSize: 7 },
  balanceBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }, energy: { flex: 1 }, energyValue: { color: colors.white, fontFamily: fonts.semibold, fontSize: 39, letterSpacing: -1.4 }, energyUnit: { color: '#9BBFC1', fontFamily: fonts.regular, fontSize: 12, marginTop: 1 }, macroLine: { flexDirection: 'row', marginTop: 14 }, macroStrong: { color: colors.accent, fontFamily: fonts.semibold, fontSize: 13 }, macroCopy: { color: '#9BBFC1', fontFamily: fonts.regular, fontSize: 12 },
  balanceActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 13 }, primaryAction: { minHeight: 41, borderRadius: radius.pill, backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14 }, primaryActionText: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 11 }, textAction: { flexDirection: 'row', alignItems: 'center', gap: 6 }, textActionText: { color: colors.accent, fontFamily: fonts.medium, fontSize: 11 },
  success: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.accentSoft, borderRadius: radius.md, padding: 14, marginTop: 14 }, successIcon: { width: 29, height: 29, borderRadius: 15, backgroundColor: colors.tealMid, alignItems: 'center', justifyContent: 'center' }, successCopy: { flex: 1 }, successTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 13 }, successMeta: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10, marginTop: 3 },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 10, borderLeftWidth: 3, borderLeftColor: colors.danger, backgroundColor: '#FFF4F2', borderRadius: radius.sm, padding: 13, marginTop: 14 }, alertCopy: { flex: 1 }, alertTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 12 }, alertMeta: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10, lineHeight: 14, marginTop: 2 }, alertAction: { color: colors.danger, fontFamily: fonts.semibold, fontSize: 11 },
  section: { marginTop: 30 }, sectionHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }, eyebrow: { ...type.label, color: colors.tealMid, fontSize: 8 }, sectionTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 20, marginTop: 4 }, sectionMeta: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10, marginTop: 3 }, allLink: { color: colors.tealMid, fontFamily: fonts.semibold, fontSize: 11 },
  activitySummary: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, paddingVertical: 15, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line }, activityIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, activityCopy: { flex: 1 }, activityName: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 14 }, activityMeta: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10, marginTop: 4 }, activityValue: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 20, textAlign: 'right' }, activityLabel: { ...type.label, color: colors.muted, fontSize: 7, textAlign: 'right' },
});
