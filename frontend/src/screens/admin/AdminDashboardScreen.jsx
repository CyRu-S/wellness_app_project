import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import Svg, { Path } from 'react-native-svg';
import AdminMealRhythmChart from '../../components/admin/AdminMealRhythmChart';
import AdminScreen from '../../components/admin/AdminScreen';
import AppLogo from '../../components/common/AppLogo';
import useReducedMotion from '../../hooks/useReducedMotion';
import {
  selectAdminApprovals,
  selectAdminAttention,
  selectAdminMealInsights,
  selectAdminSummary,
} from '../../store/slices/adminSlice';
import { adminColors, adminFonts, adminRadius, adminShadow } from '../../theme/admin';

const heroArtwork = require('../../../assets/shake.png');

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getDateLabel() {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'long' }).format(new Date());
}

function Reveal({ children, delay, reduceMotion, style }) {
  const progress = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    progress.setValue(reduceMotion ? 1 : 0);
    Animated.timing(progress, {
      toValue: 1,
      duration: reduceMotion ? 140 : 300,
      delay: reduceMotion ? 0 : delay,
      useNativeDriver: true,
    }).start();
  }, [delay, progress, reduceMotion]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [{ translateY: reduceMotion ? 0 : progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

function CompactSignal({ icon, label, value, meta, tone = 'teal', onPress }) {
  const warning = tone === 'coral';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}. ${meta}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.compactSignalShell,
        warning && styles.compactSignalShellWarning,
        pressed && styles.pressed,
      ]}
    >
      <LinearGradient
        colors={warning ? ['#FFFDFC', '#F9E2DE'] : ['#FFFFFF', '#E3F0E9']}
        start={{ x: 0.08, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.compactSignal, warning && styles.compactSignalWarning]}
      >
        <View pointerEvents="none" style={[styles.compactSignalGlow, warning && styles.compactSignalGlowWarning]} />
        <View style={styles.compactSignalTop}>
          <View style={[styles.compactSignalIcon, warning && styles.compactSignalIconWarning]}>
            <Ionicons name={icon} size={18} color={warning ? adminColors.coral : adminColors.deepTeal} />
          </View>
          <Ionicons name="arrow-up-outline" size={18} color={warning ? adminColors.coral : adminColors.deepTeal} style={styles.diagonalArrow} />
        </View>
        <Text style={styles.compactSignalLabel}>{label}</Text>
        <Text style={styles.compactSignalValue}>{value}</Text>
        <Text style={[styles.compactSignalMeta, warning && styles.coralText]}>{meta}</Text>
      </LinearGradient>
    </Pressable>
  );
}

