import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminScreen from '../../components/admin/AdminScreen';
import {
  approveRequest,
  declineRequest,
  selectAdminApprovals,
  undoApprovalDecision,
} from '../../store/slices/adminSlice';
import { adminColors, adminFonts, adminRadius, adminShadow } from '../../theme/admin';

function RequestCard({ request, expanded, onToggle, onApprove, onDecline }) {
  return (
    <View style={styles.requestShell}>
      <LinearGradient colors={['#FFFFFF', '#EFF8F5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.requestCard}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={`${request.name}, requested ${request.requestedAt}. ${expanded ? 'Hide' : 'Show'} request details`}
          onPress={onToggle}
          style={({ pressed }) => [styles.requestMain, pressed && styles.pressed]}
        >
          <View style={styles.requestTopline}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{request.initials}</Text></View>
            <View style={styles.identityCopy}>
              <Text numberOfLines={1} style={styles.requestName}>{request.name}</Text>
              <Text style={styles.requestMeta}>Requested {request.requestedAt}</Text>
            </View>
            <View style={styles.newLabel}><Text style={styles.newLabelText}>NEW</Text></View>
          </View>

          <View style={styles.recommendationRow}>
            <View style={styles.recommendationCopy}>
              <Text style={styles.recommendationLabel}>RECOMMENDED START</Text>
              <Text numberOfLines={1} style={styles.recommendationValue}>{request.recommendedPlan}</Text>
            </View>
            <View style={styles.expandButton}><Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={adminColors.deepTeal} /></View>
          </View>
        </Pressable>

        {expanded ? (
          <View style={styles.expanded}>
            <View style={styles.goalBlock}>
              <Text style={styles.detailLabel}>MEMBER GOAL</Text>
              <Text style={styles.goalText}>{request.goal}</Text>
            </View>
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Approve ${request.name}`} onPress={onApprove} style={({ pressed }) => [styles.approve, pressed && styles.pressed]}>
                <Ionicons name="checkmark" size={19} color={adminColors.white} />
                <Text style={styles.approveText}>Approve member</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Decline ${request.name}`} onPress={onDecline} style={({ pressed }) => [styles.decline, pressed && styles.pressed]}>
                <Text style={styles.declineText}>Decline</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </LinearGradient>
    </View>
  );
}

export default function AdminApprovalsScreen({ navigation }) {
  const dispatch = useDispatch();
  const requests = useSelector(selectAdminApprovals);
  const lastDecision = useSelector((state) => state.admin.lastApprovalDecision);
  const [expandedId, setExpandedId] = useState(requests[0]?.id ?? null);
  const oldestRequest = requests[requests.length - 1]?.requestedAt || 'None waiting';

  const approve = (request) => {
    dispatch(approveRequest(request.id));
    setExpandedId(null);
  };

  const decline = (request) => {
    Alert.alert(
      `Decline ${request.name}?`,
      'They will not be added to the club. You can undo this immediately afterwards.',
      [
        { text: 'Keep request', style: 'cancel' },
        { text: 'Decline', style: 'destructive', onPress: () => { dispatch(declineRequest(request.id)); setExpandedId(null); } },
      ],
    );
  };

  return (
    <AdminScreen>
      <AdminHeader title="Approvals" back onBackPress={() => navigation.navigate('AdminDashboard')} />

      <View style={styles.heading}>
        <Text style={styles.eyebrow}>MEMBERSHIP DESK</Text>
        <Text style={styles.title}>Build the right community.</Text>
        <Text style={styles.subtitle}>Review each person’s goal and give them the right starting point.</Text>
      </View>

      <View style={styles.heroShell}>
        <LinearGradient colors={['#064E55', '#08767B', '#0B9295']} start={{ x: 0.02, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View pointerEvents="none" style={styles.heroOrb} />
          <View pointerEvents="none" style={styles.heroOrbit} />
          <View style={styles.heroTopline}>
            <View style={styles.heroLabelRow}><Ionicons name="person-add" size={16} color="#C9F3EB" /><Text style={styles.heroLabel}>MEMBERSHIP QUEUE</Text></View>
            <View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View>
          </View>
          <View style={styles.heroStatement}>
            <Text style={styles.heroValue}>{requests.length}</Text>
            <View style={styles.heroStatementCopy}>
              <Text style={styles.heroTitle}>{requests.length === 1 ? 'person is' : 'people are'} ready for review.</Text>
              <Text style={styles.heroSubtitle}>A quick decision keeps the welcome experience moving.</Text>
            </View>
          </View>
          <View style={styles.heroFooter}>
            <View style={styles.heroMetric}><Text style={styles.heroMetricValue}>24 min</Text><Text style={styles.heroMetricLabel}>average response</Text></View>
            <View style={styles.heroDivider} />
            <View style={styles.heroMetric}><Text style={styles.heroMetricValue}>{oldestRequest}</Text><Text style={styles.heroMetricLabel}>oldest request</Text></View>
          </View>
        </LinearGradient>
      </View>

      {lastDecision ? (
        <View accessibilityRole="alert" style={[styles.notice, lastDecision.decision === 'declined' && styles.noticeDeclined]}>
          <View style={[styles.noticeMark, lastDecision.decision === 'declined' && styles.noticeMarkDeclined]}>
            <Ionicons name={lastDecision.decision === 'approved' ? 'checkmark' : 'close'} size={17} color={lastDecision.decision === 'approved' ? adminColors.deepTeal : adminColors.coral} />
          </View>
          <View style={styles.noticeCopy}>
            <Text style={styles.noticeTitle}>{lastDecision.request.name}</Text>
            <Text style={styles.noticeText}>Request {lastDecision.decision}.</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => dispatch(undoApprovalDecision())} style={styles.undoButton}><Text style={styles.undoText}>Undo</Text></Pressable>
        </View>
      ) : null}

      <View style={styles.queueHeading}>
        <View><Text style={styles.queueEyebrow}>REQUEST JOURNAL</Text><Text style={styles.queueTitle}>Ready for review</Text></View>
        <Text style={styles.queueCount}>{requests.length} waiting</Text>
      </View>

      <View style={styles.queue}>
        {requests.map((request) => (
          <RequestCard
            key={request.id}
            request={request}
            expanded={expandedId === request.id}
            onToggle={() => setExpandedId((current) => current === request.id ? null : request.id)}
            onApprove={() => approve(request)}
            onDecline={() => decline(request)}
          />
        ))}
        {requests.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Ionicons name="checkmark-done" size={25} color={adminColors.teal} /></View>
            <Text style={styles.emptyTitle}>The queue is clear</Text>
            <Text style={styles.emptyText}>Every membership request has been reviewed. New requests will appear here.</Text>
          </View>
        ) : null}
      </View>
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  heading: { marginTop: 27 },
  eyebrow: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 17, letterSpacing: 1.35 },
  title: { maxWidth: 330, color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 31, lineHeight: 37, letterSpacing: -1.15, marginTop: 7 },
  subtitle: { maxWidth: 340, color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 15, lineHeight: 22, marginTop: 7 },
  heroShell: { marginTop: 21, borderRadius: 28, backgroundColor: adminColors.deepTeal, ...adminShadow },
  hero: { minHeight: 269, overflow: 'hidden', borderRadius: 28, padding: 19 },
  heroOrb: { position: 'absolute', width: 220, height: 220, right: -78, top: -105, borderRadius: 110, backgroundColor: 'rgba(180,255,242,0.1)' },
  heroOrbit: { position: 'absolute', width: 148, height: 148, right: 8, bottom: -58, borderRadius: 74, borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)' },
  heroTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  heroLabel: { color: '#C9ECE8', fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 17, letterSpacing: 1.15 },
  livePill: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, borderRadius: adminRadius.pill, backgroundColor: 'rgba(255,255,255,0.12)' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#89E5D6' },
  liveText: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 12, letterSpacing: 0.8 },
  heroStatement: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 18 },
  heroValue: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 58, lineHeight: 62, letterSpacing: -2.5 },
  heroStatementCopy: { flex: 1, minWidth: 0 },
  heroTitle: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 20, lineHeight: 25, letterSpacing: -0.4 },
  heroSubtitle: { color: '#CFEAE7', fontFamily: adminFonts.regular, fontSize: 13, lineHeight: 19, marginTop: 4 },
  heroFooter: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 13, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.18)' },
  heroMetric: { flex: 1, minWidth: 0 },
  heroMetricValue: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 18, lineHeight: 22 },
  heroMetricLabel: { color: '#CFEAE7', fontFamily: adminFonts.medium, fontSize: 12, lineHeight: 16, marginTop: 1 },
  heroDivider: { width: 1, height: 35, backgroundColor: 'rgba(255,255,255,0.18)' },
  notice: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 20, backgroundColor: adminColors.aqua, borderWidth: 1, borderColor: adminColors.line, marginTop: 14 },
  noticeDeclined: { backgroundColor: '#FFF8F6', borderColor: '#F2D6D1' },
  noticeMark: { width: 38, height: 38, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.72)' },
  noticeMarkDeclined: { backgroundColor: adminColors.coralSoft },
  noticeCopy: { flex: 1, minWidth: 0 },
  noticeTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 14 },
  noticeText: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 12, marginTop: 2 },
  undoButton: { minWidth: 58, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  undoText: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 13 },
  queueHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, marginTop: 29, marginBottom: 11 },
  queueEyebrow: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 17, letterSpacing: 1.05 },
  queueTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 21, lineHeight: 27, letterSpacing: -0.4, marginTop: 2 },
  queueCount: { color: adminColors.muted, fontFamily: adminFonts.medium, fontSize: 12, marginBottom: 3 },
  queue: { gap: 11 },
  requestShell: { borderTopLeftRadius: 22, borderTopRightRadius: 32, borderBottomRightRadius: 22, borderBottomLeftRadius: 32, backgroundColor: '#D8E8E4', ...adminShadow },
  requestCard: { overflow: 'hidden', borderTopLeftRadius: 22, borderTopRightRadius: 32, borderBottomRightRadius: 22, borderBottomLeftRadius: 32, borderWidth: 1, borderColor: adminColors.line },
  requestMain: { padding: 14 },
  requestTopline: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 46, height: 46, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.aqua },
  avatarText: { color: adminColors.deepTeal, fontFamily: adminFonts.semibold, fontSize: 13 },
  identityCopy: { flex: 1, minWidth: 0, paddingHorizontal: 11 },
  requestName: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 16, lineHeight: 21 },
  requestMeta: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 12, lineHeight: 16, marginTop: 3 },
  newLabel: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: adminRadius.pill, backgroundColor: adminColors.aqua },
  newLabelText: { color: adminColors.deepTeal, fontFamily: adminFonts.semibold, fontSize: 11, letterSpacing: 0.55 },
  recommendationRow: { minHeight: 63, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 13, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: adminColors.line },
  recommendationCopy: { flex: 1, minWidth: 0 },
  recommendationLabel: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 11, lineHeight: 15, letterSpacing: 0.75 },
  recommendationValue: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 14, lineHeight: 19, marginTop: 3 },
  expandButton: { width: 40, height: 40, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.aqua },
  expanded: { padding: 14, paddingTop: 0 },
  goalBlock: { padding: 13, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: adminColors.line },
  detailLabel: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 11, lineHeight: 15, letterSpacing: 0.75 },
  goalText: { color: adminColors.ink, fontFamily: adminFonts.medium, fontSize: 14, lineHeight: 20, marginTop: 5 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 11 },
  approve: { flex: 1, minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 16, backgroundColor: adminColors.teal },
  approveText: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 13 },
  decline: { minWidth: 96, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderWidth: 1, borderColor: '#F0D0CC', backgroundColor: '#FFF9F7' },
  declineText: { color: adminColors.coral, fontFamily: adminFonts.semibold, fontSize: 13 },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 28, borderRadius: adminRadius.lg, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line },
  emptyIcon: { width: 54, height: 54, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.aqua },
  emptyTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 18, marginTop: 14 },
  emptyText: { color: adminColors.muted, fontFamily: adminFonts.regular, textAlign: 'center', fontSize: 13, lineHeight: 19, marginTop: 5 },
  pressed: { opacity: 0.68 },
});
