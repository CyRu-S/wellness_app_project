import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminScreen from '../../components/admin/AdminScreen';
import {
  approveRequest,
  declineRequest,
  selectAdminApprovals,
  undoApprovalDecision,
} from '../../store/slices/adminSlice';
import { adminColors, adminFonts, adminRadius } from '../../theme/admin';

function RequestRow({ request, expanded, onToggle, onApprove, onDecline }) {
  return (
    <View style={styles.requestRow}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={`${request.name}, requested ${request.requestedAt}`} onPress={onToggle} style={({ pressed }) => [styles.requestTop, pressed && styles.pressed]}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{request.initials}</Text></View>
        <View style={styles.requestCopy}>
          <Text style={styles.requestName}>{request.name}</Text>
          <Text style={styles.requestMeta}>Requested {request.requestedAt}</Text>
        </View>
        <View style={styles.planPill}><Text numberOfLines={1} style={styles.planPillText}>{request.recommendedPlan}</Text></View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={17} color={adminColors.muted} />
      </Pressable>

      {expanded && (
        <View style={styles.expanded}>
          <View style={styles.detailBlock}>
            <Text style={styles.detailLabel}>MEMBER GOAL</Text>
            <Text style={styles.detailValue}>{request.goal}</Text>
          </View>
          <View style={styles.detailBlock}>
            <Text style={styles.detailLabel}>RECOMMENDED START</Text>
            <Text style={styles.detailValue}>{request.recommendedPlan}</Text>
          </View>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Approve ${request.name}`} onPress={onApprove} style={({ pressed }) => [styles.approve, pressed && styles.pressed]}>
              <Ionicons name="checkmark" size={18} color={adminColors.white} />
              <Text style={styles.approveText}>Approve</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Decline ${request.name}`} onPress={onDecline} style={({ pressed }) => [styles.decline, pressed && styles.pressed]}>
              <Ionicons name="close" size={18} color={adminColors.coral} />
              <Text style={styles.declineText}>Decline</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

export default function AdminApprovalsScreen() {
  const dispatch = useDispatch();
  const requests = useSelector(selectAdminApprovals);
  const lastDecision = useSelector((state) => state.admin.lastApprovalDecision);
  const [expandedId, setExpandedId] = useState(requests[0]?.id ?? null);

  const decline = (request) => {
    Alert.alert(
      `Decline ${request.name}?`,
      'They will not be added to the club. You can undo the decision immediately afterwards.',
      [
        { text: 'Keep request', style: 'cancel' },
        { text: 'Decline', style: 'destructive', onPress: () => dispatch(declineRequest(request.id)) },
      ],
    );
  };

  return (
    <AdminScreen>
      <AdminHeader title="Approvals" />

      <View style={styles.heading}>
        <Text style={styles.eyebrow}>MEMBERSHIP DESK</Text>
        <Text style={styles.title}><Text style={styles.titleNumber}>{requests.length}</Text> requests waiting.</Text>
        <View style={styles.responseRow}>
          <Ionicons name="time-outline" size={15} color={adminColors.teal} />
          <Text style={styles.responseText}>Average response time is 24 minutes</Text>
        </View>
      </View>

      {lastDecision && (
        <View accessibilityRole="alert" style={[styles.notice, lastDecision.decision === 'declined' && styles.noticeDeclined]}>
          <Ionicons name={lastDecision.decision === 'approved' ? 'checkmark-circle' : 'close-circle'} size={19} color={lastDecision.decision === 'approved' ? adminColors.teal : adminColors.coral} />
          <Text numberOfLines={2} style={styles.noticeText}>{lastDecision.request.name} {lastDecision.decision}.</Text>
          <Pressable accessibilityRole="button" onPress={() => dispatch(undoApprovalDecision())} style={styles.undoButton}><Text style={styles.undoText}>Undo</Text></Pressable>
        </View>
      )}

      <View style={styles.queueHeading}>
        <Text style={styles.queueTitle}>Review queue</Text>
        <Text style={styles.queueHint}>Tap a request to see context</Text>
      </View>

      <View style={styles.queue}>
        {requests.map((request) => (
          <RequestRow
            key={request.id}
            request={request}
            expanded={expandedId === request.id}
            onToggle={() => setExpandedId((current) => current === request.id ? null : request.id)}
            onApprove={() => dispatch(approveRequest(request.id))}
            onDecline={() => decline(request)}
          />
        ))}
        {requests.length === 0 && (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Ionicons name="checkmark-done" size={25} color={adminColors.teal} /></View>
            <Text style={styles.emptyTitle}>The desk is clear</Text>
            <Text style={styles.emptyText}>Every membership request has been reviewed. New requests will appear here.</Text>
          </View>
        )}
      </View>
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  heading: { marginTop: 27 },
  eyebrow: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 11, letterSpacing: 1.4 },
  title: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 30, lineHeight: 36, letterSpacing: -1.1, marginTop: 7 },
  titleNumber: { color: adminColors.teal },
  responseRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 9 },
  responseText: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 13 },
  notice: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13, borderRadius: adminRadius.md, backgroundColor: adminColors.aqua, marginTop: 20 },
  noticeDeclined: { backgroundColor: adminColors.coralSoft },
  noticeText: { flex: 1, color: adminColors.ink, fontFamily: adminFonts.medium, fontSize: 11, lineHeight: 16 },
  undoButton: { minWidth: 52, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  undoText: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 11 },
  queueHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 26, marginBottom: 10 },
  queueTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 16 },
  queueHint: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 11 },
  queue: { gap: 9 },
  requestRow: { overflow: 'hidden', borderRadius: adminRadius.lg, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line },
  requestTop: { minHeight: 75, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13 },
  avatar: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.aqua },
  avatarText: { color: adminColors.deepTeal, fontFamily: adminFonts.semibold, fontSize: 12 },
  requestCopy: { flex: 1, minWidth: 0, paddingHorizontal: 11 },
  requestName: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 14 },
  requestMeta: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 11, marginTop: 3 },
  planPill: { maxWidth: 92, borderRadius: adminRadius.pill, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: adminColors.sageSoft, marginRight: 7 },
  planPillText: { color: adminColors.deepTeal, fontFamily: adminFonts.medium, fontSize: 11 },
  expanded: { padding: 13, paddingTop: 3, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: adminColors.line },
  detailBlock: { paddingTop: 12 },
  detailLabel: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 11, letterSpacing: 0.9 },
  detailValue: { color: adminColors.ink, fontFamily: adminFonts.medium, fontSize: 13, lineHeight: 18, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 15 },
  approve: { flex: 1, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: adminRadius.md, backgroundColor: adminColors.teal },
  approveText: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 12 },
  decline: { minWidth: 102, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: adminRadius.md, backgroundColor: adminColors.coralSoft },
  declineText: { color: adminColors.coral, fontFamily: adminFonts.semibold, fontSize: 12 },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 28, borderRadius: adminRadius.lg, backgroundColor: adminColors.surface },
  emptyIcon: { width: 54, height: 54, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.aqua },
  emptyTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 18, marginTop: 15 },
  emptyText: { color: adminColors.muted, fontFamily: adminFonts.regular, textAlign: 'center', fontSize: 12, lineHeight: 18, marginTop: 5 },
  pressed: { opacity: 0.7 },
});
