import React, { useCallback, useEffect, useMemo } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import MemberTodaySnapshot from '../../components/member/MemberTodaySnapshot';
import { clearSharedMemberToday, loadSharedMemberToday } from '../../store/slices/memberAccessSlice';
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
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);
  const access = useSelector((state) => state.memberAccess || {});
  const memberId = route.params?.memberId;
  const fallbackName = route.params?.memberName || 'Member';
  const payload = access.sharedToday;
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

  const load = useCallback(() => {
    if (memberId != null) return dispatch(loadSharedMemberToday(memberId));
    return undefined;
  }, [dispatch, memberId]);

  useEffect(() => {
    load();
    return () => { dispatch(clearSharedMemberToday()); };
  }, [dispatch, load]);

  const openPhoto = useCallback((post) => {
    navigation.navigate('SharedPhoto', { post, memberName: today?.member?.name || fallbackName });
  }, [fallbackName, navigation, today?.member?.name]);

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
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={[colors.tealMid]} tintColor={colors.tealMid} />}
      >
        <BackHeader navigation={navigation} />
        <MemberTodaySnapshot snapshot={today} token={token} onOpenPhoto={openPhoto} showAccessNote />
      </ScrollView>
    </SafeAreaView>
  );
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
});
