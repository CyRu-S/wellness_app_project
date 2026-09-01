import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import AdminBarChart from '../../components/admin/AdminBarChart';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminScreen from '../../components/admin/AdminScreen';
import AdminSegmentedControl from '../../components/admin/AdminSegmentedControl';
import { selectAdminMealInsights, selectAdminSummary, setInsightRange } from '../../store/slices/adminSlice';
import { adminColors, adminFonts, adminRadius, adminShadow } from '../../theme/admin';

const mealIcons = {
  breakfast: 'sunny-outline',
  lunch: 'restaurant-outline',
  snack: 'nutrition-outline',
  dinner: 'moon-outline',
};

const neutralMealGradients = {
  breakfast: ['#F1FBF9', '#D7F1EC'],
  lunch: ['#F1FBF9', '#D7F1EC'],
  snack: ['#F1FBF9', '#D7F1EC'],
  dinner: ['#F1FBF9', '#D7F1EC'],
};

function MealCoverageCard({ meal, totalMembers, stacked }) {
  return (
    <LinearGradient
      accessible
      accessibilityLabel={`${meal.label}: ${meal.logged} of ${totalMembers} members logged`}
      colors={neutralMealGradients[meal.id] || neutralMealGradients.lunch}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.mealCard, stacked && styles.mealCardStacked]}
    >
      <View style={styles.mealCardTop}>
        <View style={styles.mealIcon}>
          <Ionicons name={mealIcons[meal.id] || 'restaurant-outline'} size={24} color={adminColors.teal} />
        </View>
        <Text style={styles.mealFraction}>{meal.logged}<Text style={styles.mealFractionTotal}>/{totalMembers}</Text></Text>
      </View>
      <Text style={styles.mealName}>{meal.label}</Text>
      <Text style={styles.mealCaption}>members logged</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${meal.completion}%` }]} />
      </View>
    </LinearGradient>
  );
}

function FollowUpRow({ member, last, onPress }) {
  const urgent = member.severity === 'HIGH';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${member.name}. ${member.detail}. ${urgent ? 'Act now' : 'Watch'}`}
      onPress={onPress}
      style={({ pressed }) => [styles.memberRow, urgent && styles.memberRowUrgent, !last && styles.memberRowSpacing, pressed && styles.pressed]}
    >
      <View style={styles.avatar}><Text style={styles.avatarText}>{member.initials}</Text></View>
      <View style={styles.memberCopy}>
        <View style={styles.memberTopline}>
          <Text numberOfLines={1} style={styles.memberName}>{member.name}</Text>
          <Text style={[styles.memberStatus, urgent && styles.memberStatusUrgent]}>{urgent ? 'ACT NOW' : 'WATCH'}</Text>
        </View>
        <Text numberOfLines={2} style={styles.memberDetail}>{member.detail}</Text>
        <Text style={styles.profileHint}>Open member profile</Text>
      </View>
    </Pressable>
  );
}

