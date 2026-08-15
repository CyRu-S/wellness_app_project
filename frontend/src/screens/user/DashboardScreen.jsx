import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import ProgressRing from '../../components/dashboard/ProgressRing';
import SectionHeader from '../../components/common/SectionHeader';
import Screen from '../../components/common/Screen';
import { drinkWater } from '../../store/slices/dashboardSlice';
import { colors, radius, type } from '../../theme';

export default function DashboardScreen({ navigation }) {
  const user = useSelector((state) => state.auth.user);
  const dashboard = useSelector((state) => state.dashboard);
  const dispatch = useDispatch();
  return (
    <Screen>
      <View style={styles.top}><View><Text style={styles.date}>SATURDAY · 15 AUG</Text><Text style={styles.greeting}>Good morning,{`\n`}{user?.name}.</Text></View><Pressable onPress={() => navigation.navigate('Notifications')} style={styles.icon}><Ionicons name="notifications-outline" size={22} color={colors.ink} /><View style={styles.dot} /></Pressable></View>
      <View style={styles.focus}>
        <View style={styles.focusCopy}><Text style={styles.focusLabel}>TODAY’S FOCUS</Text><Text style={styles.focusTitle}>Steady energy</Text><Text style={styles.focusText}>Two rituals left to complete your daily plan.</Text><Pressable onPress={() => navigation.navigate('Plan')}><Text style={styles.link}>View daily plan →</Text></Pressable></View>
        <ProgressRing value={dashboard.completion} />
      </View>
      <View style={styles.metrics}>
        <View style={styles.metric}><Text style={styles.metricValue}>{dashboard.calories.toLocaleString()}</Text><Text style={styles.metricLabel}>kcal today</Text></View>
        <View style={styles.divider} />
        <View style={styles.metric}><Text style={styles.metricValue}>{dashboard.activeMinutes}</Text><Text style={styles.metricLabel}>active min</Text></View>
        <View style={styles.divider} />
        <View style={styles.metric}><Text style={styles.metricValue}>{dashboard.streak}</Text><Text style={styles.metricLabel}>day streak</Text></View>
      </View>
      <View style={styles.section}><SectionHeader eyebrow="HYDRATION" title={`${dashboard.waterGlasses} of ${dashboard.waterTarget} glasses`} action="Add glass" onPress={() => dispatch(drinkWater())} /><View style={styles.waterTrack}>{Array.from({ length: dashboard.waterTarget }).map((_, index) => <View key={index} style={[styles.water, index < dashboard.waterGlasses && styles.waterFilled]} />)}</View></View>
      <View style={styles.section}><SectionHeader eyebrow="UP NEXT" title="Lunch at 1:00 PM" action="See meals" onPress={() => navigation.navigate('Meals')} /><Pressable onPress={() => navigation.navigate('Meals')} style={styles.next}><View style={styles.foodIcon}><Ionicons name="leaf" size={23} color={colors.ink} /></View><View style={styles.nextCopy}><Text style={styles.nextTitle}>Green grain power bowl</Text><Text style={styles.nextMeta}>520 kcal · 31g protein</Text></View><Ionicons name="arrow-forward" size={21} color={colors.ink} /></Pressable></View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 10 }, date: { ...type.label, color: colors.moss }, greeting: { ...type.h1, color: colors.ink, marginTop: 7 }, icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }, dot: { position: 'absolute', top: 10, right: 10, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent },
  focus: { minHeight: 230, backgroundColor: colors.ink, borderRadius: radius.lg, marginTop: 28, padding: 22, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' }, focusCopy: { flex: 1, paddingRight: 8 }, focusLabel: { ...type.label, color: '#AAC0B4' }, focusTitle: { color: colors.white, fontSize: 28, fontWeight: '800', letterSpacing: -0.7, marginTop: 6 }, focusText: { color: '#C1CEC7', lineHeight: 20, marginTop: 7, maxWidth: 175 }, link: { color: colors.accent, fontWeight: '800', marginTop: 20 },
  metrics: { flexDirection: 'row', paddingVertical: 26, justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line }, metric: { flex: 1, alignItems: 'center' }, metricValue: { color: colors.ink, fontSize: 23, fontWeight: '800' }, metricLabel: { color: colors.muted, fontSize: 12, marginTop: 3 }, divider: { width: 1, height: 34, backgroundColor: colors.line },
  section: { marginTop: 30 }, waterTrack: { flexDirection: 'row', gap: 7, marginTop: 16 }, water: { flex: 1, height: 12, borderRadius: 6, backgroundColor: colors.line }, waterFilled: { backgroundColor: colors.moss }, next: { flexDirection: 'row', alignItems: 'center', gap: 13, marginTop: 14, paddingVertical: 13 }, foodIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, nextCopy: { flex: 1 }, nextTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' }, nextMeta: { color: colors.muted, fontSize: 13, marginTop: 3 },
});

