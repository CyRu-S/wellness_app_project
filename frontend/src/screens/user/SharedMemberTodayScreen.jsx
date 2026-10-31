import { LocalizedText as Text } from '../../components/common/LocalizedText';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MemberAttentionCard from '../../components/common/MemberAttentionCard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import PageRefresh from '../../components/common/PageRefresh';
import usePageRefresh from '../../hooks/usePageRefresh';
import MemberTodaySnapshot from '../../components/member/MemberTodaySnapshot';
import { clearSharedMemberToday, loadSharedMemberToday, nudgeSharedMember } from '../../store/slices/memberAccessSlice';
import Alert from '../../utils/appAlert';
import { colors, fonts, radius, type } from '../../theme';

const detailSections = ['Today', 'Nudges', 'History', 'Reports'];

function BackHeader({ navigation, canAssignPlans }) {
  return (
    <View style={styles.topBar}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to shared members" onPress={() => navigation.goBack()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
        <Ionicons name="arrow-back" size={21} color={colors.ink} />
      </Pressable>
      <Text style={styles.topTitle}>Shared today</Text>
      <View style={styles.readOnlyPill}><Ionicons name={canAssignPlans ? 'nutrition-outline' : 'eye-outline'} size={13} color={colors.tealDark} /><Text style={styles.readOnlyText}>{canAssignPlans ? 'PLAN ACCESS' : 'READ ONLY'}</Text></View>
    </View>
  );
}

function FailedState({ revoked, message, onRetry, onBack }) {
  return (
    <View style={styles.failedState}>
      <View style={[styles.failedIcon, revoked && styles.revokedIcon]}><Ionicons name={revoked ? 'lock-closed-outline' : 'cloud-offline-outline'} size={30} color={revoked ? colors.danger : colors.tealDark} /></View>
      <Text style={styles.failedTitle}>{revoked ? 'Access is no longer available' : 'Today’s view didn’t load'}</Text>
      <Text style={styles.failedCopy}>{revoked ? 'Your club admin may have changed this permission. This member’s information is no longer visible to you.' : message || 'Check your connection and try again.'}</Text>
      <Pressable accessibilityRole="button" onPress={revoked ? onBack : onRetry} style={({ pressed }) => [styles.failedAction, pressed && styles.pressed]}>
        <Text style={styles.failedActionText}>{revoked ? 'Back to shared members' : 'Try again'}</Text>
        <Ionicons name={revoked ? 'arrow-back' : 'refresh'} size={17} color={colors.white} />
      </Pressable>
    </View>
  );
}

