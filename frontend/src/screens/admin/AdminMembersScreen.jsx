import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminScreen from '../../components/admin/AdminScreen';
import AdminSegmentedControl from '../../components/admin/AdminSegmentedControl';
import { selectAdminMembers, selectAdminSummary } from '../../store/slices/adminSlice';
import { adminColors, adminFonts, adminRadius, adminShadow } from '../../theme/admin';

function PulseMetric({ value, label, last, stacked }) {
  return (
    <>
      <View style={styles.pulseMetric}>
        <Text style={styles.pulseMetricValue}>{value}</Text>
        <Text style={styles.pulseMetricLabel}>{label}</Text>
      </View>
      {!last && <View style={[styles.pulseDivider, stacked && styles.pulseDividerStacked]} />}
    </>
  );
}

function MemberCard({ member, onPress }) {
  const needsAttention = member.attentionLevel === 'NEEDS_ATTENTION';
  const active = member.status === 'ACTIVE';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${member.name}'s profile. ${member.adherence} percent weekly adherence.`}
      onPress={onPress}
      style={({ pressed }) => [styles.memberShell, needsAttention && styles.memberShellAttention, pressed && styles.pressed]}
    >
      <LinearGradient
        colors={needsAttention ? ['#FFFDFC', '#FCEDEA'] : ['#FFFFFF', '#EFF8F5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.memberCard}
      >
        <View style={styles.identityRow}>
          <View style={[styles.avatar, needsAttention && styles.avatarAttention]}>
            <Text style={[styles.avatarText, needsAttention && styles.avatarTextAttention]}>{member.initials}</Text>
          </View>
          <View style={styles.identityCopy}>
            <Text numberOfLines={1} style={styles.memberName}>{member.name}</Text>
            <View style={styles.presenceRow}>
              <View style={[styles.presenceDot, !active && styles.presenceDotAway]} />
              <Text numberOfLines={1} style={styles.presence}>{member.lastActiveAt}</Text>
            </View>
          </View>
          <View style={styles.openProfile}><Text style={styles.openProfileText}>Profile</Text></View>
        </View>

        {member.attentionReason ? (
          <Text numberOfLines={1} style={[styles.attentionReason, needsAttention && styles.attentionReasonHigh]}>{member.attentionReason}</Text>
        ) : null}

        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>WEEKLY ADHERENCE</Text>
          <Text style={[styles.adherence, needsAttention && styles.adherenceAttention]}>{member.adherence}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, needsAttention && styles.progressFillAttention, { width: `${member.adherence}%` }]} />
        </View>

        <View style={styles.memberFooter}>
          <View style={styles.footerMetric}>
            <Ionicons name="restaurant-outline" size={16} color={adminColors.deepTeal} />
            <Text style={styles.footerMetricText}>{member.meals} meals today</Text>
          </View>
          <View style={styles.footerMetric}>
            <Ionicons name="water-outline" size={16} color={adminColors.deepTeal} />
            <Text style={styles.footerMetricText}>{member.hydration}% hydrated</Text>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export default function AdminMembersScreen({ navigation }) {
  const members = useSelector(selectAdminMembers);
  const summary = useSelector(selectAdminSummary);
  const { width, fontScale } = useWindowDimensions();
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

  const attentionCount = members.filter((member) => member.attentionLevel === 'NEEDS_ATTENTION').length;
  const stackedPulse = width < 340 || fontScale > 1.35;

  return (
    <AdminScreen keyboardShouldPersistTaps="handled">
      <AdminHeader title="Members" back onBackPress={() => navigation.navigate('AdminDashboard')} />

      <View style={styles.heading}>
        <Text style={styles.eyebrow}>MEMBER JOURNAL</Text>
        <Text style={styles.title}>Every member, in view.</Text>
        <Text style={styles.subtitle}>Follow progress, understand daily context, and know when your support matters.</Text>
      </View>

      <View style={styles.heroShell}>
        <LinearGradient colors={['#064E55', '#08767B', '#0B9295']} start={{ x: 0.02, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View pointerEvents="none" style={styles.heroOrb} />
          <View pointerEvents="none" style={styles.heroOrbit} />
          <View style={styles.heroTopline}>
            <View style={styles.heroLabelRow}><Ionicons name="people" size={16} color="#C9F3EB" /><Text style={styles.heroLabel}>CLUB PULSE</Text></View>
            <View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View>
          </View>
          <View style={styles.heroStatement}>
            <Text style={styles.heroValue}>{summary.totalMembers}</Text>
            <Text style={styles.heroTitle}>people sharing one healthier rhythm.</Text>
          </View>
          <View style={[styles.pulseRail, stackedPulse && styles.pulseRailStacked]}>
            <PulseMetric value={summary.activeUsers} label="active now" stacked={stackedPulse} />
            <PulseMetric value={attentionCount} label="need care" stacked={stackedPulse} />
            <PulseMetric value={`${summary.averageAdherence}%`} label="average adherence" last stacked={stackedPulse} />
          </View>
        </LinearGradient>
      </View>

      <View style={styles.discovery}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={21} color={adminColors.muted} />
          <TextInput
            accessibilityLabel="Search members"
            autoCapitalize="words"
            placeholder="Search name or plan"
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
        <AdminSegmentedControl accessibilityLabel="Member filters" options={['All', 'Active', 'Needs attention']} value={filter} onChange={setFilter} />
      </View>

      <View style={styles.listHeading}>
        <View>
          <Text style={styles.listEyebrow}>COMMUNITY</Text>
          <Text style={styles.listTitle}>{filter === 'All' ? 'Member journal' : filter}</Text>
        </View>
        <Text style={styles.listCount}>{visibleMembers.length} shown</Text>
      </View>

      <View style={styles.list}>
        {visibleMembers.map((member) => (
          <MemberCard key={member.id} member={member} onPress={() => navigation.navigate('UserDetails', { id: member.id })} />
        ))}
        {visibleMembers.length === 0 && (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Ionicons name="search-outline" size={24} color={adminColors.teal} /></View>
            <Text style={styles.emptyTitle}>No matching members</Text>
            <Text style={styles.emptyText}>Try another name or return to the complete member journal.</Text>
            <Pressable accessibilityRole="button" onPress={() => { setQuery(''); setFilter('All'); }} style={styles.resetButton}><Text style={styles.resetText}>Reset search</Text></Pressable>
          </View>
        )}
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
  hero: { minHeight: 270, overflow: 'hidden', borderRadius: 28, padding: 19 },
  heroOrb: { position: 'absolute', width: 220, height: 220, right: -78, top: -104, borderRadius: 110, backgroundColor: 'rgba(180,255,242,0.1)' },
  heroOrbit: { position: 'absolute', width: 148, height: 148, right: 5, bottom: -58, borderRadius: 74, borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)' },
  heroTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  heroLabel: { color: '#C9ECE8', fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 17, letterSpacing: 1.15 },
  livePill: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, borderRadius: adminRadius.pill, backgroundColor: 'rgba(255,255,255,0.12)' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#89E5D6' },
  liveText: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 12, letterSpacing: 0.8 },
  heroStatement: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 18 },
  heroValue: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 55, lineHeight: 60, letterSpacing: -2.4 },
  heroTitle: { flex: 1, maxWidth: 185, color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 21, lineHeight: 26, letterSpacing: -0.5 },
  pulseRail: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 11, paddingTop: 13, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.18)' },
  pulseRailStacked: { alignItems: 'stretch', flexDirection: 'column', gap: 8 },
  pulseMetric: { flex: 1, minWidth: 0 },
  pulseMetricValue: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 19, lineHeight: 23 },
  pulseMetricLabel: { color: '#CFEAE7', fontFamily: adminFonts.medium, fontSize: 12, lineHeight: 16, marginTop: 1 },
  pulseDivider: { width: 1, height: 34, backgroundColor: 'rgba(255,255,255,0.18)' },
  pulseDividerStacked: { width: '100%', height: StyleSheet.hairlineWidth },
  discovery: { marginTop: 19, gap: 10 },
  searchWrap: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 20, paddingHorizontal: 16, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line, ...adminShadow },
  searchInput: { flex: 1, minHeight: 54, color: adminColors.ink, fontFamily: adminFonts.regular, fontSize: 15 },
  listHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 29, marginBottom: 11 },
  listEyebrow: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 17, letterSpacing: 1.05 },
  listTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 21, lineHeight: 27, letterSpacing: -0.4, marginTop: 2 },
  listCount: { color: adminColors.muted, fontFamily: adminFonts.medium, fontSize: 12, marginBottom: 3 },
  list: { gap: 11 },
  memberShell: { borderTopLeftRadius: 22, borderTopRightRadius: 32, borderBottomRightRadius: 22, borderBottomLeftRadius: 32, backgroundColor: '#D8E8E4', ...adminShadow },
  memberShellAttention: { backgroundColor: '#EED7D3' },
  memberCard: { overflow: 'hidden', padding: 15, borderTopLeftRadius: 22, borderTopRightRadius: 32, borderBottomRightRadius: 22, borderBottomLeftRadius: 32, borderWidth: 1, borderColor: adminColors.line },
  identityRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 46, height: 46, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.aqua },
  avatarAttention: { backgroundColor: adminColors.coralSoft },
  avatarText: { color: adminColors.deepTeal, fontFamily: adminFonts.semibold, fontSize: 13 },
  avatarTextAttention: { color: adminColors.coral },
  identityCopy: { flex: 1, minWidth: 0, paddingHorizontal: 11 },
  memberName: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 16, lineHeight: 21 },
  presenceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  presenceDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: adminColors.teal, marginRight: 6 },
  presenceDotAway: { backgroundColor: adminColors.muted },
  presence: { flex: 1, color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 12, lineHeight: 16 },
  openProfile: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 5 },
  openProfileText: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 12 },
  attentionReason: { color: adminColors.amber, fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 17, marginTop: 13 },
  attentionReasonHigh: { color: adminColors.coral },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  progressLabel: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.8 },
  adherence: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 15 },
  adherenceAttention: { color: adminColors.coral },
  progressTrack: { height: 7, overflow: 'hidden', borderRadius: 4, backgroundColor: adminColors.sageSoft, marginTop: 7 },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: adminColors.teal },
  progressFillAttention: { backgroundColor: adminColors.coral },
  memberFooter: { minHeight: 42, flexDirection: 'row', alignItems: 'flex-end', gap: 15, paddingTop: 13, marginTop: 9, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: adminColors.line },
  footerMetric: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerMetricText: { color: adminColors.deepTeal, fontFamily: adminFonts.medium, fontSize: 12, lineHeight: 16 },
  empty: { alignItems: 'center', paddingHorizontal: 30, paddingVertical: 46, borderRadius: adminRadius.lg, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line, ...adminShadow },
  emptyIcon: { width: 54, height: 54, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.aqua },
  emptyTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 18, marginTop: 14 },
  emptyText: { color: adminColors.muted, fontFamily: adminFonts.regular, textAlign: 'center', fontSize: 13, lineHeight: 19, marginTop: 5 },
  resetButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, marginTop: 10 },
  resetText: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 13 },
  pressed: { opacity: 0.68 },
});
