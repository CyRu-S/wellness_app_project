import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminScreen from '../../components/admin/AdminScreen';
import {
  clearMemberAccessSaveFeedback,
  loadAdminMemberAccess,
  replaceMemberAccessAssignments,
  selectLastSavedViewerId,
  selectMemberAccessOverview,
  selectMemberAccessOverviewRequest,
  selectMemberAccessSaveRequest,
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

const sameIds = (left, right) => {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((id) => rightSet.has(id));
};

function CandidateRow({ member, selected, onToggle }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${selected ? 'Remove' : 'Give'} access to ${member.name}`}
      onPress={onToggle}
      style={({ pressed }) => [styles.candidateRow, selected && styles.candidateRowSelected, pressed && styles.pressed]}
    >
      <View style={[styles.avatar, selected && styles.avatarSelected]}>
        <Text style={[styles.avatarText, selected && styles.avatarTextSelected]}>{initialsFor(member.name)}</Text>
      </View>
      <View style={styles.candidateCopy}>
        <Text numberOfLines={1} style={styles.candidateName}>{member.name}</Text>
        <Text style={styles.candidateMeta}>{selected ? 'Daily activity is visible' : 'No access'}</Text>
      </View>
      <View style={[styles.check, selected && styles.checkSelected]}>
        {selected ? <Ionicons name="checkmark" size={18} color={adminColors.white} /> : null}
      </View>
    </Pressable>
  );
}

export default function ManageMemberAccessScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const viewerId = Number(route.params?.viewerId);
  const overview = useSelector(selectMemberAccessOverview);
  const overviewRequest = useSelector(selectMemberAccessOverviewRequest);
  const saveRequest = useSelector(selectMemberAccessSaveRequest);
  const lastSavedViewerId = useSelector(selectLastSavedViewerId);
  const viewer = overview.viewers.find((item) => item.id === viewerId);
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [baselineIds, setBaselineIds] = useState([]);
  const [initializedViewerId, setInitializedViewerId] = useState(null);

  useEffect(() => {
    dispatch(clearMemberAccessSaveFeedback());
    if (overviewRequest.status === 'idle') dispatch(loadAdminMemberAccess());
    return () => { dispatch(clearMemberAccessSaveFeedback()); };
  }, [dispatch, overviewRequest.status]);

  useEffect(() => {
    if (!viewer || initializedViewerId === viewer.id) return;
    const ids = viewer.assignedMembers.map((member) => member.id);
    setSelectedIds(ids);
    setBaselineIds(ids);
    setInitializedViewerId(viewer.id);
  }, [initializedViewerId, viewer]);

  const candidates = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return overview.viewers.filter((member) => (
      member.id !== viewerId && (!normalized || member.name.toLowerCase().includes(normalized))
    ));
  }, [overview.viewers, query, viewerId]);

  const dirty = !sameIds(selectedIds, baselineIds);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedNames = overview.viewers
    .filter((member) => selectedSet.has(member.id))
    .map((member) => member.name);

  const toggleMember = (memberId) => {
    setSelectedIds((current) => (
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId]
    ));
    if (saveRequest.status !== 'idle') dispatch(clearMemberAccessSaveFeedback());
  };

  const performSave = async () => {
    try {
      await dispatch(replaceMemberAccessAssignments({ viewerId, memberIds: selectedIds })).unwrap();
      setBaselineIds([...selectedIds]);
    } catch {
      // Redux renders the server or demo adapter error below the controls.
    }
  };

  const save = () => {
    const removedIds = baselineIds.filter((id) => !selectedSet.has(id));
    if (!removedIds.length) {
      performSave();
      return;
    }
    const removedNames = overview.viewers
      .filter((member) => removedIds.includes(member.id))
      .map((member) => member.name)
      .join(', ');
    Alert.alert(
      'Remove shared access?',
      `${viewer.name} will immediately stop seeing today's activity for ${removedNames}.`,
      [
        { text: 'Keep access', style: 'cancel' },
        { text: 'Remove and save', style: 'destructive', onPress: performSave },
      ],
    );
  };

  const loadingOverview = (overviewRequest.status === 'idle' || overviewRequest.status === 'loading') && !viewer;

  return (
    <AdminScreen keyboardShouldPersistTaps="handled">
      <AdminHeader title="Manage access" back onBackPress={() => navigation.goBack()} />

      {loadingOverview ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={adminColors.teal} />
          <Text style={styles.loadingText}>Opening permission details...</Text>
        </View>
      ) : null}

      {!loadingOverview && !viewer ? (
        <View style={styles.missingState}>
          <View style={styles.missingIcon}><Ionicons name="person-outline" size={25} color={adminColors.coral} /></View>
          <Text style={styles.missingTitle}>Member unavailable</Text>
          <Text style={styles.missingText}>{overviewRequest.error || 'This member is no longer eligible for shared access.'}</Text>
          <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.returnButton}>
            <Text style={styles.returnText}>Return to access</Text>
          </Pressable>
        </View>
      ) : null}

      {viewer ? (
        <>
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>PERMISSION EDITOR</Text>
            <Text style={styles.title}>Shape {viewer.name.split(' ')[0]}’s shared view.</Text>
            <Text style={styles.subtitle}>Select any number of members. Only today’s meals, hydration, and activity will be visible.</Text>
          </View>

          <View style={styles.viewerPanel}>
            <View style={styles.viewerAvatar}><Text style={styles.viewerAvatarText}>{initialsFor(viewer.name)}</Text></View>
            <View style={styles.viewerCopy}>
              <Text style={styles.viewerLabel}>VIEWER</Text>
              <Text numberOfLines={1} style={styles.viewerName}>{viewer.name}</Text>
            </View>
            <View style={styles.selectionCount}>
              <Text style={styles.selectionCountValue}>{selectedIds.length}</Text>
              <Text style={styles.selectionCountLabel}>SELECTED</Text>
            </View>
          </View>

          <View style={styles.boundaryNote}>
            <View style={styles.boundaryIcon}><Ionicons name="eye-outline" size={20} color={adminColors.deepTeal} /></View>
            <Text style={styles.boundaryText}>Read-only access. Contact details, body metrics, goals, and previous days stay private.</Text>
          </View>

          {saveRequest.status === 'succeeded' && lastSavedViewerId === viewerId ? (
            <View accessibilityRole="alert" style={styles.successNotice}>
              <Ionicons name="checkmark-circle" size={20} color={adminColors.teal} />
              <Text style={styles.successText}>Permissions saved. The member’s Shared tab is updated.</Text>
            </View>
          ) : null}
          {saveRequest.status === 'failed' ? (
            <View accessibilityRole="alert" style={styles.errorNotice}>
              <Ionicons name="alert-circle" size={20} color={adminColors.coral} />
              <Text style={styles.errorNoticeText}>{saveRequest.error}</Text>
            </View>
          ) : null}

          <View style={styles.directoryHeading}>
            <View>
              <Text style={styles.directoryEyebrow}>MEMBER DIRECTORY</Text>
              <Text style={styles.directoryTitle}>Choose visibility</Text>
            </View>
            <Text style={styles.directoryCount}>{selectedIds.length} chosen</Text>
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={21} color={adminColors.muted} />
            <TextInput
              accessibilityLabel="Search members to assign"
              autoCapitalize="words"
              placeholder="Search members"
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

          <View style={styles.candidateList}>
            {candidates.map((member) => (
              <CandidateRow
                key={member.id}
                member={member}
                selected={selectedSet.has(member.id)}
                onToggle={() => toggleMember(member.id)}
              />
            ))}
            {candidates.length === 0 ? (
              <View style={styles.searchEmpty}>
                <Text style={styles.searchEmptyTitle}>No matching members</Text>
                <Text style={styles.searchEmptyText}>Try another name from the member directory.</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.savePanel}>
            <View style={styles.saveSummary}>
              <Text style={styles.saveSummaryLabel}>SHARED WITH {viewer.name.split(' ')[0].toUpperCase()}</Text>
              <Text numberOfLines={2} style={styles.saveSummaryValue}>
                {selectedNames.length ? selectedNames.join(', ') : 'No members selected'}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save member access"
              accessibilityState={{ disabled: !dirty || saveRequest.status === 'loading' }}
              disabled={!dirty || saveRequest.status === 'loading'}
              onPress={save}
              style={({ pressed }) => [
                styles.saveButton,
                (!dirty || saveRequest.status === 'loading') && styles.saveButtonDisabled,
                pressed && styles.pressed,
              ]}
            >
              {saveRequest.status === 'loading' ? (
                <ActivityIndicator color={adminColors.white} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color={adminColors.white} />
                  <Text style={styles.saveButtonText}>Save access</Text>
                </>
              )}
            </Pressable>
          </View>
        </>
      ) : null}
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  loadingState: { minHeight: 280, alignItems: 'center', justifyContent: 'center', gap: 11 },
  loadingText: { color: adminColors.muted, fontFamily: adminFonts.medium, fontSize: 13 },
  missingState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 28, borderRadius: adminRadius.lg, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line, marginTop: 28 },
  missingIcon: { width: 54, height: 54, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.coralSoft },
  missingTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 18, marginTop: 14 },
  missingText: { color: adminColors.muted, fontFamily: adminFonts.regular, textAlign: 'center', fontSize: 13, lineHeight: 19, marginTop: 5 },
  returnButton: { minHeight: 46, justifyContent: 'center', paddingHorizontal: 18, borderRadius: 15, backgroundColor: adminColors.teal, marginTop: 16 },
  returnText: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 13 },
  heading: { marginTop: 27 },
  eyebrow: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 17, letterSpacing: 1.35 },
  title: { maxWidth: 350, color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 31, lineHeight: 37, letterSpacing: -1.15, marginTop: 7 },
  subtitle: { maxWidth: 350, color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 15, lineHeight: 22, marginTop: 7 },
  viewerPanel: { minHeight: 88, flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 23, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line, marginTop: 21, ...adminShadow },
  viewerAvatar: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.deepTeal },
  viewerAvatarText: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 16 },
  viewerCopy: { flex: 1, minWidth: 0, paddingHorizontal: 12 },
  viewerLabel: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 10, letterSpacing: 0.9 },
  viewerName: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 18, lineHeight: 23, marginTop: 3 },
  selectionCount: { minWidth: 65, minHeight: 55, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: adminColors.aqua },
  selectionCountValue: { color: adminColors.deepTeal, fontFamily: adminFonts.semibold, fontSize: 20, lineHeight: 23 },
  selectionCountLabel: { color: adminColors.deepTeal, fontFamily: adminFonts.semibold, fontSize: 9, letterSpacing: 0.65 },
  boundaryNote: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, borderRadius: 19, backgroundColor: adminColors.aqua, marginTop: 11 },
  boundaryIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.7)' },
  boundaryText: { flex: 1, color: adminColors.deepTeal, fontFamily: adminFonts.medium, fontSize: 12, lineHeight: 18 },
  successNotice: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, borderRadius: 17, backgroundColor: '#E8F5EF', borderWidth: 1, borderColor: '#CDE9DC', marginTop: 11 },
  successText: { flex: 1, color: adminColors.deepTeal, fontFamily: adminFonts.medium, fontSize: 12, lineHeight: 17 },
  errorNotice: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, borderRadius: 17, backgroundColor: adminColors.coralSoft, borderWidth: 1, borderColor: '#F0D0CC', marginTop: 11 },
  errorNoticeText: { flex: 1, color: adminColors.coral, fontFamily: adminFonts.medium, fontSize: 12, lineHeight: 17 },
  directoryHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, marginTop: 29, marginBottom: 12 },
  directoryEyebrow: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 17, letterSpacing: 1.05 },
  directoryTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 21, lineHeight: 27, letterSpacing: -0.4, marginTop: 2 },
  directoryCount: { color: adminColors.muted, fontFamily: adminFonts.medium, fontSize: 12, marginBottom: 3 },
  searchWrap: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 20, paddingHorizontal: 16, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line, ...adminShadow },
  searchInput: { flex: 1, minHeight: 54, color: adminColors.ink, fontFamily: adminFonts.regular, fontSize: 15 },
  candidateList: { gap: 10, marginTop: 12 },
  candidateRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 21, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line },
  candidateRowSelected: { backgroundColor: '#F0FAF7', borderColor: adminColors.aquaStrong },
  avatar: { width: 46, height: 46, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.surfaceMuted },
  avatarSelected: { backgroundColor: adminColors.aqua },
  avatarText: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 13 },
  avatarTextSelected: { color: adminColors.deepTeal },
  candidateCopy: { flex: 1, minWidth: 0, paddingHorizontal: 11 },
  candidateName: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 15, lineHeight: 20 },
  candidateMeta: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 12, lineHeight: 16, marginTop: 3 },
  check: { width: 30, height: 30, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: adminColors.line, backgroundColor: adminColors.surface },
  checkSelected: { borderColor: adminColors.teal, backgroundColor: adminColors.teal },
  searchEmpty: { alignItems: 'center', paddingVertical: 34, paddingHorizontal: 20, borderRadius: 20, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line },
  searchEmptyTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 16 },
  searchEmptyText: { color: adminColors.muted, fontFamily: adminFonts.regular, textAlign: 'center', fontSize: 13, lineHeight: 19, marginTop: 4 },
  savePanel: { padding: 15, borderRadius: 23, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line, marginTop: 18, ...adminShadow },
  saveSummary: { paddingBottom: 13 },
  saveSummaryLabel: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 10, letterSpacing: 0.85 },
  saveSummaryValue: { color: adminColors.ink, fontFamily: adminFonts.medium, fontSize: 13, lineHeight: 19, marginTop: 4 },
  saveButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 17, backgroundColor: adminColors.teal },
  saveButtonDisabled: { backgroundColor: adminColors.sage },
  saveButtonText: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 14 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.99 }] },
});
