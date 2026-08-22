import React, { useCallback, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import StaggeredView from '../../components/auth/StaggeredView';
import AmbientBackground from '../../components/common/AmbientBackground';
import UserHeader from '../../components/user/UserHeader';
import { loadSharedMembers } from '../../store/slices/memberAccessSlice';
import { colors, fonts, radius, shadows, type } from '../../theme';

const memberId = (member) => member?.id ?? member?.memberId ?? member?.userId;

const summaryFor = (member) => member?.todaySummary || member?.summary || member?.today || member || {};

const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const hydrationLabel = (value) => {
  const millilitres = asNumber(value);
  if (millilitres >= 1000) return `${(millilitres / 1000).toFixed(millilitres % 1000 ? 1 : 0)}L`;
  return `${millilitres}ml`;
};

function MemberCard({ member, onPress }) {
  const summary = summaryFor(member);
  const planned = asNumber(summary.plannedMeals ?? summary.mealTotal);
  const completed = asNumber(summary.completedMeals ?? summary.mealsCompleted);
  const mealPosts = asNumber(summary.mealPosts ?? summary.postsCount ?? completed);
  const hydration = summary.hydrationMl ?? summary.hydrationTotalMl ?? 0;
  const activity = asNumber(summary.activityMinutes ?? summary.activeMinutes);
  const progress = planned > 0 ? Math.min(100, Math.round((completed / planned) * 100)) : 0;
  const name = member.name || member.memberName || 'Member';
  const initial = name.trim().slice(0, 1).toUpperCase() || 'M';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}. ${completed} of ${planned} meals complete, ${hydrationLabel(hydration)} hydration, ${activity} activity minutes. Open today's details.`}
      onPress={onPress}
      style={({ pressed }) => [styles.memberCard, pressed && styles.pressed]}
    >
      <View style={styles.memberTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
          <View style={styles.avatarStatus} />
        </View>
        <View style={styles.memberIdentity}>
          <Text numberOfLines={1} style={styles.memberName}>{name}</Text>
          <Text style={styles.memberMeta}>Today only · Read only</Text>
        </View>
        <View style={styles.openButton}>
          <Ionicons name="arrow-forward" size={18} color={colors.tealDark} />
        </View>
      </View>

      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>MEAL RHYTHM</Text>
        <Text style={styles.progressValue}>{planned ? `${completed}/${planned} complete` : `${mealPosts} posts`}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      <View style={styles.memberSignals}>
        <View style={styles.signal}>
          <Ionicons name="restaurant-outline" size={17} color={colors.tealMid} />
          <View><Text style={styles.signalValue}>{mealPosts}</Text><Text style={styles.signalLabel}>POSTS</Text></View>
        </View>
        <View style={styles.signalRule} />
        <View style={styles.signal}>
          <Ionicons name="water-outline" size={18} color={colors.tealMid} />
          <View><Text style={styles.signalValue}>{hydrationLabel(hydration)}</Text><Text style={styles.signalLabel}>WATER</Text></View>
        </View>
        <View style={styles.signalRule} />
        <View style={styles.signal}>
          <Ionicons name="walk-outline" size={18} color={colors.tealMid} />
          <View><Text style={styles.signalValue}>{activity}m</Text><Text style={styles.signalLabel}>MOVE</Text></View>
        </View>
      </View>
    </Pressable>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}><Ionicons name="people-outline" size={30} color={colors.tealDark} /></View>
      <Text style={styles.emptyTitle}>No shared members yet</Text>
      <Text style={styles.emptyCopy}>When your club admin gives you access, that member’s today-only check-ins will appear here.</Text>
    </View>
  );
}

