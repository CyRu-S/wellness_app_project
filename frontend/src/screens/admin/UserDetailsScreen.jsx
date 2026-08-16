import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import AdminBarChart from '../../components/admin/AdminBarChart';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminScreen from '../../components/admin/AdminScreen';
import AdminSegmentedControl from '../../components/admin/AdminSegmentedControl';
import { memberAdherence, memberHistory, memberTimeline } from '../../data/adminDemoData';
import { selectAdminMembers } from '../../store/slices/adminSlice';
import { adminColors, adminFonts, adminRadius } from '../../theme/admin';

function Stat({ icon, value, label, last }) {
  return (
    <View style={[styles.stat, !last && styles.statDivider]}>
      <Ionicons name={icon} size={16} color={adminColors.teal} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Overview({ member }) {
  const series = memberAdherence.map((value, index) => ({ label: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][index], value: Math.max(34, Math.min(100, value + member.adherence - 82)) }));
  return (
    <>
      <View style={styles.statsRail}>
        <Stat icon="restaurant-outline" value={`${member.meals}/4`} label="meals" />
        <Stat icon="water-outline" value={`${member.hydration}%`} label="hydration" />
        <Stat icon="flame-outline" value={member.streak} label="day streak" last />
      </View>

      <View style={styles.chartCard}>
        <View style={styles.cardHeading}><View><Text style={styles.cardEyebrow}>SEVEN-DAY ADHERENCE</Text><Text style={styles.cardTitle}>{member.adherence}% average</Text></View><Text style={styles.chartTrend}>{member.adherence >= 75 ? 'On track' : 'Needs care'}</Text></View>
        <AdminBarChart data={series} label={`${member.name} seven day adherence`} />
      </View>

      <View style={styles.planCard}>
        <View style={styles.planTop}><View><Text style={styles.cardEyebrow}>CURRENT PLAN</Text><Text style={styles.planName}>{member.plan}</Text></View><Text style={styles.planProgress}>{member.adherence}%</Text></View>
        <Text style={styles.planGoal}>{member.goal}</Text>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${member.adherence}%` }]} /></View>
        <View style={styles.planFooter}><Text style={styles.planMeta}>Week 3 of 6</Text><Text style={styles.planMeta}>Review in 4 days</Text></View>
      </View>

      {member.attentionReason ? <View style={styles.careNote}><Ionicons name="alert-circle-outline" size={18} color={adminColors.coral} /><View style={styles.careCopy}><Text style={styles.careTitle}>Worth a closer look</Text><Text style={styles.careText}>{member.attentionReason}</Text></View></View> : null}
    </>
  );
}

function Today() {
  return (
    <View style={styles.timelineCard}>
      {memberTimeline.map((item, index) => {
        const done = item.status === 'DONE';
        const upcoming = item.status === 'UPCOMING';
        return (
          <View key={item.id} style={styles.timelineRow}>
            <View style={styles.timelineRail}>
              <View style={[styles.timelineDot, done && styles.timelineDotDone, upcoming && styles.timelineDotUpcoming]}>{done && <Ionicons name="checkmark" size={11} color={adminColors.white} />}</View>
              {index < memberTimeline.length - 1 && <View style={styles.timelineLine} />}
            </View>
            <Text style={styles.timelineTime}>{item.time}</Text>
            <View style={styles.timelineCopy}><Text style={styles.timelineTitle}>{item.title}</Text><Text style={styles.timelineDetail}>{item.detail}</Text><Text style={styles.timelineStatus}>{item.status.replace('_', ' ')}</Text></View>
          </View>
        );
      })}
    </View>
  );
}

function History() {
  return (
    <View style={styles.historyList}>
      {memberHistory.map((item) => (
        <View key={item.id} style={styles.historyRow}>
          <Text style={styles.historyDate}>{item.date}</Text>
          <View style={styles.historyMarker} />
          <View style={styles.historyCopy}><Text style={styles.historyTitle}>{item.title}</Text><Text style={styles.historyDetail}>{item.detail}</Text></View>
        </View>
      ))}
    </View>
  );
}

export default function UserDetailsScreen({ route, navigation }) {
  const members = useSelector(selectAdminMembers);
  const [segment, setSegment] = useState('Overview');
  const member = useMemo(() => members.find((item) => item.id === route.params?.id || item.name === route.params?.name) || members[0], [members, route.params]);
  const active = member.status === 'ACTIVE';

  const prototypeFeedback = (title) => Alert.alert(title, 'This action is ready for its API connection in the next implementation pass.');

  return (
    <AdminScreen>
      <AdminHeader title="Member profile" back onBackPress={() => navigation.goBack()} rightIcon="ellipsis-horizontal" onRightPress={() => prototypeFeedback('Member actions')} />

      <View style={styles.identity}>
        <View style={styles.identityAccent} />
        <View style={styles.avatar}><Text style={styles.avatarText}>{member.initials}</Text></View>
        <View style={styles.identityCopy}>
          <Text style={styles.memberName}>{member.name}</Text>
          <View style={styles.statusLine}><View style={[styles.statusDot, !active && styles.statusDotAway]} /><Text style={styles.statusText}>{member.lastActiveAt}</Text></View>
          <Text numberOfLines={1} style={styles.memberEmail}>{member.email}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Contact ${member.name}`} onPress={() => prototypeFeedback('Contact member')} style={({ pressed }) => [styles.contactButton, pressed && styles.pressed]}><Ionicons name="mail-outline" size={18} color={adminColors.teal} /></Pressable>
      </View>

      <View style={styles.contextRow}>
        <View style={styles.contextBlock}><Text style={styles.contextLabel}>PLAN</Text><Text numberOfLines={1} style={styles.contextValue}>{member.plan}</Text></View>
        <View style={styles.contextDivider} />
        <View style={styles.contextBlock}><Text style={styles.contextLabel}>GOAL</Text><Text numberOfLines={2} style={styles.contextValue}>{member.goal}</Text></View>
      </View>

      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={() => prototypeFeedback('Message member')} style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}><Ionicons name="chatbubble-outline" size={17} color={adminColors.white} /><Text style={styles.primaryText}>Message</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => prototypeFeedback('Adjust plan')} style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}><Ionicons name="options-outline" size={17} color={adminColors.teal} /><Text style={styles.secondaryText}>Adjust plan</Text></Pressable>
      </View>

      <View style={styles.segmentWrap}><AdminSegmentedControl options={['Overview', 'Today', 'History']} value={segment} onChange={setSegment} accessibilityLabel="Member profile section" /></View>

      {segment === 'Overview' && <Overview member={member} />}
      {segment === 'Today' && <Today />}
      {segment === 'History' && <History />}
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  identity: { minHeight: 102, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', padding: 15, borderRadius: adminRadius.lg, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line, marginTop: 24 },
  identityAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: adminColors.teal },
  avatar: { width: 54, height: 54, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.deepTeal },
  avatarText: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 14 },
  identityCopy: { flex: 1, minWidth: 0, paddingHorizontal: 13 },
  memberName: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 19 },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: adminColors.teal },
  statusDotAway: { backgroundColor: adminColors.muted },
  statusText: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 11 },
  memberEmail: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 11, marginTop: 4 },
  contactButton: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.aqua },
  contextRow: { minHeight: 82, flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: adminColors.line },
  contextBlock: { flex: 1, paddingHorizontal: 9 },
  contextDivider: { width: StyleSheet.hairlineWidth, height: 43, backgroundColor: adminColors.line },
  contextLabel: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 11, letterSpacing: 0.9 },
  contextValue: { color: adminColors.ink, fontFamily: adminFonts.medium, fontSize: 12, lineHeight: 17, marginTop: 5 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 14 },
  primaryAction: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: adminRadius.md, backgroundColor: adminColors.teal },
  primaryText: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 12 },
  secondaryAction: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: adminRadius.md, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line },
  secondaryText: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 12 },
  segmentWrap: { marginTop: 21, marginBottom: 12 },
  statsRail: { minHeight: 88, flexDirection: 'row', borderRadius: adminRadius.lg, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line },
  stat: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statDivider: { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: adminColors.line },
  statValue: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 17, marginTop: 4 },
  statLabel: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 11, marginTop: 2 },
  chartCard: { padding: 17, borderRadius: adminRadius.lg, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line, marginTop: 11 },
  cardHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  cardEyebrow: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 11, letterSpacing: 0.9 },
  cardTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 16, marginTop: 4 },
  chartTrend: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 12 },
  planCard: { padding: 17, borderRadius: adminRadius.lg, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line, marginTop: 11 },
  planTop: { flexDirection: 'row', justifyContent: 'space-between' },
  planName: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 17, marginTop: 4 },
  planProgress: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 18 },
  planGoal: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 12, lineHeight: 18, marginTop: 10 },
  progressTrack: { height: 8, overflow: 'hidden', borderRadius: 5, backgroundColor: adminColors.sageSoft, marginTop: 15 },
  progressFill: { height: '100%', borderRadius: 5, backgroundColor: adminColors.teal },
  planFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  planMeta: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 11 },
  careNote: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: adminRadius.lg, backgroundColor: adminColors.coralSoft, marginTop: 11 },
  careCopy: { flex: 1 },
  careTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 12 },
  careText: { color: adminColors.coral, fontFamily: adminFonts.regular, fontSize: 12, marginTop: 3 },
  timelineCard: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: adminRadius.lg, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line },
  timelineRow: { minHeight: 88, flexDirection: 'row', alignItems: 'flex-start', paddingTop: 15 },
  timelineRail: { width: 24, alignItems: 'center', alignSelf: 'stretch' },
  timelineDot: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: adminColors.teal, backgroundColor: adminColors.surface },
  timelineDotDone: { backgroundColor: adminColors.teal },
  timelineDotUpcoming: { borderColor: adminColors.sage },
  timelineLine: { flex: 1, width: 1, backgroundColor: adminColors.line, marginTop: 3 },
  timelineTime: { width: 55, color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 11, paddingTop: 3 },
  timelineCopy: { flex: 1, paddingBottom: 14 },
  timelineTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 13 },
  timelineDetail: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 12, marginTop: 4 },
  timelineStatus: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 11, letterSpacing: 0.5, marginTop: 7 },
  historyList: { overflow: 'hidden', borderRadius: adminRadius.lg, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line },
  historyRow: { minHeight: 78, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: adminColors.line },
  historyDate: { width: 66, color: adminColors.muted, fontFamily: adminFonts.medium, fontSize: 11 },
  historyMarker: { width: 8, height: 8, borderRadius: 4, backgroundColor: adminColors.teal, marginRight: 12 },
  historyCopy: { flex: 1 },
  historyTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 13 },
  historyDetail: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 11, marginTop: 4 },
  pressed: { opacity: 0.7 },
});
