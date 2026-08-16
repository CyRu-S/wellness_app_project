import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import AdminBarChart from '../../components/admin/AdminBarChart';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminScreen from '../../components/admin/AdminScreen';
import {
  selectAdminApprovals,
  selectAdminAttention,
  selectAdminMealInsights,
  selectAdminSummary,
} from '../../store/slices/adminSlice';
import { adminColors, adminFonts, adminRadius } from '../../theme/admin';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getDateLabel() {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
}

function Signal({ icon, label, value, meta, tone = 'teal', onPress }) {
  const warning = tone === 'coral';
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.signal, pressed && styles.pressed]}>
      <View style={[styles.signalIcon, warning && styles.signalIconWarning]}>
        <Ionicons name={icon} size={18} color={warning ? adminColors.coral : adminColors.teal} />
      </View>
      <Text style={styles.signalLabel}>{label}</Text>
      <Text style={styles.signalValue}>{value}</Text>
      <Text style={[styles.signalMeta, warning && styles.warning]}>{meta}</Text>
    </Pressable>
  );
}

function FeedRow({ icon, tone, title, meta, action, onPress }) {
  const warning = tone === 'coral';
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.feedRow, pressed && styles.pressed]}>
      <View style={[styles.feedIcon, warning && styles.feedIconWarning]}>
        <Ionicons name={icon} size={17} color={warning ? adminColors.coral : adminColors.teal} />
      </View>
      <View style={styles.feedCopy}>
        <Text style={styles.feedTitle}>{title}</Text>
        <Text style={styles.feedMeta}>{meta}</Text>
      </View>
      <Text style={[styles.feedAction, warning && styles.warning]}>{action}</Text>
    </Pressable>
  );
}

