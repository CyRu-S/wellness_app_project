import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import StaggeredView from '../../components/auth/StaggeredView';
import AmbientBackground from '../../components/common/AmbientBackground';
import AnimatedNumber from '../../components/common/AnimatedNumber';
import Screen from '../../components/common/Screen';
import HydrationMeter from '../../components/dashboard/HydrationMeter';
import ProgressRing from '../../components/dashboard/ProgressRing';
import MealSchedule, { getMealStatus } from '../../components/meal/MealSchedule';
import UserHeader from '../../components/user/UserHeader';
import { drinkWater, refreshDashboard } from '../../store/slices/dashboardSlice';
import { colors, fonts, radius, shadows, type } from '../../theme';

const greeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
};

export default function DashboardScreen({ navigation }) {
  const user = useSelector((state) => state.auth.user);
  const dashboard = useSelector((state) => state.dashboard);
  const meals = useSelector((state) => state.meals);
  const activity = useSelector((state) => state.activity);
  const dispatch = useDispatch();
  useFocusEffect(useCallback(() => { dispatch(refreshDashboard()); }, [dispatch]));
  const firstName = user?.name?.split(' ')[0] || 'there';
  const overdue = meals.items.filter((meal) => getMealStatus(meal) === 'overdue');
  const nextMeal = meals.items.find((meal) => !meal.consumed);
  const loggedMeals = meals.items.filter((meal) => meal.consumed).length;
  const hydration = Math.round((dashboard.waterGlasses / dashboard.waterTarget) * 100);
  const latestActivity = dashboard.lastActivity || activity.history[0];
  return (
    <Screen contentStyle={styles.screen}>
      <UserHeader navigation={navigation} />
      <StaggeredView delay={40} style={styles.intro}>
        <Text style={styles.eyebrow}>YOUR DAILY RHYTHM</Text>
        <Text style={styles.greeting}>{greeting()}, <Text style={styles.name}>{firstName}.</Text></Text>
        <Text style={styles.introCopy}>Your nutrition, hydration and movement are synced below.</Text>
      </StaggeredView>

      <StaggeredView delay={110} style={styles.hero}>
        <LinearGradient colors={[colors.tealDark, '#0D8A80']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <AmbientBackground light />
        <View style={styles.heroTop}><Text style={styles.heroLabel}>TODAY’S PLAN</Text><View style={styles.live}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View></View>
        <View style={styles.heroBody}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>A steady day,{`\n`}in progress.</Text>
            <View style={styles.nutritionLine}><View><AnimatedNumber value={dashboard.calories} style={styles.nutritionValue} /><Text style={styles.nutritionLabel}>KCAL LOGGED</Text></View><View style={styles.heroRule} /><View><Text style={styles.nutritionValue}>{dashboard.protein}g</Text><Text style={styles.nutritionLabel}>PROTEIN</Text></View></View>
          </View>
          <ProgressRing value={dashboard.completion} label="complete" size={112} />
        </View>
        <View style={styles.heroActions}><View style={styles.nextStatus}><Ionicons name="time-outline" size={17} color={colors.accent} /><View><Text style={styles.nextLabel}>NEXT CHECK-IN</Text><Text style={styles.nextValue}>{nextMeal ? `${nextMeal.time} · ${nextMeal.name}` : 'Timeline complete'}</Text></View></View><Pressable onPress={() => navigation.navigate('Meals')} style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}><Text style={styles.textActionText}>Details</Text><Ionicons name="arrow-forward" size={15} color={colors.white} /></Pressable></View>
      </StaggeredView>

      <StaggeredView delay={170} style={styles.quickStats}>
        <View style={styles.quickStat}><Text style={styles.quickValue}>{loggedMeals}/{meals.items.length}</Text><Text style={styles.quickLabel}>MEALS TODAY</Text></View><View style={styles.statRule} />
        <View style={styles.quickStat}><Text style={styles.quickValue}>{hydration}%</Text><Text style={styles.quickLabel}>HYDRATION</Text></View><View style={styles.statRule} />
        <View style={styles.quickStat}><Text style={styles.quickValue}>{dashboard.streak}</Text><Text style={styles.quickLabel}>DAY STREAK</Text></View>
      </StaggeredView>

      {dashboard.lastMeal ? <StaggeredView delay={40} style={styles.success}><View style={styles.successIcon}><Ionicons name="checkmark" size={17} color={colors.white} /></View><View style={styles.successCopy}><Text style={styles.successTitle}>{dashboard.lastMeal.name} added</Text><Text style={styles.successMeta}>+{dashboard.lastMeal.calories} kcal · Dashboard updated now</Text></View><Ionicons name="sparkles-outline" size={18} color={colors.tealMid} /></StaggeredView> : null}
      {overdue.length ? <StaggeredView delay={210} style={styles.alert}><Ionicons name="alert-circle" size={20} color={colors.danger} /><View style={styles.alertCopy}><Text style={styles.alertTitle}>{overdue.length} timeline check-in{overdue.length > 1 ? 's' : ''} overdue</Text><Text style={styles.alertMeta}>Open Log when you are ready to add the photo.</Text></View></StaggeredView> : null}

      <StaggeredView delay={240} style={styles.section}>
        <View style={styles.sectionHead}><View><Text style={styles.eyebrow}>DAILY MEAL PLAN</Text><Text style={styles.sectionTitle}>{meals.planName}</Text><Text style={styles.sectionMeta}>Assigned by {meals.consultant}</Text></View><Pressable onPress={() => navigation.navigate('Meals')}><Text style={styles.allLink}>View all</Text></Pressable></View>
        <MealSchedule items={meals.items} compact showPhotoAction={false} />
      </StaggeredView>
      <StaggeredView delay={310} style={styles.section}><HydrationMeter value={dashboard.waterGlasses} target={dashboard.waterTarget} onAdd={() => dispatch(drinkWater())} /></StaggeredView>
      <StaggeredView delay={370} style={styles.section}>
        <View style={styles.sectionHead}><View><Text style={styles.eyebrow}>MOVEMENT</Text><Text style={styles.sectionTitle}>Today’s activity</Text></View><Pressable onPress={() => navigation.navigate('Move')}><Text style={styles.allLink}>Start timer</Text></Pressable></View>
        <View style={styles.activitySummary}><View style={styles.activityIcon}><Ionicons name="walk" size={24} color={colors.tealDark} /></View><View style={styles.activityCopy}><Text style={styles.activityName}>{latestActivity?.activity || 'No activity logged'}</Text><Text style={styles.activityMeta}>{latestActivity ? `${latestActivity.minutes} min · ${latestActivity.calories} kcal burned` : 'Start a guided activity to update this section'}</Text></View><View><AnimatedNumber value={dashboard.activeMinutes} style={styles.activityValue} suffix="m" /><Text style={styles.activityLabel}>TODAY</Text></View></View>
      </StaggeredView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 18 }, intro: { marginTop: 24 }, eyebrow: { ...type.label, color: colors.tealMid, fontSize: 8 },
  greeting: { color: colors.ink, fontFamily: fonts.regular, fontSize: 30, lineHeight: 35, letterSpacing: -1, marginTop: 6 }, name: { fontFamily: fonts.semibold }, introCopy: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, marginTop: 5 },
  hero: { minHeight: 280, borderRadius: radius.lg, marginTop: 21, padding: 20, overflow: 'hidden', ...shadows.raised }, heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, heroLabel: { ...type.label, color: '#BDE7DF', fontSize: 8 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.12)', paddingVertical: 6, paddingHorizontal: 9 }, liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }, liveText: { ...type.label, color: '#D9F3ED', fontSize: 7 },
  heroBody: { minHeight: 158, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, heroCopy: { flex: 1, paddingRight: 6 }, heroTitle: { color: colors.white, fontFamily: fonts.semibold, fontSize: 22, lineHeight: 27, letterSpacing: -0.5 },
  nutritionLine: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 }, nutritionValue: { color: colors.white, fontFamily: fonts.semibold, fontSize: 18 }, nutritionLabel: { ...type.label, color: '#B4D8D2', fontSize: 6, letterSpacing: 0.9, marginTop: 2 }, heroRule: { width: 1, height: 29, backgroundColor: 'rgba(255,255,255,0.2)' },
  heroActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 1 }, nextStatus: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 10 }, nextLabel: { ...type.label, color: '#B4D8D2', fontSize: 6, letterSpacing: 0.8 }, nextValue: { color: colors.white, fontFamily: fonts.medium, fontSize: 10, marginTop: 2, maxWidth: 175 }, textAction: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 6 }, textActionText: { color: colors.white, fontFamily: fonts.medium, fontSize: 11 }, pressed: { opacity: 0.65, transform: [{ scale: 0.98 }] },
  quickStats: { minHeight: 86, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, marginTop: 13, ...shadows.soft }, quickStat: { flex: 1, alignItems: 'center' }, quickValue: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 18 }, quickLabel: { ...type.label, color: colors.muted, fontSize: 6, letterSpacing: 0.8, marginTop: 3 }, statRule: { width: 1, height: 31, backgroundColor: colors.line },
  success: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.accentSoft, borderRadius: radius.md, padding: 14, marginTop: 14 }, successIcon: { width: 29, height: 29, borderRadius: 15, backgroundColor: colors.tealMid, alignItems: 'center', justifyContent: 'center' }, successCopy: { flex: 1 }, successTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 13 }, successMeta: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10, marginTop: 3 },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 10, borderLeftWidth: 3, borderLeftColor: colors.danger, backgroundColor: '#FFF4F2', borderRadius: radius.sm, padding: 13, marginTop: 14 }, alertCopy: { flex: 1 }, alertTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 12 }, alertMeta: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10, lineHeight: 14, marginTop: 2 },
  section: { marginTop: 30 }, sectionHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }, sectionTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 20, marginTop: 4 }, sectionMeta: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10, marginTop: 3 }, allLink: { color: colors.tealMid, fontFamily: fonts.semibold, fontSize: 11 },
  activitySummary: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, paddingVertical: 15, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line }, activityIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, activityCopy: { flex: 1 }, activityName: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 14 }, activityMeta: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10, marginTop: 4 }, activityValue: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 20, textAlign: 'right' }, activityLabel: { ...type.label, color: colors.muted, fontSize: 7, textAlign: 'right' },
});