function PriorityRow({ item, last, onPress }) {
  const urgent = item.kind === 'attention' && item.severity === 'HIGH';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${item.detail}. ${item.action}`}
      onPress={onPress}
      style={({ pressed }) => [styles.priorityRow, pressed && styles.priorityPressed]}
    >
      <View style={styles.timelineColumn}>
        {!last && <View style={styles.timelineLine} />}
        <View style={[styles.timelineMarker, urgent && styles.timelineMarkerUrgent]}>
          <Ionicons name={item.kind === 'approval' ? 'person-add' : 'alert'} size={14} color={urgent ? adminColors.coral : adminColors.deepTeal} />
        </View>
      </View>
      <View style={[styles.priorityContent, !last && styles.priorityDivider]}>
        <View style={styles.priorityTopline}>
          <Text style={styles.priorityTitle}>{item.title}</Text>
          <View style={[styles.priorityTag, urgent && styles.priorityTagUrgent]}>
            <Text style={[styles.priorityTagText, urgent && styles.coralText]}>{item.badge}</Text>
          </View>
        </View>
        <Text style={styles.priorityDetail}>{item.detail}</Text>
        <View style={styles.priorityAction}>
          <Text style={[styles.priorityActionText, urgent && styles.coralText]}>{item.action}</Text>
          <Ionicons name="arrow-forward" size={16} color={urgent ? adminColors.coral : adminColors.teal} />
        </View>
      </View>
    </Pressable>
  );
}

export default function AdminDashboardScreen({ navigation }) {
  const summary = useSelector(selectAdminSummary);
  const approvals = useSelector(selectAdminApprovals);
  const attention = useSelector(selectAdminAttention);
  const insights = useSelector(selectAdminMealInsights);
  const admin = useSelector((state) => state.auth.user);
  const reduceMotion = useReducedMotion();
  const { width, fontScale } = useWindowDimensions();
  const [heroWidth, setHeroWidth] = useState(0);
  const firstName = admin?.name?.split(' ')[0] || 'Coach';
  const openAttention = useMemo(() => attention.filter((item) => item.status !== 'RESOLVED'), [attention]);
  const highPriorityCount = openAttention.filter((item) => item.severity === 'HIGH').length;
  const compactHero = (heroWidth > 0 ? heroWidth < 350 : width < 390) || fontScale > 1.15;
  const stackedMosaic = width < 340 || fontScale > 1.25;
  const activeMemberRatio = summary.totalMembers
    ? Math.min(100, Math.round((summary.activeUsers / summary.totalMembers) * 100))
    : 0;
  const todaySeries = insights.ranges.TODAY.series;
  const todayMemberSeries = useMemo(
    () => todaySeries.map((item) => ({
      ...item,
      value: Math.round((item.value / 100) * summary.totalMembers),
    })),
    [summary.totalMembers, todaySeries],
  );
  const latestMealValue = todayMemberSeries[todayMemberSeries.length - 1]?.value || 0;
  const peakMealPoint = useMemo(
    () => todayMemberSeries.reduce(
      (peak, item) => (item.value > peak.value ? item : peak),
      todayMemberSeries[0] || { label: '—', value: 0 },
    ),
    [todayMemberSeries],
  );
  const chartSummary = todayMemberSeries.map((item) => `${item.label}: ${item.value} members`).join(', ');

  const priorityItems = useMemo(() => {
    const urgentAttention = openAttention
      .filter((item) => item.severity === 'HIGH')
      .map((item) => ({
        ...item,
        key: `attention-${item.id}`,
        kind: 'attention',
        badge: 'Act now',
        detail: `${item.title} · ${item.missedAt}`,
        action: 'Open profile',
      }));
    const approvalItems = approvals.map((item) => ({
      ...item,
      key: `approval-${item.id}`,
      kind: 'approval',
      badge: 'Approval',
      title: item.name,
      detail: `Membership request · ${item.requestedAt}`,
      action: 'Review request',
    }));
    const watchAttention = openAttention
      .filter((item) => item.severity !== 'HIGH')
      .map((item) => ({
        ...item,
        key: `attention-${item.id}`,
        kind: 'attention',
        badge: 'Watch',
        detail: `${item.title} · ${item.missedAt}`,
        action: 'Open profile',
      }));
    return [...urgentAttention, ...approvalItems, ...watchAttention].slice(0, 4);
  }, [approvals, openAttention]);

  const openRoute = (route, params) => {
    Haptics.selectionAsync().catch(() => {});
    navigation.navigate(route, params);
  };

  return (
    <AdminScreen contentStyle={styles.screenContent}>
      <Reveal delay={20} reduceMotion={reduceMotion}>
        <View style={styles.utilityHeader}>
          <View style={styles.brandCluster}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open admin profile"
              accessibilityHint="Opens your profile and account details"
              onPress={() => openRoute('AdminProfile')}
              style={({ pressed }) => [styles.brandButton, pressed && styles.pressed]}
            >
              <AppLogo size={46} style={styles.brandLogo} />
              <View style={styles.brandStatus} />
            </Pressable>
            <View>
              <Text style={styles.date}>{getDateLabel()}</Text>
              <Text style={styles.deskLabel}>Mr_Care ADMIN DESK</Text>
            </View>
          </View>
        </View>

        <View style={styles.heading}>
          <Text style={styles.title}>{getGreeting()}, {firstName}.</Text>
          <Text style={styles.subtitle}>Here’s the shape of your club today.</Text>
        </View>
      </Reveal>

      <Reveal delay={70} reduceMotion={reduceMotion}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${summary.onTrackPercentage} percent of ${summary.totalMembers} members are on track. ${summary.activeUsers} members active now. Open members.`}
          onPress={() => openRoute('UserList')}
          onLayout={(event) => setHeroWidth(event.nativeEvent.layout.width)}
          style={({ pressed }) => [styles.heroPressable, pressed && styles.heroPressed]}
        >
          <LinearGradient
            colors={['#064E55', '#08767B', '#0B9295']}
            start={{ x: 0.02, y: 0.05 }}
            end={{ x: 0.98, y: 0.9 }}
            style={styles.hero}
          >
            <View pointerEvents="none" style={styles.heroGlow} />
            <View pointerEvents="none" style={styles.heroOrbit} />

            <View style={styles.heroTopline}>
              <View style={styles.heroEyebrowWrap}>
                <Ionicons name="sparkles" size={15} color="#C9F3EB" />
                <Text style={styles.heroEyebrow}>TODAY’S CLUB RHYTHM</Text>
              </View>
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>

            <View style={[styles.heroStage, compactHero && styles.heroStageCompact]}>
              <View style={[styles.heroCopy, compactHero && styles.heroCopyCompact]}>
                <Text style={[styles.heroDisplay, compactHero && styles.heroDisplayCompact]}>Your club is{`\n`}finding its{`\n`}rhythm.</Text>
                <Text style={styles.heroSubcopy}>A strong meal day with one clear hydration opportunity.</Text>
              </View>
              <Image
                accessibilityIgnoresInvertColors
                source={heroArtwork}
                resizeMode="contain"
                style={[styles.heroArtwork, compactHero ? styles.heroArtworkCompact : styles.heroArtworkRegular]}
              />
            </View>

            <View style={[styles.scoreBubble, compactHero && styles.scoreBubbleCompact]}>
              <Text style={styles.scoreValue}>{summary.onTrackPercentage}%</Text>
              <Text style={styles.scoreLabel}>on track</Text>
            </View>

            <View pointerEvents="none" style={styles.heroCurve}>
              <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                <Path d="M0 38 C23 72 61 68 100 20 L100 100 L0 100 Z" fill={adminColors.canvas} />
              </Svg>
            </View>

            <View style={styles.heroFooter}>
              <LinearGradient
                colors={['#ECF8F4', '#D8ECE6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroStatsRail}
              >
                <View pointerEvents="none" style={styles.memberPulseOrb} />
                <View style={styles.memberPulseTopline}>
                  <View style={styles.memberPulseLabelWrap}>
                    <View style={styles.heroActiveDot} />
                    <Text style={styles.memberPulseLabel}>MEMBER PULSE</Text>
                  </View>
                  <View style={styles.membersAction}>
                    <Text style={styles.membersActionText}>Members</Text>
                    <Ionicons name="arrow-up-outline" size={16} color={adminColors.white} style={styles.diagonalArrow} />
                  </View>
                </View>

                <View style={styles.memberPulseValues}>
                  <View style={styles.activeMemberValueWrap}>
                    <Text style={styles.activeMemberValue}>{summary.activeUsers}</Text>
                    <Text style={styles.activeMemberLabel}>active now</Text>
                  </View>
                  <View style={styles.totalMemberValueWrap}>
                    <Text style={styles.totalMemberValue}>of {summary.totalMembers}</Text>
                    <Text style={styles.totalMemberLabel}>club members</Text>
                  </View>
                </View>

                <View style={styles.memberProgressTrack}>
                  <View style={[styles.memberProgressFill, { width: `${activeMemberRatio}%` }]} />
                </View>
                <Text style={styles.memberProgressCaption}>{activeMemberRatio}% of the club is active right now</Text>
              </LinearGradient>
            </View>
          </LinearGradient>
        </Pressable>
      </Reveal>

      <Reveal delay={120} reduceMotion={reduceMotion}>
        <View style={styles.sectionIntro}>
          <View>
            <Text style={styles.sectionEyebrow}>LIVE SIGNALS</Text>
            <Text style={styles.signalHeading}>What’s moving today</Text>
          </View>
          <Text style={styles.sectionMeta}>Just now</Text>
        </View>
        <View style={[styles.signalMosaic, stackedMosaic && styles.signalMosaicStacked]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Meals, ${summary.mealLogsToday}. Up ${summary.mealComparison} percent today`}
            onPress={() => openRoute('Reports')}
            style={({ pressed }) => [styles.mealFeatureShell, pressed && styles.pressed]}
          >
            <LinearGradient
              colors={['#DDF7F3', '#9EDDD8']}
              start={{ x: 0.08, y: 0 }}
              end={{ x: 0.95, y: 1 }}
              style={styles.mealFeature}
            >
              <View pointerEvents="none" style={styles.mealFeatureOrb} />
              <View pointerEvents="none" style={styles.mealFeatureOrbSmall} />
              <View style={styles.mealFeatureTop}>
                <View style={styles.mealFeatureIcon}><Ionicons name="restaurant" size={19} color={adminColors.deepTeal} /></View>
                <View style={styles.signalArrowButton}>
                  <Ionicons name="arrow-up-outline" size={18} color={adminColors.white} style={styles.diagonalArrow} />
                </View>
              </View>
              <Text style={styles.mealFeatureLabel}>MEALS LOGGED</Text>
              <Text style={styles.mealFeatureValue}>{summary.mealLogsToday}</Text>
              <View style={styles.mealFeatureBottom}>
                <Text style={styles.mealFeatureMeta}>↑ {summary.mealComparison}% from yesterday</Text>
                <View style={styles.microBars}>
                  {[36, 58, 44, 76, 62].map((height, index) => <View key={index} style={[styles.microBar, { height: height / 2 }]} />)}
                </View>
              </View>
            </LinearGradient>
          </Pressable>
          <View style={[styles.compactSignalStack, stackedMosaic && styles.compactSignalStackWide]}>
            <CompactSignal icon="checkmark-done-outline" label="Approvals" value={summary.pendingApprovals} meta="24 min average" onPress={() => openRoute('UserRequests')} />
            <CompactSignal icon="alert-circle-outline" label="Attention" value={openAttention.length} meta={`${highPriorityCount} high priority`} tone="coral" onPress={() => openRoute('Alerts')} />
          </View>
        </View>
      </Reveal>

      <Reveal delay={180} reduceMotion={reduceMotion}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open today's meal insights. Member check-ins through today: ${chartSummary}`}
          onPress={() => openRoute('Reports')}
          style={({ pressed }) => [styles.rhythmPanelShell, pressed && styles.panelPressed]}
        >
          <LinearGradient
            colors={['#FFFFFF', '#F0FAF7']}
            start={{ x: 0.06, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.rhythmPanel}
          >
            <View pointerEvents="none" style={styles.rhythmGlow} />
            <View style={styles.rhythmHeader}>
              <View style={styles.rhythmHeadingCopy}>
                <Text style={styles.sectionEyebrow}>TODAY’S MEAL RHYTHM</Text>
                <Text style={styles.rhythmTitle}>Members checking in</Text>
              </View>
              <View style={styles.nowMetric}>
                <Text style={styles.nowMetricValue}>{latestMealValue}</Text>
                <Text style={styles.nowMetricLabel}>members now</Text>
              </View>
            </View>
            <View style={styles.chartStage}>
              <AdminMealRhythmChart
                data={todayMemberSeries}
                label="Today's member meal check-ins"
                maxValue={summary.totalMembers}
                valueUnit="members"
                valueSuffix=""
                accessible={false}
              />
            </View>
            <View style={styles.rhythmStats}>
              <View style={styles.rhythmStat}>
                <Text style={styles.rhythmStatValue}>{peakMealPoint.value}</Text>
                <Text style={styles.rhythmStatLabel}>peak at {peakMealPoint.label}</Text>
              </View>
              <View style={styles.rhythmStatDivider} />
              <View style={styles.rhythmStat}>
                <Text style={styles.rhythmStatValue}>{summary.mealLogsToday}</Text>
                <Text style={styles.rhythmStatLabel}>total logs today</Text>
              </View>
              <View style={styles.rhythmAction}>
                <Ionicons name="arrow-forward" size={19} color={adminColors.white} />
              </View>
            </View>
          </LinearGradient>
        </Pressable>
      </Reveal>

      <Reveal delay={240} reduceMotion={reduceMotion}>
        <View style={styles.priorityHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>YOUR NEXT MOVES</Text>
            <Text style={styles.priorityHeading}>Needs your decision</Text>
          </View>
          <Text style={styles.openCount}>{approvals.length + openAttention.length} open</Text>
        </View>

        {priorityItems.length ? (
          <View style={styles.timeline}>
            {priorityItems.map((item, index) => (
              <PriorityRow
                key={item.key}
                item={item}
                last={index === priorityItems.length - 1}
                onPress={() => item.kind === 'approval' ? openRoute('UserRequests') : openRoute('UserDetails', { id: item.memberId })}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}><Ionicons name="checkmark" size={21} color={adminColors.deepTeal} /></View>
            <View style={styles.emptyCopy}>
              <Text style={styles.emptyTitle}>The desk is clear.</Text>
              <Text style={styles.emptyText}>Nothing needs your decision right now.</Text>
            </View>
          </View>
        )}
      </Reveal>
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  screenContent: { paddingBottom: 34 },
  utilityHeader: { minHeight: 54, flexDirection: 'row', alignItems: 'center' },
  brandCluster: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  brandLogo: { borderWidth: 1, borderColor: adminColors.line, ...adminShadow },
  brandStatus: { position: 'absolute', right: 0, bottom: 1, width: 13, height: 13, borderRadius: 7, backgroundColor: adminColors.teal, borderWidth: 2, borderColor: adminColors.canvas },
  date: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 14, lineHeight: 19 },
  deskLabel: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 1.05, marginTop: 1 },
  heading: { marginTop: 26 },
  title: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 34, lineHeight: 40, letterSpacing: -1.3 },
  subtitle: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 16, lineHeight: 23, marginTop: 5 },
  heroPressable: { borderRadius: 31, marginTop: 23, ...adminShadow },
  heroPressed: { opacity: 0.95, transform: [{ scale: 0.993 }] },
  hero: { overflow: 'hidden', minHeight: 408, borderRadius: 31, padding: 20, paddingBottom: 14 },
  heroGlow: { position: 'absolute', width: 280, height: 280, borderRadius: 140, right: -72, top: -115, backgroundColor: 'rgba(174,255,242,0.1)' },
  heroOrbit: { position: 'absolute', width: 154, height: 154, borderRadius: 77, right: 11, top: 73, borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)' },
  heroTopline: { zIndex: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroEyebrowWrap: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  heroEyebrow: { color: '#C9ECE8', fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 17, letterSpacing: 1.35 },
  livePill: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, borderRadius: adminRadius.pill, backgroundColor: 'rgba(255,255,255,0.12)' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#89E5D6' },
  liveText: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 12, letterSpacing: 0.8 },
  heroStage: { zIndex: 2, minHeight: 275, marginTop: 5 },
  heroStageCompact: { minHeight: 288 },
  heroCopy: { zIndex: 4, maxWidth: 158, marginTop: 22 },
  heroCopyCompact: { maxWidth: 145, marginTop: 20 },
  heroDisplay: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 35, lineHeight: 37, letterSpacing: -1.45 },
  heroDisplayCompact: { fontSize: 30, lineHeight: 33, letterSpacing: -1.1 },
  heroSubcopy: { maxWidth: 156, color: '#CFEAE7', fontFamily: adminFonts.regular, fontSize: 13, lineHeight: 19, marginTop: 13 },
  heroArtwork: { zIndex: 3, position: 'absolute' },
  heroArtworkRegular: { width: 244, height: 244, right: -34, top: 34 },
  heroArtworkCompact: { width: 215, height: 215, left: 175, top: 72 },
  scoreBubble: { zIndex: 7, position: 'absolute', width: 76, height: 76, right: 9, top: 246, borderRadius: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.coral, borderWidth: 4, borderColor: 'rgba(255,255,255,0.78)', transform: [{ rotate: '6deg' }], ...adminShadow },
  scoreBubbleCompact: { right: 2, top: 272 },
  scoreValue: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 21, lineHeight: 25, letterSpacing: -0.5 },
  scoreLabel: { color: '#FFF1EE', fontFamily: adminFonts.medium, fontSize: 12, lineHeight: 15 },
  heroCurve: { zIndex: 4, position: 'absolute', left: 0, right: 0, bottom: 0, height: 156 },
  heroFooter: { zIndex: 6, minHeight: 136, flexDirection: 'row', alignItems: 'center', marginTop: 28 },
  heroStatsRail: { minHeight: 132, flex: 1, overflow: 'hidden', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 24, borderWidth: 1, borderColor: '#C4E2DC' },
  memberPulseOrb: { position: 'absolute', width: 118, height: 118, right: -45, bottom: -63, borderRadius: 59, backgroundColor: 'rgba(255,255,255,0.34)' },
  memberPulseTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  memberPulseLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  memberPulseLabel: { color: adminColors.deepTeal, fontFamily: adminFonts.semibold, fontSize: 11, lineHeight: 16, letterSpacing: 1.1 },
  heroActiveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: adminColors.teal, borderWidth: 2, borderColor: '#A8E0D8' },
  membersAction: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, borderRadius: adminRadius.pill, backgroundColor: adminColors.deepTeal },
  membersActionText: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 16 },
  memberPulseValues: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 9 },
  activeMemberValueWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  activeMemberValue: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 34, lineHeight: 38, letterSpacing: -1.2 },
  activeMemberLabel: { color: adminColors.deepTeal, fontFamily: adminFonts.medium, fontSize: 13, lineHeight: 18, marginBottom: 3 },
  totalMemberValueWrap: { alignItems: 'flex-end', marginBottom: 3 },
  totalMemberValue: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 16, lineHeight: 20 },
  totalMemberLabel: { color: adminColors.muted, fontFamily: adminFonts.medium, fontSize: 12, lineHeight: 16 },
  memberProgressTrack: { height: 6, overflow: 'hidden', borderRadius: 3, backgroundColor: 'rgba(7,95,103,0.13)', marginTop: 9 },
  memberProgressFill: { height: 6, borderRadius: 3, backgroundColor: adminColors.teal },
  memberProgressCaption: { color: adminColors.deepTeal, fontFamily: adminFonts.medium, fontSize: 11, lineHeight: 15, marginTop: 5 },
  diagonalArrow: { transform: [{ rotate: '45deg' }] },
  sectionIntro: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 30 },
  sectionEyebrow: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 17, letterSpacing: 1.25 },
  sectionMeta: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 13 },
  signalHeading: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 23, lineHeight: 29, letterSpacing: -0.6, marginTop: 4 },
  signalMosaic: { minHeight: 218, flexDirection: 'row', gap: 11, marginTop: 14 },
  signalMosaicStacked: { flexDirection: 'column' },
  mealFeatureShell: { flex: 1.18, minWidth: 0, minHeight: 218, borderTopLeftRadius: 22, borderTopRightRadius: 38, borderBottomRightRadius: 22, borderBottomLeftRadius: 38, backgroundColor: '#B5DDD7', ...adminShadow },
  mealFeature: { flex: 1, minHeight: 218, overflow: 'hidden', padding: 16, borderTopLeftRadius: 22, borderTopRightRadius: 38, borderBottomRightRadius: 22, borderBottomLeftRadius: 38, borderWidth: 1, borderColor: 'rgba(255,255,255,0.82)' },
  mealFeatureOrb: { position: 'absolute', width: 116, height: 116, right: -42, bottom: -26, borderRadius: 58, backgroundColor: 'rgba(255,255,255,0.32)' },
  mealFeatureOrbSmall: { position: 'absolute', width: 58, height: 58, left: -20, top: 62, borderRadius: 29, backgroundColor: 'rgba(255,255,255,0.2)' },
  mealFeatureTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mealFeatureIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.77)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.92)' },
  signalArrowButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.deepTeal },
  mealFeatureLabel: { color: adminColors.deepTeal, fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 17, letterSpacing: 1.1, marginTop: 18 },
  mealFeatureValue: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 46, lineHeight: 50, letterSpacing: -2, marginTop: 1 },
  mealFeatureBottom: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 4 },
  mealFeatureMeta: { flex: 1, color: adminColors.deepTeal, fontFamily: adminFonts.medium, fontSize: 12, lineHeight: 17 },
  microBars: { height: 40, flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  microBar: { width: 5, borderRadius: 3, backgroundColor: adminColors.teal },
  compactSignalStack: { flex: 0.92, gap: 11 },
  compactSignalStackWide: { width: '100%', flex: 0 },
  compactSignalShell: { flex: 1, minHeight: 103, borderTopLeftRadius: 26, borderTopRightRadius: 18, borderBottomRightRadius: 26, borderBottomLeftRadius: 18, backgroundColor: '#DDE8E1', ...adminShadow },
  compactSignalShellWarning: { borderTopLeftRadius: 18, borderTopRightRadius: 26, borderBottomRightRadius: 18, borderBottomLeftRadius: 26, backgroundColor: '#E9D0CB' },
  compactSignal: { flex: 1, minHeight: 103, overflow: 'hidden', padding: 13, borderTopLeftRadius: 26, borderTopRightRadius: 18, borderBottomRightRadius: 26, borderBottomLeftRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' },
  compactSignalWarning: { borderTopLeftRadius: 18, borderTopRightRadius: 26, borderBottomRightRadius: 18, borderBottomLeftRadius: 26 },
  compactSignalGlow: { position: 'absolute', width: 76, height: 76, borderRadius: 38, right: -21, bottom: -28, backgroundColor: 'rgba(0,151,156,0.09)' },
  compactSignalGlowWarning: { backgroundColor: 'rgba(231,92,75,0.1)' },
  compactSignalTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  compactSignalIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.82)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.96)' },
  compactSignalIconWarning: { backgroundColor: 'rgba(255,255,255,0.7)' },
  compactSignalLabel: { color: adminColors.muted, fontFamily: adminFonts.medium, fontSize: 12, lineHeight: 16, marginTop: 8 },
  compactSignalValue: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 27, lineHeight: 31, letterSpacing: -0.8 },
  compactSignalMeta: { color: adminColors.deepTeal, fontFamily: adminFonts.medium, fontSize: 12, lineHeight: 16, marginTop: 1 },
  coralText: { color: adminColors.coral },
  rhythmPanelShell: { marginTop: 31, borderTopLeftRadius: 22, borderTopRightRadius: 38, borderBottomRightRadius: 22, borderBottomLeftRadius: 38, backgroundColor: '#D5E7E2', ...adminShadow },
  rhythmPanel: { overflow: 'hidden', padding: 18, borderTopLeftRadius: 22, borderTopRightRadius: 38, borderBottomRightRadius: 22, borderBottomLeftRadius: 38, borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' },
  rhythmGlow: { position: 'absolute', width: 190, height: 190, right: -76, top: -90, borderRadius: 95, backgroundColor: 'rgba(30,177,164,0.11)' },
  panelPressed: { opacity: 0.85, transform: [{ scale: 0.995 }] },
  rhythmHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
  rhythmHeadingCopy: { flex: 1 },
  rhythmTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 21, lineHeight: 27, letterSpacing: -0.5, marginTop: 5 },
  nowMetric: { minWidth: 79, alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.78)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.96)' },
  nowMetricValue: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 24, lineHeight: 28, letterSpacing: -0.6 },
  nowMetricLabel: { color: adminColors.muted, fontFamily: adminFonts.medium, fontSize: 12, lineHeight: 16, marginTop: 1 },
  chartStage: { paddingHorizontal: 11, paddingTop: 10, paddingBottom: 6, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.66)', borderWidth: 1, borderColor: 'rgba(207,231,225,0.9)' },
  rhythmStats: { minHeight: 65, flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, paddingTop: 13, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: adminColors.line },
  rhythmStat: { flex: 1, minWidth: 0 },
  rhythmStatValue: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 20, lineHeight: 24, letterSpacing: -0.4 },
  rhythmStatLabel: { color: adminColors.muted, fontFamily: adminFonts.medium, fontSize: 12, lineHeight: 16, marginTop: 2 },
  rhythmStatDivider: { width: 1, height: 34, backgroundColor: adminColors.line },
  rhythmAction: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.deepTeal },
  priorityHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 33 },
  priorityHeading: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 24, lineHeight: 30, letterSpacing: -0.7, marginTop: 5 },
  openCount: { color: adminColors.muted, fontFamily: adminFonts.medium, fontSize: 13, marginBottom: 4 },
  timeline: { marginTop: 12 },
  priorityRow: { minHeight: 112, flexDirection: 'row' },
  priorityPressed: { opacity: 0.64 },
  timelineColumn: { width: 38, alignItems: 'center' },
  timelineLine: { position: 'absolute', top: 37, bottom: -8, width: 1, backgroundColor: adminColors.line },
  timelineMarker: { zIndex: 1, width: 31, height: 31, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.aqua, borderWidth: 3, borderColor: adminColors.canvas, marginTop: 7 },
  timelineMarkerUrgent: { backgroundColor: adminColors.coralSoft },
  priorityContent: { flex: 1, minWidth: 0, paddingLeft: 8, paddingTop: 6, paddingBottom: 17 },
  priorityDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: adminColors.line },
  priorityTopline: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  priorityTitle: { flex: 1, color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 16, lineHeight: 22 },
  priorityTag: { flexShrink: 0, paddingHorizontal: 9, paddingVertical: 5, borderRadius: adminRadius.pill, backgroundColor: adminColors.aqua },
  priorityTagUrgent: { backgroundColor: adminColors.coralSoft },
  priorityTagText: { color: adminColors.deepTeal, fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 16 },
  priorityDetail: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 13, lineHeight: 19, marginTop: 6 },
  priorityAction: { minHeight: 32, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 7, marginTop: 6 },
  priorityActionText: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 14 },
  emptyState: { minHeight: 112, flexDirection: 'row', alignItems: 'center', paddingVertical: 17, borderTopWidth: 1, borderBottomWidth: 1, borderColor: adminColors.line, marginTop: 13 },
  emptyIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.aqua },
  emptyCopy: { flex: 1, paddingLeft: 13 },
  emptyTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 16 },
  emptyText: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 13, lineHeight: 19, marginTop: 3 },
  pressed: { opacity: 0.68, transform: [{ scale: 0.98 }] },
});
