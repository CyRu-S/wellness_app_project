import React, { useEffect, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useDispatch, useSelector } from 'react-redux';
import StaggeredView from '../../components/auth/StaggeredView';
import AmbientBackground from '../../components/common/AmbientBackground';
import Screen from '../../components/common/Screen';
import UserHeader from '../../components/user/UserHeader';
import { completeActivity } from '../../store/slices/activitySlice';
import { recordActivity } from '../../store/slices/dashboardSlice';
import { colors, fonts, radius, shadows, type } from '../../theme';

const activities = [
  { key: 'walk', label: 'Walk', icon: 'walk-outline', rate: 4.5 },
  { key: 'run', label: 'Run', icon: 'fitness-outline', rate: 10 },
  { key: 'cycling', label: 'Cycling', icon: 'bicycle-outline', rate: 8 },
  { key: 'strength', label: 'Strength', icon: 'barbell-outline', rate: 6 },
  { key: 'yoga', label: 'Yoga', icon: 'body-outline', rate: 3.5 },
];

export default function ActivityTimerScreen({ navigation }) {
  const history = useSelector((state) => state.activity.history);
  const dispatch = useDispatch();
  const [selected, setSelected] = useState(activities[0]);
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [completed, setCompleted] = useState(null);
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (!running) { pulse.stopAnimation(); pulse.setValue(0); return undefined; }
    const loop = Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: 1, duration: 1100, useNativeDriver: true }), Animated.timing(pulse, { toValue: 0, duration: 1100, useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [pulse, running]);

  const formatted = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const estimate = Math.round((seconds / 60) * selected.rate);

  const toggle = () => {
    setCompleted(null);
    setRunning((value) => !value);
    Haptics.selectionAsync().catch(() => {});
  };

  const reset = () => { setRunning(false); setSeconds(0); setCompleted(null); };

  const finish = () => {
    if (!seconds) return;
    const session = { id: Date.now(), activity: selected.label, minutes: Math.max(1, Math.ceil(seconds / 60)), calories: Math.max(1, estimate), when: `Today · ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` };
    setRunning(false);
    setCompleted(session);
    dispatch(completeActivity(session));
    dispatch(recordActivity(session));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  return (
    <Screen contentStyle={styles.page}>
      <UserHeader navigation={navigation} />
      <StaggeredView delay={35} style={styles.head}><Text style={styles.kicker}>ACTIVITY TIMER</Text><Text style={styles.title}>Track movement</Text><Text style={styles.body}>Choose an activity and let the timer update today’s movement totals.</Text></StaggeredView>

      <StaggeredView delay={90}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activityTabs}>{activities.map((activity) => <Pressable key={activity.key} onPress={() => { if (!running) setSelected(activity); }} style={[styles.activityTab, selected.key === activity.key && styles.activityTabActive]}><Ionicons name={activity.icon} size={19} color={selected.key === activity.key ? colors.white : colors.tealDark} /><Text style={[styles.activityTabText, selected.key === activity.key && styles.activityTabTextActive]}>{activity.label}</Text></Pressable>)}</ScrollView></StaggeredView>

      <StaggeredView delay={150} style={styles.timerPanel}>
        <AmbientBackground light />
        <View style={styles.timerStage}><Animated.View style={[styles.pulse, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.16] }) }] }]} /><View style={styles.timer}><Text style={styles.timerLabel}>{selected.label.toUpperCase()}</Text><Text style={styles.time}>{formatted}</Text><View style={styles.ready}><View style={[styles.readyDot, running && styles.runningDot]} /><Text style={styles.readyText}>{running ? 'IN PROGRESS' : completed ? 'SAVED' : seconds ? 'PAUSED' : 'READY'}</Text></View></View></View>
        <View style={styles.liveStats}><View style={styles.liveStat}><Text style={styles.liveLabel}>EST. BURN</Text><Text style={styles.liveValue}>{estimate}<Text style={styles.liveUnit}> kcal</Text></Text></View><View style={styles.liveStat}><Text style={styles.liveLabel}>OF 30 MIN GOAL</Text><Text style={styles.liveValue}>{Math.min(100, Math.round(seconds / 18))}<Text style={styles.liveUnit}>%</Text></Text></View></View>
        <View style={styles.controls}><Pressable accessibilityLabel="Reset timer" onPress={reset} style={styles.secondaryControl}><Ionicons name="refresh" size={19} color={colors.tealDark} /></Pressable><Pressable accessibilityLabel={running ? 'Pause activity' : 'Start activity'} onPress={toggle} style={styles.play}><Ionicons name={running ? 'pause' : 'play'} size={25} color={colors.white} /></Pressable><Pressable accessibilityLabel="Finish activity" disabled={!seconds} onPress={finish} style={[styles.secondaryControl, !seconds && styles.disabled]}><Ionicons name="checkmark" size={21} color={colors.tealDark} /></Pressable></View>
        <Text style={styles.help}>Start, pause, and finish when your activity is complete.</Text>
      </StaggeredView>

      {completed ? <StaggeredView delay={20} style={styles.saved}><View style={styles.savedIcon}><Ionicons name="checkmark" size={18} color={colors.white} /></View><View style={styles.savedCopy}><Text style={styles.savedTitle}>{completed.activity} added to today</Text><Text style={styles.savedMeta}>{completed.minutes} min · {completed.calories} kcal · Dashboard updated</Text></View><Pressable onPress={() => navigation.navigate('Today')}><Ionicons name="arrow-forward" size={20} color={colors.tealDark} /></Pressable></StaggeredView> : null}

      <StaggeredView delay={250} style={styles.history}><View style={styles.historyHead}><Text style={styles.historyTitle}>RECENT MOVEMENT</Text><Text style={styles.historyCount}>{history.length} sessions</Text></View>{history.slice(0, 3).map((item) => <View key={item.id} style={styles.historyRow}><View style={styles.historyIcon}><Ionicons name="walk-outline" size={19} color={colors.tealDark} /></View><View style={styles.historyCopy}><Text style={styles.historyName}>{item.activity}</Text><Text style={styles.historyMeta}>{item.when}</Text></View><View><Text style={styles.historyCalories}>{item.calories} kcal</Text><Text style={styles.historyMinutes}>{item.minutes} min</Text></View></View>)}</StaggeredView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {}, head: { gap: 6, marginTop: 24 }, kicker: { ...type.label, color: colors.tealMid }, title: { ...type.display, color: colors.ink }, body: { ...type.body, color: colors.muted, maxWidth: 340 },
  activityTabs: { gap: 9, paddingVertical: 22, paddingRight: 20 }, activityTab: { minWidth: 82, minHeight: 62, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', gap: 5 }, activityTabActive: { backgroundColor: colors.tealMid, borderColor: colors.tealMid, ...shadows.soft }, activityTabText: { color: colors.tealDark, fontFamily: fonts.semibold, fontSize: 12 }, activityTabTextActive: { color: colors.white },
  timerPanel: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 19, overflow: 'hidden', ...shadows.soft }, timerStage: { minHeight: 225, alignItems: 'center', justifyContent: 'center' }, pulse: { position: 'absolute', width: 205, height: 205, borderRadius: 103, backgroundColor: colors.accent }, timer: { width: 188, height: 188, borderRadius: 94, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.mist }, timerLabel: { ...type.label, color: colors.tealMid, fontSize: 11 }, time: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 45, letterSpacing: -2, marginTop: 6 }, ready: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 }, readyDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.line }, runningDot: { backgroundColor: colors.accent }, readyText: { ...type.label, color: colors.muted, fontSize: 10 },
  liveStats: { flexDirection: 'row', gap: 10 }, liveStat: { flex: 1, backgroundColor: colors.accentSoft, borderRadius: radius.md, padding: 15 }, liveLabel: { ...type.label, color: colors.tealDark, fontSize: 11 }, liveValue: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 22, marginTop: 4 }, liveUnit: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22, marginTop: 22 }, secondaryControl: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.mist, alignItems: 'center', justifyContent: 'center' }, disabled: { opacity: 0.35 }, play: { width: 66, height: 66, borderRadius: 33, backgroundColor: colors.tealMid, alignItems: 'center', justifyContent: 'center', ...shadows.soft }, help: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 13 },
  saved: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.accentSoft, borderRadius: radius.md, padding: 14, marginTop: 15 }, savedIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.tealMid, alignItems: 'center', justifyContent: 'center' }, savedCopy: { flex: 1 }, savedTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 14 }, savedMeta: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12, marginTop: 3 },
  history: { marginTop: 28 }, historyHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 6 }, historyTitle: { ...type.label, color: colors.muted, fontSize: 11 }, historyCount: { color: colors.tealMid, fontFamily: fonts.semibold, fontSize: 12 }, historyRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line }, historyIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.mist, alignItems: 'center', justifyContent: 'center' }, historyCopy: { flex: 1 }, historyName: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 15 }, historyMeta: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12, marginTop: 3 }, historyCalories: { color: colors.tealMid, fontFamily: fonts.semibold, fontSize: 13, textAlign: 'right' }, historyMinutes: { color: colors.muted, fontFamily: fonts.medium, fontSize: 11, textAlign: 'right', marginTop: 2 },
});
