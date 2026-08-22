import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminScreen from '../../components/admin/AdminScreen';
import {
  loadAdminMemberAccess,
  selectMemberAccessOverview,
  selectMemberAccessOverviewRequest,
  selectMemberAccessSource,
} from '../../store/slices/memberAccessSlice';
import {
  adminColors,
  adminFonts,
  adminRadius,
  adminShadow,
} from '../../theme/admin';

const initialsFor = (name = '') => name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase())
  .join('');

const formatGrantTime = (value) => {
  if (!value) return 'No access assigned';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Access recently updated';
  return `Updated ${date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;
};

function ViewerCard({ viewer, onPress }) {
  const hasAccess = viewer.assignedCount > 0;
  const preview = viewer.assignedMembers.slice(0, 3);
  const remaining = Math.max(0, viewer.assignedCount - preview.length);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${viewer.name}. ${viewer.assignedCount} ${viewer.assignedCount === 1 ? 'member' : 'members'} assigned. Manage access.`}
      onPress={onPress}
      style={({ pressed }) => [styles.viewerShell, pressed && styles.pressed]}
    >
      <View style={styles.viewerCard}>
        <View style={styles.viewerTopline}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initialsFor(viewer.name)}</Text>
          </View>
          <View style={styles.viewerIdentity}>
            <Text numberOfLines={1} style={styles.viewerName}>{viewer.name}</Text>
            <Text style={styles.viewerMeta}>{formatGrantTime(viewer.lastGrantedAt)}</Text>
          </View>
          <View style={[styles.countPill, !hasAccess && styles.countPillEmpty]}>
            <Text style={[styles.countValue, !hasAccess && styles.countValueEmpty]}>{viewer.assignedCount}</Text>
            <Text style={[styles.countLabel, !hasAccess && styles.countValueEmpty]}>ACCESS</Text>
          </View>
        </View>

        <View style={styles.assignmentBlock}>
          <Text style={styles.assignmentLabel}>{hasAccess ? 'CAN VIEW TODAY' : 'NO SHARED MEMBERS'}</Text>
          {hasAccess ? (
            <View style={styles.memberPreviewRow}>
              {preview.map((member) => (
                <View key={member.id} style={styles.memberChip}>
                  <View style={styles.memberChipDot} />
                  <Text numberOfLines={1} style={styles.memberChipText}>{member.name.split(' ')[0]}</Text>
                </View>
              ))}
              {remaining > 0 ? <Text style={styles.remainingText}>+{remaining} more</Text> : null}
            </View>
          ) : (
            <Text style={styles.emptyAssignmentText}>Choose members whose daily activity this person can follow.</Text>
          )}
        </View>

        <View style={styles.manageRow}>
          <Text style={styles.manageText}>{hasAccess ? 'Review permissions' : 'Assign access'}</Text>
          <View style={styles.manageIcon}><Ionicons name="arrow-forward" size={17} color={adminColors.deepTeal} /></View>
        </View>
      </View>
    </Pressable>
  );
}

function LoadState({ request, onRetry }) {
  if (request.status === 'loading' || request.status === 'idle') {
    return (
      <View style={styles.loadState}>
        <ActivityIndicator color={adminColors.teal} />
        <Text style={styles.loadStateText}>Loading access journal...</Text>
      </View>
    );
  }
  if (request.status !== 'failed') return null;
  return (
    <View accessibilityRole="alert" style={styles.errorState}>
      <View style={styles.errorIcon}><Ionicons name="cloud-offline-outline" size={24} color={adminColors.coral} /></View>
      <Text style={styles.errorTitle}>Access journal unavailable</Text>
      <Text style={styles.errorText}>{request.error}</Text>
      <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retryButton}>
        <Text style={styles.retryText}>Try again</Text>
      </Pressable>
    </View>
  );
}