export default function SharedMemberTodayScreen({ navigation, route }) {
  const pageRefresh = usePageRefresh();
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);
  const access = useSelector((state) => state.memberAccess || {});
  const memberId = route.params?.memberId;
  const fallbackName = route.params?.memberName || 'Member';
  const payload = access.sharedToday;
  const journal = access.sharedJournal;
  const [section, setSection] = useState('Today');
  const [now, setNow] = useState(0);
  const nudge = access.sharedNudge || { status: 'idle' };
  const canAssignPlans = Boolean(access.sharedMembers?.canAssignPlans ?? access.shared?.canAssignPlans);
  const today = useMemo(() => {
    if (!payload) return null;
    if (payload.byMemberId) return payload.byMemberId[memberId] || null;
    if (payload.member?.id != null && memberId != null && String(payload.member.id) !== String(memberId)) return null;
    return payload;
  }, [memberId, payload]);
  const status = access.sharedTodayStatus || access.todayStatus || access.status || 'idle';
  const error = access.sharedTodayError || access.error;
  const loading = status === 'loading' || status === 'pending';
  const errorStatus = error?.status ?? error?.code ?? access.errorStatus;
  const errorMessage = typeof error === 'string' ? error : error?.message;
  const revoked = errorStatus === 404 || /not found|no longer|permission|access/i.test(errorMessage || '');
  const memberName = today?.member?.name || fallbackName;
  const nudgeForMember = Number(nudge.memberId) === Number(memberId);

  const load = useCallback(() => {
    if (memberId != null) return dispatch(loadSharedMemberToday(memberId));
    return undefined;
  }, [dispatch, memberId]);

  useEffect(() => () => { dispatch(clearSharedMemberToday()); }, [dispatch]);
  useEffect(() => {
    if (section !== 'Nudges') return undefined;
    const initialTimer = setTimeout(() => setNow(Date.now()), 0);
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => { clearTimeout(initialTimer); clearInterval(timer); };
  }, [section]);

  const openPhoto = useCallback((post) => {
    navigation.navigate('SharedPhoto', { post, memberName });
  }, [memberName, navigation]);
  const sendNudge = useCallback(async (option) => {
    try {
      const result = await dispatch(nudgeSharedMember({ memberId, type: option.type, attentionId: option.id })).unwrap();
      setNow(Date.now());
      Alert.alert(result.sent ? 'Nudge sent' : 'Nudge already sent', result.sent
        ? `${memberName} received the ${option.category.toLowerCase()} reminder.`
        : 'An administrator or assigned coach sent this nudge recently. It is locked for 30 minutes.');
    } catch (error) { Alert.alert('Nudge not sent', error.message || 'Please try again.'); }
  }, [dispatch, memberId, memberName]);

  if (!today && loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.content}><BackHeader navigation={navigation} canAssignPlans={canAssignPlans} /><View style={styles.loadingState}><ActivityIndicator color={colors.tealMid} size="large" /><Text style={styles.loadingTitle}>Opening today’s snapshot</Text><Text style={styles.loadingCopy}>Loading shared check-ins securely…</Text></View></View>
      </SafeAreaView>
    );
  }

  if (!today && error) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.content}><BackHeader navigation={navigation} canAssignPlans={canAssignPlans} /><FailedState revoked={revoked} message={errorMessage} onRetry={load} onBack={() => navigation.goBack()} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <PageRefresh {...pageRefresh}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={Platform.OS !== 'web' ? <RefreshControl refreshing={pageRefresh.refreshing} onRefresh={pageRefresh.onRefresh} colors={[colors.tealMid]} tintColor={colors.tealMid} /> : undefined}
      >
        <BackHeader navigation={navigation} canAssignPlans={canAssignPlans} />
        <View style={styles.sections}>
          {[detailSections[0], ...(canAssignPlans ? ['Plan'] : []), ...detailSections.slice(1)].map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: section === item }} onPress={() => setSection(item)} style={[styles.section, section === item && styles.sectionActive]}><Text style={[styles.sectionText, section === item && styles.sectionTextActive]}>{item}</Text></Pressable>)}
        </View>
        {section === 'Today' ? <MemberTodaySnapshot snapshot={today} token={token} onOpenPhoto={openPhoto} showAccessNote /> : null}
        {section === 'Plan' ? <SharedPlanAccess memberName={memberName} onOpen={() => navigation.navigate('SharedPlanEditor', { memberId, memberName })} /> : null}
        {section === 'Nudges' ? <SharedNudges memberName={memberName} options={today?.nudges || []} now={now} token={token} onMember={() => setSection('Today')} nudge={nudgeForMember ? nudge : null} onSend={sendNudge} /> : null}
        {section === 'History' ? <SharedHistory days={journal?.history || []} retentionDays={journal?.retentionDays || 21} onOpenPhoto={openPhoto} /> : null}
        {section === 'Reports' ? <SharedReports reports={journal?.healthReports || []} memberName={today?.member?.name || fallbackName} /> : null}
      </ScrollView>
      </PageRefresh>
    </SafeAreaView>
  );
}

