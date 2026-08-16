import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import AdminBarChart from '../../components/admin/AdminBarChart';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminScreen from '../../components/admin/AdminScreen';
import AdminSegmentedControl from '../../components/admin/AdminSegmentedControl';
import { selectAdminMealInsights, setInsightRange } from '../../store/slices/adminSlice';
import { adminColors, adminFonts, adminRadius } from '../../theme/admin';

export default function AdminMealInsightsScreen({ navigation }) {
  const dispatch = useDispatch();
  const insights = useSelector(selectAdminMealInsights);
  const range = insights.ranges[insights.selectedRange];

  return (
    <AdminScreen>
      <AdminHeader title="Meals insights" back onBackPress={() => navigation.navigate('AdminDashboard')} />

      <View style={styles.heading}>
        <Text style={styles.eyebrow}>NUTRITION RHYTHM</Text>
        <Text style={styles.title}>Patterns over pressure.</Text>
        <Text style={styles.subtitle}>Understand the club&apos;s logging rhythm and find the members who need a gentler prompt.</Text>
      </View>

      <View style={styles.rangeWrap}>
        <AdminSegmentedControl
          accessibilityLabel="Meal insight range"
          options={[{ label: 'Today', value: 'TODAY' }, { label: '7 Days', value: '7D' }, { label: '30 Days', value: '30D' }]}
          value={insights.selectedRange}
          onChange={(value) => dispatch(setInsightRange(value))}
        />
      </View>

      <View style={styles.overview}>
        <View style={styles.totalBlock}>
          <Text style={styles.metricLabel}>TOTAL LOGS</Text>
          <Text style={styles.totalValue}>{range.totalLogs.toLocaleString('en-IN')}</Text>
          <Text style={styles.comparison}>↑ {range.comparison}% from previous period</Text>
        </View>
        <View accessible accessibilityLabel={`${range.completionRate} percent completion`} style={styles.completionBlock}>
          <View style={styles.completionRing}><Text style={styles.completionValue}>{range.completionRate}%</Text></View>
          <Text style={styles.completionLabel}>completed</Text>
        </View>
      </View>

      <View style={styles.chartCard}>
        <View style={styles.cardTitleRow}>
          <View><Text style={styles.cardEyebrow}>LOG COMPLETION</Text><Text style={styles.cardTitle}>{range.label} rhythm</Text></View>
          <View style={styles.goodPill}><Ionicons name="trending-up" size={13} color={adminColors.teal} /><Text style={styles.goodText}>Steady</Text></View>
        </View>
        <AdminBarChart data={range.series} label={`${range.label} meal completion chart`} />
        <Text style={styles.chartSummary}>Best completion lands around the middle of the period. Every bar includes a visible value and spoken summary.</Text>
      </View>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>By meal type</Text>
        <Text style={styles.sectionMeta}>Completion · logs</Text>
      </View>
      <View style={styles.mealTypes}>
        {insights.mealTypes.map((meal) => (
          <View key={meal.id} accessible accessibilityLabel={`${meal.label}: ${meal.completion} percent, ${meal.logged} logs`} style={styles.mealRow}>
            <View style={styles.mealTop}><Text style={styles.mealName}>{meal.label}</Text><Text style={styles.mealStat}>{meal.completion}% · {meal.logged}</Text></View>
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${meal.completion}%` }]} /></View>
          </View>
        ))}
      </View>

      <View style={styles.sectionHeading}>
        <View><Text style={styles.sectionEyebrow}>FOLLOW-UP</Text><Text style={styles.sectionTitle}>Late or missing</Text></View>
        <Text style={styles.sectionMeta}>{insights.missingMembers.length} members</Text>
      </View>
      <View style={styles.memberList}>
        {insights.missingMembers.map((member) => (
          <Pressable key={member.memberId} accessibilityRole="button" onPress={() => navigation.navigate('UserDetails', { id: member.memberId })} style={({ pressed }) => [styles.memberRow, pressed && styles.pressed]}>
            <View style={[styles.avatar, member.severity === 'HIGH' && styles.avatarHigh]}><Text style={[styles.avatarText, member.severity === 'HIGH' && styles.avatarTextHigh]}>{member.initials}</Text></View>
            <View style={styles.memberCopy}><Text style={styles.memberName}>{member.name}</Text><Text style={styles.memberDetail}>{member.detail}</Text></View>
            <View style={[styles.severityPill, member.severity === 'HIGH' && styles.severityHigh]}><Text style={[styles.severityText, member.severity === 'HIGH' && styles.severityTextHigh]}>{member.severity === 'HIGH' ? 'ACT NOW' : 'WATCH'}</Text></View>
            <Ionicons name="chevron-forward" size={16} color={adminColors.muted} />
          </Pressable>
        ))}
      </View>
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  heading: { marginTop: 27 },
  eyebrow: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 11, letterSpacing: 1.4 },
  title: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 30, lineHeight: 36, letterSpacing: -1.1, marginTop: 7 },
  subtitle: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 14, lineHeight: 21, marginTop: 6 },
  rangeWrap: { marginTop: 20 },
  overview: { minHeight: 135, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderRadius: adminRadius.lg, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line, marginTop: 12 },
  totalBlock: { flex: 1 },
  metricLabel: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 11, letterSpacing: 0.9 },
  totalValue: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 34, letterSpacing: -1.4, marginTop: 6 },
  comparison: { color: adminColors.teal, fontFamily: adminFonts.medium, fontSize: 12, marginTop: 5 },
  completionBlock: { alignItems: 'center' },
  completionRing: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 8, borderColor: adminColors.teal, backgroundColor: adminColors.aqua },
  completionValue: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 17 },
  completionLabel: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 11, marginTop: 5 },
  chartCard: { padding: 17, borderRadius: adminRadius.lg, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line, marginTop: 12 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  cardEyebrow: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 11, letterSpacing: 0.9 },
  cardTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 16, marginTop: 4 },
  goodPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: adminColors.aqua },
  goodText: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 11 },
  chartSummary: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 11, lineHeight: 16, marginTop: 12 },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 27, marginBottom: 10 },
  sectionEyebrow: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 11, letterSpacing: 1, marginBottom: 4 },
  sectionTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 17 },
  sectionMeta: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 11 },
  mealTypes: { gap: 14, padding: 16, borderRadius: adminRadius.lg, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line },
  mealRow: { minHeight: 35 },
  mealTop: { flexDirection: 'row', justifyContent: 'space-between' },
  mealName: { color: adminColors.ink, fontFamily: adminFonts.medium, fontSize: 13 },
  mealStat: { color: adminColors.muted, fontFamily: adminFonts.medium, fontSize: 12 },
  progressTrack: { height: 7, borderRadius: 4, overflow: 'hidden', backgroundColor: adminColors.sageSoft, marginTop: 8 },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: adminColors.teal },
  memberList: { overflow: 'hidden', borderRadius: adminRadius.lg, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line },
  memberRow: { minHeight: 69, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: adminColors.line },
  avatar: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.amberSoft },
  avatarHigh: { backgroundColor: adminColors.coralSoft },
  avatarText: { color: adminColors.amber, fontFamily: adminFonts.semibold, fontSize: 11 },
  avatarTextHigh: { color: adminColors.coral },
  memberCopy: { flex: 1, minWidth: 0, paddingHorizontal: 10 },
  memberName: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 13 },
  memberDetail: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 11, marginTop: 3 },
  severityPill: { borderRadius: 20, paddingHorizontal: 7, paddingVertical: 5, backgroundColor: adminColors.amberSoft, marginRight: 4 },
  severityHigh: { backgroundColor: adminColors.coralSoft },
  severityText: { color: adminColors.amber, fontFamily: adminFonts.semibold, fontSize: 11, letterSpacing: 0.3 },
  severityTextHigh: { color: adminColors.coral },
  pressed: { opacity: 0.7 },
});