export default function SharedMembersScreen({ navigation }) {
  const dispatch = useDispatch();
  const access = useSelector((state) => state.memberAccess || {});
  const payload = access.sharedMembers;
  const members = useMemo(
    () => (Array.isArray(payload) ? payload : payload?.members || []),
    [payload],
  );
  const total = Array.isArray(payload) ? members.length : asNumber(payload?.total, members.length);
  const status = access.sharedMembersStatus || access.listStatus || access.status || 'idle';
  const error = access.sharedMembersError || access.error;
  const loading = status === 'loading' || status === 'pending';

  const refresh = useCallback(() => dispatch(loadSharedMembers()), [dispatch]);

  useEffect(() => {
    if (status === 'idle') refresh();
  }, [refresh, status]);

  const openMember = useCallback((member) => {
    navigation.navigate('SharedMemberToday', {
      memberId: memberId(member),
      memberName: member.name || member.memberName || 'Member',
    });
  }, [navigation]);

  const header = (
    <>
      <UserHeader navigation={navigation} />
      <StaggeredView delay={35} style={styles.intro}>
        <Text style={styles.eyebrow}>SHARED WITH YOU</Text>
        <Text style={styles.title}>Your circle</Text>
        <Text style={styles.introCopy}>A private, today-only view of the members your club admin has entrusted to you.</Text>
      </StaggeredView>

      <StaggeredView delay={95} style={styles.hero}>
        <LinearGradient colors={[colors.tealDark, '#0C8B80']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <AmbientBackground light />
        <View style={styles.heroCopy}>
          <Text style={styles.heroLabel}>TODAY’S SHARED VIEW</Text>
          <Text style={styles.heroCount}>{String(total).padStart(2, '0')}</Text>
          <Text style={styles.heroTitle}>{total === 1 ? 'member in your care' : 'members in your care'}</Text>
          <Text style={styles.heroText}>Access is read-only and refreshes with today’s activity.</Text>
        </View>
        <View style={styles.heroMark}>
          <Ionicons name="shield-checkmark" size={28} color={colors.accent} />
          <Text style={styles.heroMarkText}>PRIVATE</Text>
        </View>
      </StaggeredView>

      <View style={styles.sectionHead}>
        <View><Text style={styles.eyebrow}>TODAY’S ACTIVITY</Text><Text style={styles.sectionTitle}>Latest check-ins</Text></View>
        {loading && members.length ? <ActivityIndicator size="small" color={colors.tealMid} /> : <Text style={styles.liveText}>LIVE VIEW</Text>}
      </View>
    </>
  );

  const errorState = !members.length && error ? (
    <View style={styles.errorState}>
      <View style={styles.errorIcon}><Ionicons name="cloud-offline-outline" size={27} color={colors.danger} /></View>
      <Text style={styles.errorTitle}>Couldn’t load your shared view</Text>
      <Text style={styles.errorCopy}>{typeof error === 'string' ? error : error?.message || 'Check your connection and try again.'}</Text>
      <Pressable accessibilityRole="button" onPress={refresh} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
        <Text style={styles.retryText}>Try again</Text><Ionicons name="refresh" size={17} color={colors.white} />
      </Pressable>
    </View>
  ) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <FlatList
        data={members}
        keyExtractor={(item, index) => String(memberId(item) ?? index)}
        renderItem={({ item }) => <MemberCard member={item} onPress={() => openMember(item)} />}
        ListHeaderComponent={header}
        ListEmptyComponent={loading ? <View style={styles.loadingState}><ActivityIndicator color={colors.tealMid} /><Text style={styles.loadingText}>Loading your shared circle…</Text></View> : errorState || <EmptyState />}
        ListFooterComponent={members.length ? <View style={styles.privacyNote}><Ionicons name="lock-closed-outline" size={16} color={colors.tealDark} /><Text style={styles.privacyText}>You can only view today’s wellness activity. Access is managed by your club admin.</Text></View> : null}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading && members.length > 0} onRefresh={refresh} colors={[colors.tealMid]} tintColor={colors.tealMid} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { flexGrow: 1, paddingHorizontal: 22, paddingBottom: 112 },
  intro: { marginTop: 24 },
  eyebrow: { ...type.label, color: colors.tealMid, fontSize: 9 },
  title: { ...type.display, color: colors.ink, fontSize: 38, lineHeight: 42, marginTop: 5 },
  introCopy: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, marginTop: 7, maxWidth: 345 },
  hero: { minHeight: 210, borderRadius: radius.lg, marginTop: 23, padding: 22, overflow: 'hidden', flexDirection: 'row', alignItems: 'flex-end', ...shadows.raised },
  heroCopy: { flex: 1, zIndex: 2 },
  heroLabel: { ...type.label, color: '#BDE7DF', fontSize: 8 },
  heroCount: { color: colors.white, fontFamily: fonts.semibold, fontSize: 53, lineHeight: 58, letterSpacing: -2, marginTop: 13 },
  heroTitle: { color: colors.white, fontFamily: fonts.semibold, fontSize: 18, lineHeight: 23 },
  heroText: { color: '#BBD9D5', fontFamily: fonts.regular, fontSize: 11, lineHeight: 17, maxWidth: 225, marginTop: 8 },
  heroMark: { width: 82, height: 82, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)', zIndex: 2, marginBottom: 16 },
  heroMarkText: { ...type.label, color: '#DDF4EF', fontSize: 7, marginTop: 7 },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 31, marginBottom: 13 },
  sectionTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 21, marginTop: 4 },
  liveText: { ...type.label, color: colors.muted, fontSize: 7 },
  memberCard: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 16, marginBottom: 12, ...shadows.soft },
  memberTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 17, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.tealDark, fontFamily: fonts.semibold, fontSize: 19 },
  avatarStatus: { position: 'absolute', right: -2, bottom: 2, width: 11, height: 11, borderRadius: 6, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.surface },
  memberIdentity: { flex: 1, paddingHorizontal: 13 },
  memberName: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 16 },
  memberMeta: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10, marginTop: 4 },
  openButton: { width: 42, height: 42, borderRadius: 15, backgroundColor: colors.mist, alignItems: 'center', justifyContent: 'center' },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 17 },
  progressLabel: { ...type.label, color: colors.muted, fontSize: 7 },
  progressValue: { color: colors.tealDark, fontFamily: fonts.semibold, fontSize: 10 },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: colors.mist, marginTop: 7, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: colors.tealMid },
  memberSignals: { flexDirection: 'row', alignItems: 'center', marginTop: 17, paddingTop: 15, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  signal: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  signalValue: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 13 },
  signalLabel: { ...type.label, color: colors.muted, fontSize: 6, lineHeight: 9, marginTop: 1 },
  signalRule: { width: StyleSheet.hairlineWidth, height: 27, backgroundColor: colors.line },
  loadingState: { minHeight: 210, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12 },
  emptyState: { minHeight: 252, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', padding: 28 },
  emptyIcon: { width: 62, height: 62, borderRadius: 22, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 19, marginTop: 17 },
  emptyCopy: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 19, textAlign: 'center', maxWidth: 280, marginTop: 7 },
  errorState: { minHeight: 252, backgroundColor: '#FFF5F3', borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', padding: 28 },
  errorIcon: { width: 58, height: 58, borderRadius: 21, backgroundColor: '#FCE3DF', alignItems: 'center', justifyContent: 'center' },
  errorTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 18, textAlign: 'center', marginTop: 15 },
  errorCopy: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 7 },
  retryButton: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 15, backgroundColor: colors.tealMid, paddingHorizontal: 19, marginTop: 17 },
  retryText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 12 },
  privacyNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, borderRadius: radius.md, backgroundColor: colors.accentSoft, padding: 14, marginTop: 5 },
  privacyText: { flex: 1, color: colors.inkSoft, fontFamily: fonts.regular, fontSize: 10, lineHeight: 16 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.985 }] },
});