function SharedPlanAccess({ memberName, onOpen }) {
  return <View style={styles.detailSection}>
    <Text style={styles.detailEyebrow}>DIET PLAN ACCESS</Text>
    <Text style={styles.detailTitle}>Manage {memberName}’s plan</Text>
    <Text style={styles.detailCopy}>Your admin enabled plan assignment for the members shared with you.</Text>
    <View style={styles.planAccessPanel}>
      <View style={styles.planAccessIcon}><Ionicons name="nutrition-outline" size={25} color={colors.tealDark} /></View>
      <View style={styles.planAccessCopy}><Text style={styles.planAccessTitle}>Recurring diet schedule</Text><Text style={styles.planAccessText}>Edit meals and habits, switch to Z-Drink Day, or restore the previous plan.</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Manage ${memberName}'s diet plan`} onPress={onOpen} style={styles.planAccessButton}><Ionicons name="arrow-forward" size={19} color={colors.white} /></Pressable>
    </View>
  </View>;
}

function SharedNudges({ memberName, options, now, token, onMember, nudge, onSend }) {
  return <View style={styles.detailSection}>
    <Text style={styles.detailEyebrow}>MEMBER REMINDERS</Text>
    <Text style={styles.detailTitle}>Nudges</Text>
    <Text style={styles.detailCopy}>{options.length ? `${options.length} overdue item${options.length === 1 ? '' : 's'} may need a reminder.` : 'No overdue check-ins need a nudge right now.'} A sent nudge is locked for every admin and coach for 30 minutes.</Text>
    <View style={styles.nudgeList}>
      {options.map((option) => <MemberAttentionCard key={option.id} item={option} token={token}
        centralHydration={false} now={now} onMember={onMember}
        busy={nudge?.status === 'loading'} sending={nudge?.status === 'loading' && nudge.attentionId === option.id}
        onNudge={() => onSend(option)} />)}
    </View>
    {!options.length ? <View style={styles.emptyDetail}><Ionicons name="checkmark-circle-outline" size={27} color={colors.tealMid} /><Text style={styles.emptyDetailTitle}>No overdue items for {memberName}</Text><Text style={styles.detailCopy}>Refresh this profile to see the latest check-ins.</Text></View> : null}
  </View>;
}