export default function AdminMealInsightsScreen({ navigation }) {
  const dispatch = useDispatch();
  const insights = useSelector(selectAdminMealInsights);
  const summary = useSelector(selectAdminSummary);
  const { width, fontScale } = useWindowDimensions();
  const range = insights.ranges[insights.selectedRange];
  const totalMembers = summary.totalMembers;
  const completionCount = Math.round((range.completionRate / 100) * totalMembers);
  const countSeries = useMemo(
    () => range.series.map((item) => ({
      ...item,
      value: Math.round((item.value / 100) * totalMembers),
    })),
    [range.series, totalMembers],
  );
  const peak = useMemo(
    () => countSeries.reduce(
      (highest, item) => (item.value > highest.value ? item : highest),
      countSeries[0] || { label: '—', value: 0 },
    ),
    [countSeries],
  );
  const averageCount = countSeries.length
    ? Math.round(countSeries.reduce((total, item) => total + item.value, 0) / countSeries.length)
    : 0;
  const stackedCoverage = width < 340 || fontScale > 1.3;

  return (
    <AdminScreen>
      <AdminHeader title="Meals" back onBackPress={() => navigation.goBack()} />

      <View style={styles.heading}>
        <Text style={styles.eyebrow}>NUTRITION RHYTHM</Text>
        <Text style={styles.title}>See how the club is eating.</Text>
        <Text style={styles.subtitle}>A clear view of logging momentum and the members who may need support.</Text>
      </View>

      <View style={styles.rangeWrap}>
        <AdminSegmentedControl
          accessibilityLabel="Meal insight range"
          options={[{ label: 'Today', value: 'TODAY' }, { label: '7 Days', value: '7D' }, { label: '30 Days', value: '30D' }]}
          value={insights.selectedRange}
          onChange={(value) => dispatch(setInsightRange(value))}
        />
      </View>

      <View style={styles.heroShell}>
        <LinearGradient colors={['#064E55', '#08767B', '#0B9295']} start={{ x: 0.02, y: 0.04 }} end={{ x: 0.98, y: 0.94 }} style={styles.hero}>
          <View pointerEvents="none" style={styles.heroOrb} />
          <View pointerEvents="none" style={styles.heroOrbit} />
          <View style={styles.heroTopline}>
            <View style={styles.heroLabelRow}>
              <Ionicons name="restaurant" size={15} color="#C9F3EB" />
              <Text style={styles.heroLabel}>{range.label.toUpperCase()} MEAL PULSE</Text>
            </View>
            <View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View>
          </View>
          <View style={styles.heroBody}>
            <View style={styles.heroTotal}>
              <Text style={styles.heroValue}>{range.totalLogs.toLocaleString('en-IN')}</Text>
              <Text style={styles.heroValueLabel}>meal logs</Text>
            </View>
          </View>
          <View style={styles.heroFooter}>
            <View style={styles.comparisonPill}>
              <Ionicons name="trending-up" size={15} color="#C9F3EB" />
              <Text style={styles.comparisonText}>{range.comparison}% above previous</Text>
            </View>
            <View style={styles.heroFooterDivider} />
            <View accessible accessibilityLabel={`${completionCount} of ${totalMembers} members completed their meal logs`} style={styles.completionInline}>
              <Text style={styles.completionInlineValue}>{completionCount} / {totalMembers}</Text>
              <Text style={styles.completionInlineLabel}>members completed</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.chartShell}>
        <LinearGradient colors={['#FFFFFF', '#F0FAF7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.chartCard}>
          <View pointerEvents="none" style={styles.chartGlow} />
          <View style={styles.cardTitleRow}>
            <View style={styles.cardHeading}>
              <Text style={styles.cardEyebrow}>LOG COMPLETION</Text>
              <Text style={styles.cardTitle}>Member check-ins</Text>
            </View>
            <View style={styles.countPill}><Text style={styles.countPillText}>COUNT</Text></View>
          </View>
          <View style={styles.chartStage}>
            <AdminBarChart
              data={countSeries}
              label={`${range.label} member meal check-ins`}
              maxValue={totalMembers}
              valueUnit="members"
              valueSuffix=""
            />
          </View>
          <View style={styles.chartStats}>
            <View style={styles.chartStat}>
              <Text style={styles.chartStatValue}>{peak.value}</Text>
              <Text style={styles.chartStatLabel}>peak at {peak.label}</Text>
            </View>
            <View style={styles.chartStatDivider} />
            <View style={styles.chartStat}>
              <Text style={styles.chartStatValue}>{averageCount}</Text>
              <Text style={styles.chartStatLabel}>average members</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.sectionHeading}>
        <View><Text style={styles.sectionEyebrow}>MEAL COVERAGE</Text><Text style={styles.sectionTitle}>Who logged each meal</Text></View>
        <Text style={styles.sectionMeta}>members</Text>
      </View>
      <View style={styles.mealTypes}>
        {insights.mealTypes.map((meal) => (
          <MealCoverageCard key={meal.id} meal={meal} totalMembers={totalMembers} stacked={stackedCoverage} />
        ))}
      </View>

      <View style={styles.sectionHeading}>
        <View><Text style={styles.sectionEyebrow}>FOLLOW-UP JOURNAL</Text><Text style={styles.sectionTitle}>Late or missing</Text></View>
        <Text style={styles.sectionMeta}>{insights.missingMembers.length} members</Text>
      </View>
      <View style={styles.memberList}>
        {insights.missingMembers.map((member, index) => (
          <FollowUpRow
            key={member.memberId}
            member={member}
            last={index === insights.missingMembers.length - 1}
            onPress={() => navigation.navigate('UserDetails', { id: member.memberId })}
          />
        ))}
      </View>
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  heading: { marginTop: 27 },
  eyebrow: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 17, letterSpacing: 1.35 },
  title: { maxWidth: 330, color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 31, lineHeight: 37, letterSpacing: -1.15, marginTop: 7 },
  subtitle: { maxWidth: 340, color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 15, lineHeight: 22, marginTop: 7 },
  rangeWrap: { marginTop: 21 },
  heroShell: { marginTop: 13, borderRadius: 28, backgroundColor: adminColors.deepTeal, ...adminShadow },
  hero: { minHeight: 225, overflow: 'hidden', borderRadius: 28, padding: 19 },
  heroOrb: { position: 'absolute', width: 206, height: 206, borderRadius: 103, right: -78, top: -84, backgroundColor: 'rgba(178,255,241,0.1)' },
  heroOrbit: { position: 'absolute', width: 132, height: 132, borderRadius: 66, right: 14, bottom: -41, borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)' },
  heroTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  heroLabel: { color: '#C9ECE8', fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 17, letterSpacing: 1.15 },
  livePill: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, borderRadius: adminRadius.pill, backgroundColor: 'rgba(255,255,255,0.12)' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#89E5D6' },
  liveText: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 12, letterSpacing: 0.8 },
  heroBody: { flex: 1, justifyContent: 'center', marginTop: 15 },
  heroTotal: { flex: 1, minWidth: 0 },
  heroValue: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 46, lineHeight: 49, letterSpacing: -2 },
  heroValueLabel: { color: '#CFEAE7', fontFamily: adminFonts.medium, fontSize: 15, lineHeight: 20, marginTop: 1 },
  heroFooter: { minHeight: 53, flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.18)' },
  comparisonPill: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, borderRadius: adminRadius.pill, backgroundColor: 'rgba(255,255,255,0.11)' },
  comparisonText: { color: '#D7F0ED', fontFamily: adminFonts.medium, fontSize: 12, lineHeight: 16 },
  heroFooterDivider: { width: 1, height: 31, backgroundColor: 'rgba(255,255,255,0.18)' },
  completionInline: { flex: 1, minWidth: 0 },
  completionInlineValue: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 17, lineHeight: 21 },
  completionInlineLabel: { color: '#CFEAE7', fontFamily: adminFonts.medium, fontSize: 12, lineHeight: 16, marginTop: 1 },
  chartShell: { marginTop: 14, borderTopLeftRadius: 22, borderTopRightRadius: 38, borderBottomRightRadius: 22, borderBottomLeftRadius: 38, backgroundColor: '#D5E7E2', ...adminShadow },
  chartCard: { overflow: 'hidden', padding: 17, borderTopLeftRadius: 22, borderTopRightRadius: 38, borderBottomRightRadius: 22, borderBottomLeftRadius: 38, borderWidth: 1, borderColor: adminColors.line },
  chartGlow: { position: 'absolute', width: 170, height: 170, right: -70, top: -86, borderRadius: 85, backgroundColor: 'rgba(30,177,164,0.1)' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 13 },
  cardHeading: { flex: 1 },
  cardEyebrow: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 17, letterSpacing: 1.05 },
  cardTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 20, lineHeight: 26, letterSpacing: -0.45, marginTop: 3 },
  countPill: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 11, borderRadius: adminRadius.pill, backgroundColor: adminColors.aqua },
  countPillText: { color: adminColors.deepTeal, fontFamily: adminFonts.semibold, fontSize: 12, letterSpacing: 0.8 },
  chartStage: { paddingHorizontal: 10, paddingTop: 7, paddingBottom: 5, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: adminColors.line },
  chartStats: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 13 },
  chartStat: { flex: 1 },
  chartStatValue: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 20, lineHeight: 24 },
  chartStatLabel: { color: adminColors.muted, fontFamily: adminFonts.medium, fontSize: 12, lineHeight: 16, marginTop: 2 },
  chartStatDivider: { width: 1, height: 34, backgroundColor: adminColors.line },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 29, marginBottom: 11 },
  sectionEyebrow: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 17, letterSpacing: 1.05, marginBottom: 3 },
  sectionTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 20, lineHeight: 26, letterSpacing: -0.4 },
  sectionMeta: { color: adminColors.muted, fontFamily: adminFonts.medium, fontSize: 12, marginBottom: 3 },
  mealTypes: { flexDirection: 'row', flexWrap: 'wrap', gap: 11 },
  mealCard: { flexGrow: 1, flexBasis: '47%', minWidth: 0, minHeight: 154, justifyContent: 'space-between', padding: 14, borderRadius: 22, borderWidth: 1, borderColor: '#E0E7E2', ...adminShadow },
  mealCardStacked: { flexBasis: '100%', minHeight: 142 },
  mealCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  mealIcon: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  mealFraction: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 18, lineHeight: 22, letterSpacing: -0.4 },
  mealFractionTotal: { color: adminColors.muted, fontFamily: adminFonts.medium, fontSize: 12, letterSpacing: 0 },
  mealName: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 16, lineHeight: 21, marginTop: 13 },
  mealCaption: { color: adminColors.muted, fontFamily: adminFonts.medium, fontSize: 12, lineHeight: 16, marginTop: 2 },
  progressTrack: { height: 7, overflow: 'hidden', borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.76)', marginTop: 12 },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: adminColors.teal },
  memberList: { overflow: 'visible' },
  memberRow: { minHeight: 103, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, borderRadius: 21, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line, ...adminShadow },
  memberRowUrgent: { backgroundColor: '#FFF9F7', borderColor: '#F2D6D1' },
  memberRowSpacing: { marginBottom: 10 },
  avatar: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.aqua },
  avatarText: { color: adminColors.deepTeal, fontFamily: adminFonts.semibold, fontSize: 12 },
  memberCopy: { flex: 1, minWidth: 0, paddingHorizontal: 10 },
  memberTopline: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  memberName: { flex: 1, color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 14 },
  memberStatus: { color: adminColors.amber, fontFamily: adminFonts.semibold, fontSize: 11, letterSpacing: 0.45 },
  memberStatusUrgent: { color: adminColors.coral },
  memberDetail: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 12, lineHeight: 17, marginTop: 4 },
  profileHint: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 16, marginTop: 7 },
  pressed: { opacity: 0.68 },
});