export default function AdminDashboardScreen({ navigation }) {
  const summary = useSelector(selectAdminSummary);
  const approvals = useSelector(selectAdminApprovals);
  const attention = useSelector(selectAdminAttention);
  const insights = useSelector(selectAdminMealInsights);
  const admin = useSelector((state) => state.auth.user);
  const firstName = admin?.name?.split(' ')[0] || 'Coach';
  const openAttention = attention.filter((item) => item.status !== 'RESOLVED');

  return (
    <AdminScreen>
      <AdminHeader
        title="Wellnest"
        rightIcon="person-outline"
        rightImage
        onRightPress={() => navigation.navigate('AdminProfile')}
      />

      <View style={styles.heading}>
        <Text style={styles.date}>{getDateLabel()}</Text>
        <Text style={styles.title}>{getGreeting()}, {firstName}.</Text>
        <Text style={styles.subtitle}>A clear view of what is moving—and what needs you.</Text>
      </View>

      <LinearGradient colors={[adminColors.deepTeal, '#087D83', '#139198']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.pulse}>
        <View pointerEvents="none" style={styles.pulseOrbLarge} />
        <View pointerEvents="none" style={styles.pulseOrbSmall} />
        <View pointerEvents="none" style={styles.pulseOrbRing} />
        <View style={styles.pulseTop}>
          <Text style={styles.pulseEyebrow}>TODAY&apos;S PULSE</Text>
          <View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.livePillText}>LIVE</Text></View>
        </View>
        <View style={styles.pulseMain}>
          <Text style={styles.pulseValue}>{summary.onTrackPercentage}%</Text>
          <Text style={styles.pulseLabel}>of members are on track</Text>
        </View>
        <View style={styles.pulseRule} />
        <View style={styles.pulseFooter}>
          <Text style={styles.pulseInsight}>Meal consistency is strongest today. Hydration needs a closer look this afternoon.</Text>
          <View style={styles.activeCount}>
            <Text style={styles.activeValue}>{summary.activeUsers}</Text>
            <Text style={styles.activeLabel}>active now</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionEyebrow}>SIGNALS</Text>
        <Text style={styles.sectionHint}>Updated just now</Text>
      </View>

      <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Reports')} style={({ pressed }) => [styles.mealsSignal, pressed && styles.pressed]}>
        <View style={styles.mealsCopy}>
          <View style={styles.mealsIcon}><Ionicons name="restaurant-outline" size={18} color={adminColors.teal} /></View>
          <Text style={styles.signalLabel}>MEALS LOGGED</Text>
          <Text style={styles.mealsValue}>{summary.mealLogsToday}</Text>
          <Text style={styles.positive}>↑ {summary.mealComparison}% vs yesterday</Text>
        </View>
        <View style={styles.miniChart}>
          <AdminBarChart data={insights.ranges['7D'].series} label="Seven day meal completion" compact />
        </View>
      </Pressable>

      <View style={styles.signalPair}>
        <Signal icon="person-add-outline" label="APPROVALS" value={summary.pendingApprovals} meta="Average wait 24 min" onPress={() => navigation.navigate('UserRequests')} />
        <Signal icon="alert-circle-outline" label="ATTENTION" value={summary.missedItems} meta="2 high priority" tone="coral" onPress={() => navigation.navigate('Alerts')} />
      </View>

      <View style={styles.decisionHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>PRIORITY DESK</Text>
          <Text style={styles.decisionTitle}>Needs your decision</Text>
        </View>
        <Text style={styles.decisionCount}>{approvals.length + openAttention.length} open</Text>
      </View>

      <View style={styles.feed}>
        {approvals.slice(0, 2).map((request) => (
          <FeedRow
            key={request.id}
            icon="person-add-outline"
            title={request.name}
            meta={`Membership request · ${request.requestedAt}`}
            action="Review"
            onPress={() => navigation.navigate('UserRequests')}
          />
        ))}
        {openAttention.filter((item) => item.severity === 'HIGH').slice(0, 2).map((item) => (
          <FeedRow
            key={item.id}
            icon="alert-outline"
            tone="coral"
            title={item.memberName}
            meta={`${item.category} · ${item.missedAt}`}
            action="Act now"
            onPress={() => navigation.navigate('UserDetails', { id: item.memberId })}
          />
        ))}
        {approvals.length === 0 && openAttention.length === 0 && (
          <View style={styles.emptyFeed}><Ionicons name="checkmark-circle-outline" size={24} color={adminColors.teal} /><Text style={styles.emptyText}>Everything is handled for now.</Text></View>
        )}
      </View>

      <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Alerts')} style={({ pressed }) => [styles.allAttention, pressed && styles.pressed]}>
        <Text style={styles.allAttentionText}>Open attention queue</Text>
        <Ionicons name="arrow-forward" size={17} color={adminColors.teal} />
      </Pressable>
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  heading: { marginTop: 27 },
  date: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 31, lineHeight: 37, letterSpacing: -1.1, marginTop: 7 },
  subtitle: { maxWidth: 330, color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 14, lineHeight: 21, marginTop: 5 },
  pulse: { overflow: 'hidden', minHeight: 242, borderRadius: adminRadius.xl, padding: 20, marginTop: 24 },
  pulseOrbLarge: { position: 'absolute', width: 210, height: 210, borderRadius: 105, right: -68, top: -88, backgroundColor: 'rgba(255,255,255,0.09)' },
  pulseOrbSmall: { position: 'absolute', width: 126, height: 126, borderRadius: 63, left: -55, bottom: -68, backgroundColor: 'rgba(255,255,255,0.055)' },
  pulseOrbRing: { position: 'absolute', width: 96, height: 96, borderRadius: 48, right: 34, bottom: -48, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  pulseTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pulseEyebrow: { color: '#C4E9E7', fontFamily: adminFonts.semibold, fontSize: 11, letterSpacing: 1.4 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.12)' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#8DE3D3' },
  livePillText: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 11, letterSpacing: 0.7 },
  pulseMain: { marginTop: 28 },
  pulseValue: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 52, lineHeight: 56, letterSpacing: -2.4 },
  pulseLabel: { color: '#D6EFEC', fontFamily: adminFonts.medium, fontSize: 13, marginTop: 1 },
  pulseRule: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 18 },
  pulseFooter: { flexDirection: 'row', alignItems: 'flex-end', gap: 15 },
  pulseInsight: { flex: 1, color: '#D6EFEC', fontFamily: adminFonts.regular, fontSize: 12, lineHeight: 18 },
  activeCount: { alignItems: 'flex-end' },
  activeValue: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 21 },
  activeLabel: { color: '#B9DDDA', fontFamily: adminFonts.regular, fontSize: 11, marginTop: 1 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 27, marginBottom: 10 },
  sectionEyebrow: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 11, letterSpacing: 1.3 },
  sectionHint: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 12 },
  mealsSignal: { minHeight: 156, flexDirection: 'row', padding: 17, borderRadius: adminRadius.lg, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line },
  mealsCopy: { width: '46%' },
  mealsIcon: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.aqua, marginBottom: 13 },
  signalLabel: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 11, letterSpacing: 0.9 },
  mealsValue: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 31, letterSpacing: -1, marginTop: 4 },
  positive: { color: adminColors.teal, fontFamily: adminFonts.medium, fontSize: 12, marginTop: 5 },
  miniChart: { flex: 1, justifyContent: 'center', marginLeft: 10 },
  signalPair: { flexDirection: 'row', gap: 11, marginTop: 11 },
  signal: { flex: 1, minHeight: 145, padding: 15, borderRadius: adminRadius.lg, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line },
  signalIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.aqua, marginBottom: 14 },
  signalIconWarning: { backgroundColor: adminColors.coralSoft },
  signalValue: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 29, letterSpacing: -1, marginTop: 3 },
  signalMeta: { color: adminColors.teal, fontFamily: adminFonts.regular, fontSize: 12, lineHeight: 16, marginTop: 5 },
  warning: { color: adminColors.coral },
  decisionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 28 },
  decisionTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 21, letterSpacing: -0.6, marginTop: 5 },
  decisionCount: { color: adminColors.muted, fontFamily: adminFonts.medium, fontSize: 11 },
  feed: { overflow: 'hidden', borderRadius: adminRadius.lg, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line, marginTop: 12 },
  feedRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: adminColors.line },
  feedIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.aqua },
  feedIconWarning: { backgroundColor: adminColors.coralSoft },
  feedCopy: { flex: 1, paddingHorizontal: 11 },
  feedTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 14 },
  feedMeta: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 12, marginTop: 3 },
  feedAction: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 12 },
  allAttention: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 },
  allAttentionText: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 11 },
  emptyFeed: { minHeight: 96, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 12 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.99 }] },
});
