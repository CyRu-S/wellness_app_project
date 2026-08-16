import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminScreen from '../../components/admin/AdminScreen';
import AdminSegmentedControl from '../../components/admin/AdminSegmentedControl';
import { selectAdminMembers, selectAdminSummary } from '../../store/slices/adminSlice';
import { adminColors, adminFonts, adminRadius } from '../../theme/admin';

function HealthMetric({ value, label, tone, last }) {
  return (
    <View style={[styles.healthMetric, !last && styles.healthDivider]}>
      <View style={styles.healthValueRow}>
        {tone && <View style={[styles.healthDot, tone === 'warning' && styles.healthDotWarning]} />}
        <Text style={styles.healthValue}>{value}</Text>
      </View>
      <Text style={styles.healthLabel}>{label}</Text>
    </View>
  );
}

function MemberRow({ member, onPress }) {
  const needsAttention = member.attentionLevel === 'NEEDS_ATTENTION';
  const active = member.status === 'ACTIVE';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${member.name}'s profile`} onPress={onPress} style={({ pressed }) => [styles.memberRow, pressed && styles.pressed]}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{member.initials}</Text></View>
      <View style={styles.memberCopy}>
        <View style={styles.memberTitleRow}>
          <Text numberOfLines={1} style={styles.memberName}>{member.name}</Text>
          <Text style={[styles.adherence, needsAttention && styles.attentionText]}>{member.adherence}%</Text>
        </View>
        <Text numberOfLines={1} style={styles.plan}>{member.plan}</Text>
        <View style={styles.presenceRow}>
          <View style={[styles.presenceDot, !active && styles.presenceDotAway]} />
          <Text numberOfLines={1} style={styles.presence}>{member.lastActiveAt}</Text>
          <Text style={styles.bullet}>·</Text>
          <Text style={styles.meals}>{member.meals} meals today</Text>
        </View>
        {member.attentionReason ? (
          <View style={styles.attentionReason}>
            <Ionicons name="alert-circle-outline" size={13} color={needsAttention ? adminColors.coral : adminColors.amber} />
            <Text numberOfLines={1} style={[styles.attentionReasonText, needsAttention && styles.attentionText]}>{member.attentionReason}</Text>
          </View>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={17} color={adminColors.muted} />
    </Pressable>
  );
}

export default function AdminMembersScreen({ navigation }) {
  const members = useSelector(selectAdminMembers);
  const summary = useSelector(selectAdminSummary);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');

  const visibleMembers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return members.filter((member) => {
      const matchesSearch = !normalized || `${member.name} ${member.plan}`.toLowerCase().includes(normalized);
      const matchesFilter = filter === 'All'
        || (filter === 'Active' && member.status === 'ACTIVE')
        || (filter === 'Needs attention' && member.attentionLevel === 'NEEDS_ATTENTION');
      return matchesSearch && matchesFilter;
    });
  }, [filter, members, query]);

  const activeCount = members.filter((member) => member.status === 'ACTIVE').length;
  const attentionCount = members.filter((member) => member.attentionLevel === 'NEEDS_ATTENTION').length;

  return (
    <AdminScreen keyboardShouldPersistTaps="handled">
      <AdminHeader title="Members" rightIcon="person-add-outline" onRightPress={() => navigation.navigate('UserRequests')} />

      <View style={styles.heading}>
        <Text style={styles.eyebrow}>YOUR COMMUNITY</Text>
        <Text style={styles.title}><Text style={styles.titleNumber}>{summary.totalMembers}</Text> members, one shared rhythm.</Text>
        <Text style={styles.subtitle}>See progress, spot friction, and step in at the right moment.</Text>
      </View>

      <View style={styles.healthRail}>
        <HealthMetric value={activeCount} label="active now" tone="active" />
        <HealthMetric value={attentionCount} label="need attention" tone="warning" />
        <HealthMetric value={`${summary.averageAdherence}%`} label="avg adherence" last />
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={19} color={adminColors.muted} />
        <TextInput accessibilityLabel="Search members" autoCapitalize="words" placeholder="Search name or plan" placeholderTextColor={adminColors.muted} value={query} onChangeText={setQuery} style={styles.searchInput} />
        {query ? <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10} onPress={() => setQuery('')}><Ionicons name="close-circle" size={19} color={adminColors.muted} /></Pressable> : null}
      </View>

      <AdminSegmentedControl accessibilityLabel="Member filters" options={['All', 'Active', 'Needs attention']} value={filter} onChange={setFilter} />

      <View style={styles.listHeading}>
        <Text style={styles.listTitle}>{filter === 'All' ? 'Member journal' : filter}</Text>
        <Text style={styles.listCount}>{visibleMembers.length} shown</Text>
      </View>

      <View style={styles.list}>
        {visibleMembers.map((member) => <MemberRow key={member.id} member={member} onPress={() => navigation.navigate('UserDetails', { id: member.id })} />)}
        {visibleMembers.length === 0 && (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Ionicons name="search-outline" size={23} color={adminColors.teal} /></View>
            <Text style={styles.emptyTitle}>No matching members</Text>
            <Text style={styles.emptyText}>Try a different name or return to the full member journal.</Text>
            <Pressable accessibilityRole="button" onPress={() => { setQuery(''); setFilter('All'); }} style={styles.resetButton}><Text style={styles.resetText}>Reset search</Text></Pressable>
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
  subtitle: { maxWidth: 325, color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 14, lineHeight: 21, marginTop: 6 },
  healthRail: { minHeight: 82, flexDirection: 'row', alignItems: 'stretch', borderRadius: adminRadius.lg, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line, marginTop: 22 },
  healthMetric: { flex: 1, minWidth: 0, justifyContent: 'center', paddingHorizontal: 12 },
  healthDivider: { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: adminColors.line },
  healthValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  healthDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: adminColors.teal },
  healthDotWarning: { backgroundColor: adminColors.coral },
  healthValue: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 17, letterSpacing: -0.4 },
  healthLabel: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 11, lineHeight: 15, marginTop: 3 },
  searchWrap: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: adminRadius.md, paddingHorizontal: 15, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line, marginTop: 18, marginBottom: 10 },
  searchInput: { flex: 1, minHeight: 50, color: adminColors.ink, fontFamily: adminFonts.regular, fontSize: 14 },
  listHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 23, marginBottom: 9 },
  listTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 17 },
  listCount: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 12 },
  list: { overflow: 'hidden', borderRadius: adminRadius.lg, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line },
  memberRow: { minHeight: 105, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: adminColors.line },
  avatar: { width: 43, height: 43, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.aqua },
  avatarText: { color: adminColors.deepTeal, fontFamily: adminFonts.semibold, fontSize: 12 },
  memberCopy: { flex: 1, minWidth: 0, paddingHorizontal: 11 },
  memberTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberName: { flex: 1, color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 14 },
  adherence: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 13 },
  plan: { color: adminColors.muted, fontFamily: adminFonts.medium, fontSize: 12, marginTop: 3 },
  presenceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 7 },
  presenceDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: adminColors.teal, marginRight: 5 },
  presenceDotAway: { backgroundColor: adminColors.muted },
  presence: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 11 },
  bullet: { color: adminColors.muted, marginHorizontal: 4 },
  meals: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 11 },
  attentionReason: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 },
  attentionReasonText: { flex: 1, color: adminColors.amber, fontFamily: adminFonts.medium, fontSize: 11 },
  attentionText: { color: adminColors.coral },
  empty: { alignItems: 'center', paddingHorizontal: 30, paddingVertical: 42 },
  emptyIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.aqua },
  emptyTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 17, marginTop: 14 },
  emptyText: { color: adminColors.muted, fontFamily: adminFonts.regular, textAlign: 'center', fontSize: 12, lineHeight: 18, marginTop: 5 },
  resetButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, marginTop: 11 },
  resetText: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 11 },
  pressed: { opacity: 0.7 },
});