function SharedHistory({ days, retentionDays, onOpenPhoto }) {
  return <View style={styles.detailSection}>
    <Text style={styles.detailEyebrow}>MEAL HISTORY · {retentionDays} DAYS</Text>
    <Text style={styles.detailTitle}>Previous check-ins</Text>
    <Text style={styles.detailCopy}>The same meal history available to the club admin is shared here.</Text>
    {days.map((day) => <View key={day.date} style={styles.day}>
      <View style={styles.dayHead}><Text style={styles.dayDate}>{new Date(`${day.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</Text><Text style={styles.dayCount}>{day.posts.length} post{day.posts.length === 1 ? '' : 's'}</Text></View>
      {day.posts.map((post) => <Pressable key={post.postId} accessibilityRole="button" onPress={() => onOpenPhoto(post)} style={({ pressed }) => [styles.historyRow, pressed && styles.pressed]}><View style={styles.historyIcon}><Ionicons name="restaurant-outline" size={18} color={colors.tealDark} /></View><View style={styles.historyCopy}><Text style={styles.historyType}>{post.type}</Text><Text numberOfLines={1} style={styles.historyName}>{post.name}</Text></View><Ionicons name="expand-outline" size={18} color={colors.tealMid} /></Pressable>)}
    </View>)}
    {!days.length ? <View style={styles.emptyDetail}><Ionicons name="images-outline" size={27} color={colors.tealMid} /><Text style={styles.emptyDetailTitle}>No previous meal posts</Text><Text style={styles.detailCopy}>Completed check-ins from earlier days will appear here.</Text></View> : null}
  </View>;
}

function SharedReports({ reports, memberName }) {
  return <View style={styles.detailSection}>
    <Text style={styles.detailEyebrow}>HEALTH REPORTS</Text>
    <Text style={styles.detailTitle}>{memberName}’s saved check-ins</Text>
    <Text style={styles.detailCopy}>Profile measurements and preferences are read-only.</Text>
    {reports.map((report) => <View key={report.id} style={styles.report}>
      <View style={styles.reportHead}><Text style={styles.reportDate}>{new Date(report.recordedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text><Ionicons name="document-text-outline" size={18} color={colors.tealMid} /></View>
      <Text style={styles.reportMetrics}>{report.weightKg ?? '—'} kg · {report.heightCm ?? '—'} cm · {report.bodyFatPercent ?? '—'}% body fat</Text>
      <Text style={styles.reportPreference}>{report.dietaryPreferences || 'No health preferences recorded'}</Text>
    </View>)}
    {!reports.length ? <View style={styles.emptyDetail}><Ionicons name="document-text-outline" size={27} color={colors.tealMid} /><Text style={styles.emptyDetailTitle}>No health reports yet</Text><Text style={styles.detailCopy}>Saved profile updates will appear here.</Text></View> : null}
  </View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28 },
  topBar: { minHeight: 51, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 44, height: 44, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  topTitle: { position: 'absolute', left: 64, right: 104, color: colors.ink, fontFamily: fonts.semibold, fontSize: 14, textAlign: 'center' },
  readOnlyPill: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.pill, backgroundColor: colors.accentSoft, paddingHorizontal: 10 },
  readOnlyText: { ...type.label, color: colors.tealDark, fontSize: 10, letterSpacing: 0.7 },
  loadingState: { flex: 1, minHeight: 430, alignItems: 'center', justifyContent: 'center' },
  loadingTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 18, marginTop: 18 },
  loadingCopy: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, marginTop: 5 },
  failedState: { flex: 1, minHeight: 440, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  failedIcon: { width: 68, height: 68, borderRadius: 24, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  revokedIcon: { backgroundColor: '#FCE6E2' },
  failedTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 20, textAlign: 'center', marginTop: 19 },
  failedCopy: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 19, textAlign: 'center', maxWidth: 305, marginTop: 8 },
  failedAction: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, backgroundColor: colors.tealMid, paddingHorizontal: 20, marginTop: 20 },
  failedActionText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 12 },
  pressed: { opacity: 0.68, transform: [{ scale: 0.98 }] },
  sections: { flexDirection: 'row', padding: 4, borderRadius: 16, backgroundColor: colors.mist, marginTop: 14, marginBottom: 18 },
  section: { flex: 1, minHeight: 39, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  sectionActive: { backgroundColor: colors.surface },
  sectionText: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 12 },
  sectionTextActive: { color: colors.tealDark },
  detailSection: { paddingBottom: 20 },
  detailEyebrow: { ...type.label, color: colors.tealMid, fontSize: 10 },
  detailTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 23, lineHeight: 29, marginTop: 5 },
  detailCopy: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, marginTop: 5 },
  day: { marginTop: 22, borderTopWidth: 1, borderTopColor: colors.line },
  dayHead: { minHeight: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayDate: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 14 },
  dayCount: { color: colors.muted, fontFamily: fonts.medium, fontSize: 11 },
  historyRow: { minHeight: 63, flexDirection: 'row', alignItems: 'center', gap: 11, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  historyIcon: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  historyCopy: { flex: 1, minWidth: 0 },
  historyType: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 13 },
  historyName: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, marginTop: 2 },
  report: { paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  reportHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reportDate: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 14 },
  reportMetrics: { color: colors.tealDark, fontFamily: fonts.semibold, fontSize: 12, marginTop: 9 },
  reportPreference: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, marginTop: 6 },
  emptyDetail: { alignItems: 'center', paddingVertical: 48 },
  emptyDetailTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 17, marginTop: 11 },
  planAccessPanel: { minHeight: 102, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, marginTop: 18 },
  planAccessIcon: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  planAccessCopy: { flex: 1, minWidth: 0 },
  planAccessTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 14 },
  planAccessText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, marginTop: 3 },
  planAccessButton: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tealMid },
  nudgeList: { marginTop: 18, gap: 14 },

});
