import { LocalizedText as Text } from '../../components/common/LocalizedText';
import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import StaggeredView from '../../components/auth/StaggeredView';
import AnimatedNumber from '../../components/common/AnimatedNumber';
import PrimaryTealCardBackground from '../../components/common/PrimaryTealCardBackground';
import SyncFeedback from '../../components/common/SyncFeedback';
import { completeActivity, loadActivities } from '../../store/slices/activitySlice';
import { postMeal } from '../../store/slices/mealSlice';
import Screen from '../../components/common/Screen';
import HydrationMeter from '../../components/dashboard/HydrationMeter';
import ProgressRing from '../../components/dashboard/ProgressRing';
import MealSchedule, { getMealStatus } from '../../components/meal/MealSchedule';
import UserHeader from '../../components/user/UserHeader';
import { clearWater, drinkWater } from '../../store/slices/dashboardSlice';
import { completeHealthyHabit } from '../../store/slices/planSlice';
import { confirmRetry } from '../../utils/confirmRetry';
import Alert from '../../utils/appAlert';
import { colors, fonts, radius, shadows, type } from '../../theme';
import { selectLeaderboard } from '../../store/slices/leaderboardSlice';

const greeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
};

export default function DashboardScreen({ navigation }) {
  const user = useSelector((state) => state.auth.user);
  const dashboard = useSelector((state) => state.dashboard);
  const activity = useSelector((state) => state.activity);
  const meals = useSelector((state) => state.meals);
  const plan = useSelector((state) => state.plan);
  const leaderboard = useSelector(selectLeaderboard);
  const dispatch = useDispatch();
  const [waterComplete, setWaterComplete] = useState(false);
  const previousWater = useRef(null);
  const firstName = user?.name?.split(' ')[0] || 'there';
  const overdue = meals.items.filter((meal) => getMealStatus(meal) === 'overdue');
  const nextMeal = meals.items.find((meal) => !meal.consumed);
  const loggedMeals = meals.items.filter((meal) => meal.consumed).length;
  const hydration = dashboard.waterTarget ? Math.min(100, Math.round((dashboard.waterGlasses / dashboard.waterTarget) * 100)) : 0;
  const healthyHabits = plan.tasks.filter((task) => task.type === 'HEALTHY_HABIT');
  useEffect(() => {
    const previous = previousWater.current;
    if (previous != null && previous < dashboard.waterTarget && dashboard.waterGlasses >= dashboard.waterTarget) setWaterComplete(true);
    previousWater.current = dashboard.waterGlasses;
  }, [dashboard.waterGlasses, dashboard.waterTarget]);
  const latestActivity = dashboard.lastActivity;
  const addWater = () => {
    const save = () => dispatch(drinkWater());
    if (dashboard.waterError) confirmRetry('Water', save);
    else save();
  };
  const resetWater = () => Alert.alert('Clear today’s water?', 'This removes all water logged today.', [
    { text: 'Cancel', style: 'cancel' }, { text: 'Clear', style: 'destructive', onPress: () => dispatch(clearWater()) },
  ]);
  const openTimeline = () => navigation.getParent()?.navigate('Log', { screen: 'TodayTimeline' });
  return (
    <Screen contentStyle={styles.screen}>
      <UserHeader navigation={navigation} title="Today" />
      <SyncFeedback label="Meal" pending={!!meals.pendingPost} error={meals.postError} onRetry={() => meals.failedPost && dispatch(postMeal(meals.failedPost))} />
      <StaggeredView delay={40} style={styles.intro}>
        <Text style={styles.eyebrow}>YOUR DAILY RHYTHM</Text>
        <Text style={styles.greeting}>{greeting()}, <Text style={styles.name}>{firstName}.</Text></Text>
        <Text style={styles.introCopy}>Your nutrition, hydration and movement are synced below.</Text>
      </StaggeredView>

      <StaggeredView delay={110} style={styles.heroShell}>
        <Pressable accessibilityRole="button" accessibilityLabel="Open today’s timeline" onPress={openTimeline} style={({ pressed }) => [styles.hero, pressed && styles.pressed]}>
          <PrimaryTealCardBackground />
          <View style={styles.heroTop}><Text style={styles.heroLabel}>TODAY’S PLAN</Text><View style={styles.live}><View style={styles.liveDot} /><Text style={styles.liveText}>IN PROGRESS</Text></View></View>
          <View style={styles.heroBody}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>A steady day,{`\n`}in progress.</Text>
              <View style={styles.nutritionLine}><View><AnimatedNumber value={dashboard.calories} style={styles.nutritionValue} /><Text style={styles.nutritionLabel}>KCAL LOGGED</Text></View><View style={styles.heroRule} /><View><Text style={styles.nutritionValue}>{dashboard.protein}g</Text><Text style={styles.nutritionLabel}>PROTEIN</Text></View></View>
            </View>
            <ProgressRing value={dashboard.completion} label="complete" size={120} />
          </View>
          <View style={styles.heroActions}><View style={styles.nextStatus}><Ionicons name="time-outline" size={17} color={colors.accent} /><View><Text style={styles.nextLabel}>NEXT CHECK-IN</Text><Text style={styles.nextValue}>{nextMeal ? `${nextMeal.time} · ${nextMeal.name}` : meals.items.length ? 'Timeline complete' : 'No plan assigned yet'}</Text></View></View><View style={styles.textAction}><Text style={styles.textActionText}>Details</Text><Ionicons name="arrow-forward" size={15} color={colors.white} /></View></View>
        </Pressable>
      </StaggeredView>

      <StaggeredView delay={170} style={styles.quickStats}>
        <View style={styles.quickStat}><Text style={styles.quickValue}>{loggedMeals}/{meals.items.length}</Text><Text style={styles.quickLabel}>MEALS TODAY</Text></View><View style={styles.statRule} />
        <View style={styles.quickStat}><Text style={styles.quickValue}>{hydration}%</Text><Text style={styles.quickLabel}>HYDRATION</Text></View><View style={styles.statRule} />
        <View style={styles.quickStat}><Text style={styles.quickValue}>{dashboard.streak}</Text><Text style={styles.quickLabel}>DAY STREAK</Text></View>
      </StaggeredView>

      <StaggeredView delay={195}>
        <Pressable accessibilityRole="button" accessibilityLabel="Open today's live leaderboard" onPress={() => navigation.navigate('Leaderboard')} style={({ pressed }) => [styles.leaderboard, pressed && styles.pressed]}>
          <View style={styles.leaderboardHead}><View><Text style={styles.eyebrow}>LIVE TODAY</Text><Text style={styles.leaderboardTitle}>Community leaderboard</Text></View><Ionicons name="arrow-forward" size={19} color={colors.tealDark} /></View>
          {leaderboard.slice(0, 3).map((member) => <View key={member.memberId} style={styles.leaderboardRow}><Text style={styles.leaderboardRank}>{String(member.rank).padStart(2, '0')}</Text><Text numberOfLines={1} style={styles.leaderboardName}>{member.name}{member.viewer ? ' · You' : ''}</Text><Text style={styles.leaderboardScore}>{member.score}%</Text></View>)}
          {!leaderboard.length ? <Text style={styles.leaderboardEmpty}>Standings update as today’s check-ins are logged.</Text> : null}
        </Pressable>
      </StaggeredView>

      {overdue.length ? <StaggeredView delay={210} style={styles.alert}><Ionicons name="alert-circle" size={20} color={colors.danger} /><View style={styles.alertCopy}><Text style={styles.alertTitle}>{overdue.length} timeline check-in{overdue.length > 1 ? 's' : ''} overdue</Text><Text style={styles.alertMeta}>Open Log when you are ready to add the photo.</Text></View></StaggeredView> : null}

      <StaggeredView delay={240} style={styles.section}>
        <View style={styles.sectionHead}><View><Text style={styles.eyebrow}>DAILY MEAL PLAN</Text><Text style={styles.sectionTitle}>{meals.planName || 'No plan assigned yet'}</Text><Text style={styles.sectionMeta}>{meals.consultant ? `Assigned by ${meals.consultant}` : 'Your admin will create your meal schedule.'}</Text></View></View>
        <MealSchedule items={meals.items} compact showPhotoAction={false} />
      </StaggeredView>
      <StaggeredView delay={310} style={styles.section}><HydrationMeter value={dashboard.waterGlasses} target={dashboard.waterTarget} pending={!!dashboard.optimistic.water} onAdd={addWater} onClear={resetWater} /><SyncFeedback label="Water" pending={!!dashboard.optimistic.water} error={dashboard.waterError} onRetry={addWater} /></StaggeredView>
      {healthyHabits.length ? <StaggeredView delay={340} style={styles.section}>
        <View style={styles.sectionHead}><View><Text style={styles.eyebrow}>HEALTHY HABITS</Text><Text style={styles.sectionTitle}>Today’s habits</Text></View></View>
        <View style={styles.habitList}>{healthyHabits.map((habit) => <Pressable key={habit.id} disabled={habit.done || plan.completingId === habit.id} onPress={() => dispatch(completeHealthyHabit(habit.id))} style={({ pressed }) => [styles.habitRow, pressed && styles.pressed]}><View style={[styles.habitCheck, habit.done && styles.habitCheckDone]}>{habit.done ? <Ionicons name="checkmark" size={16} color={colors.white} /> : <Ionicons name="leaf-outline" size={16} color={colors.tealDark} />}</View><View style={styles.activityCopy}><Text style={[styles.activityName, habit.done && styles.habitDone]}>{habit.title}</Text><Text style={styles.activityMeta}>{habit.category || habit.detail} · {String(habit.scheduledTime || '').slice(0, 5)}</Text></View><Text style={styles.allLink}>{habit.done ? 'Done' : 'Complete'}</Text></Pressable>)}</View>
      </StaggeredView> : null}
      <StaggeredView delay={370} style={styles.section}>
        <View style={styles.sectionHead}><View><Text style={styles.eyebrow}>MOVEMENT</Text><Text style={styles.sectionTitle}>Today’s activity</Text></View><Pressable onPress={() => navigation.navigate('Move')}><Text style={styles.allLink}>Start timer</Text></Pressable></View>
        <SyncFeedback label="Activity" pending={!!activity.pendingSession} error={activity.error} onRetry={() => activity.failedSession ? confirmRetry('Activity', () => dispatch(completeActivity(activity.failedSession))) : dispatch(loadActivities())} />
        <View style={styles.activitySummary}><View style={styles.activityIcon}><Ionicons name="walk" size={24} color={colors.tealDark} /></View><View style={styles.activityCopy}><Text style={styles.activityName}>{latestActivity?.activity || 'No activity logged'}</Text><Text style={styles.activityMeta}>{latestActivity ? `${latestActivity.minutes} min · ${latestActivity.calories} kcal burned` : 'Start a guided activity to update this section'}</Text></View><View><AnimatedNumber value={dashboard.activeMinutes} style={styles.activityValue} suffix="m" /><Text style={styles.activityLabel}>TODAY</Text></View></View>
      </StaggeredView>
      <Modal visible={waterComplete} transparent animationType="fade" onRequestClose={() => setWaterComplete(false)}>
        <View style={styles.waterModalBackdrop}><View style={styles.waterModal}><View style={styles.waterDrop}><Ionicons name="water" size={36} color={colors.white} /></View><Text style={styles.waterModalTitle}>Hydration goal complete</Text><Text style={styles.waterModalText}>You reached today’s water target.</Text><Pressable accessibilityRole="button" onPress={() => setWaterComplete(false)} style={styles.waterModalButton}><Text style={styles.waterModalButtonText}>Done</Text></Pressable></View></View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 20 }, intro: { marginTop: 26 }, eyebrow: { ...type.label, color: colors.tealMid, fontSize: 11 },
  greeting: { color: colors.ink, fontFamily: fonts.regular, fontSize: 32, lineHeight: 38, letterSpacing: -1, marginTop: 7 }, name: { fontFamily: fonts.semibold }, introCopy: { color: colors.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, marginTop: 6 },
  heroShell: { borderRadius: radius.xl, marginTop: 22, backgroundColor: colors.tealDark, ...shadows.soft }, hero: { minHeight: 302, borderRadius: radius.xl, padding: 21, overflow: 'hidden', backgroundColor: colors.tealDark }, heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, heroLabel: { ...type.label, color: '#C9ECE8', fontSize: 11 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.12)', paddingVertical: 7, paddingHorizontal: 10 }, liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent }, liveText: { ...type.label, color: '#E1F3F0', fontSize: 10, letterSpacing: 0.9 },
  heroBody: { minHeight: 165, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, heroCopy: { flex: 1, paddingRight: 8 }, heroTitle: { color: colors.white, fontFamily: fonts.semibold, fontSize: 23, lineHeight: 29, letterSpacing: -0.5 },
  nutritionLine: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 }, nutritionValue: { color: colors.white, fontFamily: fonts.semibold, fontSize: 20 }, nutritionLabel: { ...type.label, color: '#C1DDD8', fontSize: 10, letterSpacing: 0.8, marginTop: 3 }, heroRule: { width: 1, height: 34, backgroundColor: 'rgba(255,255,255,0.2)' },
  heroActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }, nextStatus: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9, paddingRight: 10 }, nextLabel: { ...type.label, color: '#C1DDD8', fontSize: 10, letterSpacing: 0.75 }, nextValue: { color: colors.white, fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, marginTop: 3, maxWidth: 175 }, textAction: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6 }, textActionText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 13 }, pressed: { opacity: 0.65, transform: [{ scale: 0.98 }] },
  quickStats: { minHeight: 98, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: colors.surface, borderRadius: radius.md, marginTop: 14, ...shadows.soft }, quickStat: { flex: 1, alignItems: 'center' }, quickValue: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 21 }, quickLabel: { ...type.label, color: colors.muted, fontSize: 10, letterSpacing: 0.7, marginTop: 4 }, statRule: { width: 1, height: 37, backgroundColor: colors.line },
  success: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.accentSoft, borderRadius: radius.md, padding: 14, marginTop: 14 }, successIcon: { width: 29, height: 29, borderRadius: 15, backgroundColor: colors.tealMid, alignItems: 'center', justifyContent: 'center' }, successCopy: { flex: 1 }, successTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 14 }, successMeta: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, marginTop: 3 },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 10, borderLeftWidth: 3, borderLeftColor: colors.danger, backgroundColor: '#FFF4F2', borderRadius: radius.sm, padding: 13, marginTop: 14 }, alertCopy: { flex: 1 }, alertTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 13 }, alertMeta: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, marginTop: 2 },
  section: { marginTop: 32 }, sectionHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }, sectionTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 21, marginTop: 5 }, sectionMeta: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, marginTop: 4 }, allLink: { color: colors.tealMid, fontFamily: fonts.semibold, fontSize: 12 },
  activitySummary: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 15, paddingVertical: 18, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line }, activityIcon: { width: 50, height: 50, borderRadius: 17, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, activityCopy: { flex: 1 }, activityName: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 16 }, activityMeta: { color: colors.muted, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, marginTop: 4 }, activityValue: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 22, textAlign: 'right' }, activityLabel: { ...type.label, color: colors.muted, fontSize: 10, textAlign: 'right' },
  leaderboard: { marginTop: 26, paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line },
  leaderboardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  leaderboardTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 20, marginTop: 4 },
  leaderboardRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  leaderboardRank: { width: 35, color: colors.tealMid, fontFamily: fonts.semibold, fontSize: 11 },
  leaderboardName: { flex: 1, color: colors.ink, fontFamily: fonts.medium, fontSize: 13 },
  leaderboardScore: { color: colors.tealDark, fontFamily: fonts.semibold, fontSize: 14 },
  leaderboardEmpty: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, paddingVertical: 8 },
  habitList: { marginTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  habitRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  habitCheck: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  habitCheckDone: { backgroundColor: colors.tealMid }, habitDone: { color: colors.muted, textDecorationLine: 'line-through' },
  waterModalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,35,40,0.58)' },
  waterModal: { width: '100%', maxWidth: 360, alignItems: 'center', padding: 26, borderRadius: radius.xl, backgroundColor: colors.surface },
  waterDrop: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tealMid },
  waterModalTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 22, marginTop: 17 },
  waterModalText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 14, marginTop: 6 },
  waterModalButton: { minWidth: 130, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.tealMid, marginTop: 20 },
  waterModalButtonText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 14 },
});