export default function AdminMemberAccessScreen({ navigation }) {
  const dispatch = useDispatch();
  const overview = useSelector(selectMemberAccessOverview);
  const request = useSelector(selectMemberAccessOverviewRequest);
  const source = useSelector(selectMemberAccessSource);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (request.status === 'idle') dispatch(loadAdminMemberAccess());
  }, [dispatch, request.status]);

  const visibleViewers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return overview.viewers;
    return overview.viewers.filter((viewer) => (
      viewer.name.toLowerCase().includes(normalized)
      || viewer.assignedMembers.some((member) => member.name.toLowerCase().includes(normalized))
    ));
  }, [overview.viewers, query]);

  const ready = request.status === 'succeeded';

  return (
    <AdminScreen keyboardShouldPersistTaps="handled">
      <AdminHeader title="Access" back onBackPress={() => navigation.navigate('AdminDashboard')} />

      <View style={styles.heading}>
        <Text style={styles.eyebrow}>TRUST & VISIBILITY</Text>
        <Text style={styles.title}>Support, shared with intention.</Text>
        <Text style={styles.subtitle}>Choose exactly who each member can follow. Access is read-only and limited to today’s activity.</Text>
      </View>

      <View style={styles.heroShell}>
        <LinearGradient colors={['#064E55', '#08767B', '#0B9295']} start={{ x: 0.02, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View pointerEvents="none" style={styles.heroOrb} />
          <View pointerEvents="none" style={styles.heroOrbit} />
          <View style={styles.heroTopline}>
            <View style={styles.heroLabelRow}>
              <Ionicons name="key-outline" size={17} color="#C9F3EB" />
              <Text style={styles.heroLabel}>ACCESS MAP</Text>
            </View>
            {source === 'demo' ? <View style={styles.demoPill}><Text style={styles.demoText}>TEST DATA</Text></View> : null}
          </View>
          <Text style={styles.heroStatement}>A clear circle of care.</Text>
          <Text style={styles.heroCopy}>Members only see the people you place in their shared space.</Text>
          <View style={styles.heroMetrics}>
            <View style={styles.heroMetric}>
              <Text style={styles.heroMetricValue}>{overview.totalGrants}</Text>
              <Text style={styles.heroMetricLabel}>active permissions</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroMetric}>
              <Text style={styles.heroMetricValue}>{overview.viewersWithAccess}</Text>
              <Text style={styles.heroMetricLabel}>members with access</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.directoryHeading}>
        <View>
          <Text style={styles.directoryEyebrow}>PERMISSION JOURNAL</Text>
          <Text style={styles.directoryTitle}>Who can see whom</Text>
        </View>
        {ready ? <Text style={styles.directoryCount}>{overview.viewers.length} members</Text> : null}
      </View>

      {ready ? (
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={21} color={adminColors.muted} />
          <TextInput
            accessibilityLabel="Search access journal"
            autoCapitalize="words"
            placeholder="Search member or assignment"
            placeholderTextColor={adminColors.muted}
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
          />
          {query ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10} onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={21} color={adminColors.muted} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <LoadState request={request} onRetry={() => dispatch(loadAdminMemberAccess())} />

      {ready ? (
        <View style={styles.list}>
          {visibleViewers.map((viewer) => (
            <ViewerCard
              key={viewer.id}
              viewer={viewer}
              onPress={() => navigation.navigate('ManageMemberAccess', { viewerId: viewer.id })}
            />
          ))}
          {visibleViewers.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}><Ionicons name="search-outline" size={24} color={adminColors.teal} /></View>
              <Text style={styles.emptyTitle}>No matching access record</Text>
              <Text style={styles.emptyText}>Try a member name or one of the people assigned to them.</Text>
              <Pressable accessibilityRole="button" onPress={() => setQuery('')} style={styles.resetButton}>
                <Text style={styles.resetText}>Clear search</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  heading: { marginTop: 27 },
  eyebrow: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 17, letterSpacing: 1.35 },
  title: { maxWidth: 340, color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 31, lineHeight: 37, letterSpacing: -1.15, marginTop: 7 },
  subtitle: { maxWidth: 350, color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 15, lineHeight: 22, marginTop: 7 },
  heroShell: { marginTop: 21, borderRadius: 28, backgroundColor: adminColors.deepTeal, ...adminShadow },
  hero: { minHeight: 276, overflow: 'hidden', borderRadius: 28, padding: 19 },
  heroOrb: { position: 'absolute', width: 225, height: 225, right: -73, top: -102, borderRadius: 113, backgroundColor: 'rgba(180,255,242,0.1)' },
  heroOrbit: { position: 'absolute', width: 160, height: 160, right: -15, bottom: -74, borderRadius: 80, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  heroTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  heroLabel: { color: '#C9ECE8', fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 17, letterSpacing: 1.15 },
  demoPill: { minHeight: 30, justifyContent: 'center', paddingHorizontal: 11, borderRadius: adminRadius.pill, backgroundColor: 'rgba(255,255,255,0.12)' },
  demoText: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 10, letterSpacing: 0.8 },
  heroStatement: { maxWidth: 250, color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 28, lineHeight: 34, letterSpacing: -0.8, marginTop: 25 },
  heroCopy: { maxWidth: 280, color: '#CFEAE7', fontFamily: adminFonts.regular, fontSize: 14, lineHeight: 21, marginTop: 7 },
  heroMetrics: { flex: 1, minHeight: 66, flexDirection: 'row', alignItems: 'flex-end', gap: 16, paddingTop: 18, marginTop: 18, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.18)' },
  heroMetric: { flex: 1, minWidth: 0 },
  heroMetricValue: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 25, lineHeight: 29 },
  heroMetricLabel: { color: '#CFEAE7', fontFamily: adminFonts.medium, fontSize: 12, lineHeight: 16, marginTop: 2 },
  heroDivider: { width: 1, height: 42, backgroundColor: 'rgba(255,255,255,0.18)' },
  directoryHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, marginTop: 30, marginBottom: 12 },
  directoryEyebrow: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 17, letterSpacing: 1.05 },
  directoryTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 21, lineHeight: 27, letterSpacing: -0.4, marginTop: 2 },
  directoryCount: { color: adminColors.muted, fontFamily: adminFonts.medium, fontSize: 12, marginBottom: 3 },
  searchWrap: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 20, paddingHorizontal: 16, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line, ...adminShadow },
  searchInput: { flex: 1, minHeight: 54, color: adminColors.ink, fontFamily: adminFonts.regular, fontSize: 15 },
  list: { gap: 11, marginTop: 13 },
  viewerShell: { borderTopLeftRadius: 22, borderTopRightRadius: 30, borderBottomRightRadius: 22, borderBottomLeftRadius: 30, backgroundColor: '#D8E8E4', ...adminShadow },
  viewerCard: { overflow: 'hidden', padding: 15, borderTopLeftRadius: 22, borderTopRightRadius: 30, borderBottomRightRadius: 22, borderBottomLeftRadius: 30, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line },
  viewerTopline: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.aqua },
  avatarText: { color: adminColors.deepTeal, fontFamily: adminFonts.semibold, fontSize: 14 },
  viewerIdentity: { flex: 1, minWidth: 0, paddingHorizontal: 11 },
  viewerName: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 16, lineHeight: 21 },
  viewerMeta: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 12, lineHeight: 16, marginTop: 3 },
  countPill: { minWidth: 57, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: adminColors.deepTeal },
  countPillEmpty: { backgroundColor: adminColors.surfaceMuted, borderWidth: 1, borderColor: adminColors.line },
  countValue: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 17, lineHeight: 20 },
  countLabel: { color: '#CFEAE7', fontFamily: adminFonts.semibold, fontSize: 9, letterSpacing: 0.65 },
  countValueEmpty: { color: adminColors.muted },
  assignmentBlock: { marginTop: 14, paddingTop: 13, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: adminColors.line },
  assignmentLabel: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 11, lineHeight: 15, letterSpacing: 0.85 },
  memberPreviewRow: { minHeight: 37, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7, marginTop: 8 },
  memberChip: { maxWidth: 100, minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, borderRadius: adminRadius.pill, backgroundColor: adminColors.aqua },
  memberChipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: adminColors.teal },
  memberChipText: { color: adminColors.deepTeal, fontFamily: adminFonts.semibold, fontSize: 11 },
  remainingText: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 11, paddingHorizontal: 3 },
  emptyAssignmentText: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 13, lineHeight: 19, marginTop: 6 },
  manageRow: { minHeight: 45, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 },
  manageText: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 13, paddingBottom: 5 },
  manageIcon: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.aqua },
  loadState: { minHeight: 170, alignItems: 'center', justifyContent: 'center', gap: 11 },
  loadStateText: { color: adminColors.muted, fontFamily: adminFonts.medium, fontSize: 13 },
  errorState: { alignItems: 'center', paddingVertical: 34, paddingHorizontal: 24, borderRadius: adminRadius.lg, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: '#F0D0CC' },
  errorIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.coralSoft },
  errorTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 18, marginTop: 13 },
  errorText: { color: adminColors.muted, fontFamily: adminFonts.regular, textAlign: 'center', fontSize: 13, lineHeight: 19, marginTop: 5 },
  retryButton: { minWidth: 118, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: adminColors.teal, marginTop: 16 },
  retryText: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 13 },
  emptyState: { alignItems: 'center', paddingVertical: 42, paddingHorizontal: 26, borderRadius: adminRadius.lg, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line },
  emptyIcon: { width: 54, height: 54, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.aqua },
  emptyTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 18, marginTop: 14 },
  emptyText: { color: adminColors.muted, fontFamily: adminFonts.regular, textAlign: 'center', fontSize: 13, lineHeight: 19, marginTop: 5 },
  resetButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, marginTop: 10 },
  resetText: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 13 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.99 }] },
});
