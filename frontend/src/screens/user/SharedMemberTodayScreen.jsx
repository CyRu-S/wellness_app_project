import { LocalizedText as Text } from '../../components/common/LocalizedText';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import PageRefresh from '../../components/common/PageRefresh';
import usePageRefresh from '../../hooks/usePageRefresh';
import MemberTodaySnapshot from '../../components/member/MemberTodaySnapshot';
import { clearSharedMemberToday, loadSharedMemberToday, nudgeSharedMember } from '../../store/slices/memberAccessSlice';
import Alert from '../../utils/appAlert';
import { colors, fonts, radius, type } from '../../theme';

function BackHeader({ navigation }) {
  return (
    <View style={styles.topBar}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to shared members" onPress={() => navigation.goBack()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
        <Ionicons name="arrow-back" size={21} color={colors.ink} />
      </Pressable>
      <Text style={styles.topTitle}>Shared today</Text>
      <View style={styles.readOnlyPill}><Ionicons name="eye-outline" size={13} color={colors.tealDark} /><Text style={styles.readOnlyText}>READ ONLY</Text></View>
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
  const sendNudge = useCallback(async (type, title) => {
    try {
      const result = await dispatch(nudgeSharedMember({ memberId, type })).unwrap();
      setNow(Date.now());
      Alert.alert(result.sent ? 'Nudge sent' : 'Nudge already sent', result.sent
        ? `${memberName} received the ${title.toLowerCase()} reminder.`
        : 'An administrator or assigned coach sent this nudge recently. It is locked for 30 minutes.');
    } catch (error) { Alert.alert('Nudge not sent', error.message || 'Please try again.'); }
  }, [dispatch, memberId, memberName]);

  if (!today && loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.content}><BackHeader navigation={navigation} /><View style={styles.loadingState}><ActivityIndicator color={colors.tealMid} size="large" /><Text style={styles.loadingTitle}>Opening today’s snapshot</Text><Text style={styles.loadingCopy}>Loading shared check-ins securely…</Text></View></View>
      </SafeAreaView>
    );
  }

  if (!today && error) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.content}><BackHeader navigation={navigation} /><FailedState revoked={revoked} message={errorMessage} onRetry={load} onBack={() => navigation.goBack()} /></View>
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
        <BackHeader navigation={navigation} />
        <View style={styles.sections}>
          {['Today', 'Nudges', 'History', 'Reports'].map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: section === item }} onPress={() => setSection(item)} style={[styles.section, section === item && styles.sectionActive]}><Text style={[styles.sectionText, section === item && styles.sectionTextActive]}>{item}</Text></Pressable>)}
        </View>
        {section === 'Today' ? <MemberTodaySnapshot snapshot={today} token={token} onOpenPhoto={openPhoto} showAccessNote /> : null}
        {section === 'Nudges' ? <SharedNudges memberName={memberName} options={today?.nudges || []} now={now} memberId={memberId} nudge={nudgeForMember ? nudge : null} onSend={sendNudge} /> : null}
        {section === 'History' ? <SharedHistory days={journal?.history || []} retentionDays={journal?.retentionDays || 21} onOpenPhoto={openPhoto} /> : null}
        {section === 'Reports' ? <SharedReports reports={journal?.healthReports || []} memberName={today?.member?.name || fallbackName} /> : null}
      </ScrollView>
      </PageRefresh>
    </SafeAreaView>
  );
}

const nudgeIcon = (type) => ({
  MEALS: 'restaurant-outline',
  HYDRATION: 'water-outline',
  EXERCISE: 'walk-outline',
  HABITS: 'checkbox-outline',
}[type] || 'notifications-outline');

function SharedNudges({ memberName, options, now, memberId, nudge, onSend }) {
  const needed = options.filter((option) => option.needed).length;
  const initial = memberName.trim().slice(0, 1).toUpperCase() || 'M';
  return <View style={styles.detailSection}>
    <Text style={styles.detailEyebrow}>MEMBER REMINDERS</Text>
    <Text style={styles.detailTitle}>Nudges</Text>
    <Text style={styles.detailCopy}>{needed ? `${needed} area${needed === 1 ? '' : 's'} may need a reminder.` : 'Everything assigned for today is complete.'} A sent nudge is locked for every admin and coach for 30 minutes.</Text>
    <View style={styles.nudgeList}>
      {options.map((option) => {
        const availableAt = option.availableAt ? Date.parse(option.availableAt) : 0;
        const coolingDown = Number.isFinite(availableAt) && availableAt > 0 && (now === 0 || availableAt > now);
        const minutes = coolingDown && now > 0 ? Math.max(1, Math.ceil((availableAt - now) / 60000)) : 0;
        const sending = nudge?.status === 'loading' && nudge.type === option.type && Number(nudge.memberId) === Number(memberId);
        const disabled = !option.needed || coolingDown || sending;
        const status = sending ? 'Sending…' : coolingDown ? (minutes ? `Available in ${minutes} min` : 'Cooling down') : option.needed ? 'Send nudge' : 'Completed';
        const stateLabel = coolingDown ? 'NUDGE SENT' : option.needed ? 'NEEDS ATTENTION' : 'COMPLETE';
        return <View key={option.type} style={[styles.nudgeShell, option.needed && !coolingDown && styles.nudgeShellAttention]}>
          <LinearGradient colors={option.needed && !coolingDown ? ['#FFFDFC', '#FBEDEA'] : ['#FFFFFF', '#EFF8F5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.nudgeCard}>
            <View style={styles.nudgeIdentity}>
              <View style={[styles.nudgeAvatar, option.needed && !coolingDown && styles.nudgeAvatarAttention]}><Text style={[styles.nudgeAvatarText, option.needed && !coolingDown && styles.nudgeAvatarTextAttention]}>{initial}</Text></View>
              <View style={styles.nudgeIdentityCopy}><Text numberOfLines={1} style={styles.nudgeMemberName}>{memberName}</Text><Text style={[styles.nudgeState, option.needed && !coolingDown && styles.nudgeStateAttention]}>{stateLabel}</Text></View>
              <Text style={styles.nudgeSharedLabel}>Shared member</Text>
            </View>
            <Text style={styles.nudgeItemTitle}>{option.detail}</Text>
            <View style={styles.nudgeMetaRow}>
              <View style={[styles.nudgeCategory, option.needed && !coolingDown && styles.nudgeCategoryAttention]}><Ionicons name={nudgeIcon(option.type)} size={14} color={option.needed && !coolingDown ? colors.danger : colors.tealDark} /><Text style={[styles.nudgeCategoryText, option.needed && !coolingDown && styles.nudgeCategoryTextAttention]}>{option.title}</Text></View>
              <Text style={styles.nudgeCooldown}>{coolingDown ? (minutes ? `${minutes} min cooldown` : '30 min cooldown') : option.needed ? 'Ready to send' : 'Updated from activity'}</Text>
            </View>
            <View style={styles.nudgeActions}>
              <Pressable accessibilityRole="button" accessibilityState={{ disabled, busy: sending }} accessibilityLabel={`${status} for ${memberName}, ${option.title}`} disabled={disabled} onPress={() => onSend(option.type, option.title)} style={({ pressed }) => [styles.nudgeButton, disabled && styles.nudgeButtonDisabled, pressed && !disabled && styles.pressed]}><Ionicons name={coolingDown || !option.needed ? 'checkmark-circle-outline' : 'notifications-outline'} size={17} color={disabled ? colors.tealDark : colors.white} /><Text style={[styles.nudgeButtonText, disabled && styles.nudgeButtonTextDisabled]}>{status}</Text></Pressable>
              <Text style={styles.nudgeActionNote}>{coolingDown ? 'Sent by an admin or coach' : option.needed ? 'One reminder for this category' : 'No reminder needed'}</Text>
            </View>
          </LinearGradient>
        </View>;
      })}
    </View>
    {!options.length ? <View style={styles.emptyDetail}><Ionicons name="notifications-off-outline" size={27} color={colors.tealMid} /><Text style={styles.emptyDetailTitle}>No nudge options available</Text><Text style={styles.detailCopy}>Refresh the profile to check today’s assigned items.</Text></View> : null}
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
  nudgeList: { marginTop: 18, gap: 14 },
  nudgeShell: { overflow: 'hidden', borderRadius: 24, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  nudgeShellAttention: { borderColor: '#F1C8C2' },
  nudgeCard: { padding: 17 },
  nudgeIdentity: { flexDirection: 'row', alignItems: 'center' },
  nudgeAvatar: { width: 43, height: 43, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  nudgeAvatarAttention: { backgroundColor: colors.dangerSoft },
  nudgeAvatarText: { color: colors.tealDark, fontFamily: fonts.semibold, fontSize: 15 },
  nudgeAvatarTextAttention: { color: colors.danger },
  nudgeIdentityCopy: { flex: 1, minWidth: 0, marginLeft: 11 },
  nudgeMemberName: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 15 },
  nudgeState: { color: colors.tealMid, fontFamily: fonts.semibold, fontSize: 9, letterSpacing: 0.9, marginTop: 3 },
  nudgeStateAttention: { color: colors.danger },
  nudgeSharedLabel: { color: colors.tealDark, fontFamily: fonts.semibold, fontSize: 10 },
  nudgeItemTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, marginTop: 16 },
  nudgeMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 12 },
  nudgeCategory: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill, backgroundColor: colors.accentSoft, paddingHorizontal: 10 },
  nudgeCategoryAttention: { backgroundColor: colors.dangerSoft },
  nudgeCategoryText: { color: colors.tealDark, fontFamily: fonts.semibold, fontSize: 10 },
  nudgeCategoryTextAttention: { color: colors.danger },
  nudgeCooldown: { flex: 1, color: colors.muted, fontFamily: fonts.medium, fontSize: 10, textAlign: 'right' },
  nudgeActions: { minHeight: 55, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, marginTop: 14, paddingTop: 12 },
  nudgeButton: { minWidth: 118, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 13, backgroundColor: colors.tealMid, paddingHorizontal: 12 },
  nudgeButtonDisabled: { backgroundColor: colors.accentSoft },
  nudgeButtonText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 10, textAlign: 'center' },
  nudgeButtonTextDisabled: { color: colors.tealDark },
  nudgeActionNote: { flex: 1, color: colors.muted, fontFamily: fonts.regular, fontSize: 9, lineHeight: 14, textAlign: 'right' },
});
