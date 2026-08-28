import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import StaggeredView from '../../components/auth/StaggeredView';
import Screen from '../../components/common/Screen';
import AmbientBackground from '../../components/common/AmbientBackground';
import UserHeader from '../../components/user/UserHeader';
import { signOut } from '../../store/slices/authSlice';
import { setTimelineRemindersEnabled } from '../../store/slices/notificationSlice';
import { loadProfile } from '../../store/slices/profileSlice';
import { getUserPreferences, setUserPreferences } from '../../services/storage/userPreferences';
import { colors, fonts, radius, type } from '../../theme';

export default function ProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);
  const profile = useSelector((state) => state.profile);
  const remindersEnabled = useSelector((state) => state.notifications.timelineRemindersEnabled);

  useEffect(() => { dispatch(loadProfile(token)); }, [dispatch, token]);
  useEffect(() => { getUserPreferences().then((preferences) => dispatch(setTimelineRemindersEnabled(preferences.timelineReminders))); }, [dispatch]);

  const toggleReminders = async (value) => {
    dispatch(setTimelineRemindersEnabled(value));
    await setUserPreferences({ timelineReminders: value });
  };

  const rows = [
    { icon: 'body-outline', label: 'Health profile', meta: 'Body measurements and weekly check-in', route: 'BodyDetails' },
    { icon: 'heart-outline', label: 'Health preferences', meta: 'Dietary needs shared with your coach', route: 'HealthPreferences' },
    { icon: 'shield-checkmark-outline', label: 'Privacy & data', meta: 'Review access and data visibility', route: 'PrivacyData' },
  ];
  const displayName = user?.name || profile.name || 'Member';
  const goal = profile.goal || 'Build energy through steady nutrition and movement.';

  return (
    <Screen>
      <UserHeader navigation={navigation} showNotifications={false} />
      <StaggeredView delay={40} style={styles.head}>
        <View style={styles.avatar}><Text style={styles.initial}>{displayName[0]?.toUpperCase()}</Text><View style={styles.status} /></View>
        <View style={styles.identity}><Text style={styles.kicker}>YOUR PROFILE</Text><Text numberOfLines={2} style={styles.title}>{displayName}</Text><Text style={styles.email}>{user?.email}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Edit profile name" onPress={() => navigation.navigate('EditProfile')} style={({ pressed }) => [styles.edit, pressed && styles.pressed]}><Ionicons name="pencil" size={18} color={colors.tealDark} /></Pressable>
      </StaggeredView>

      <StaggeredView delay={130} style={styles.goal}>
        <View style={styles.goalTop}><Text style={styles.goalLabel}>CURRENT GOAL</Text><Text style={styles.review}>ACTIVE PLAN</Text></View>
        <Text style={styles.goalText}>{goal}</Text><View style={styles.goalProgress}><View style={styles.goalFill} /></View>
      </StaggeredView>

      <StaggeredView delay={185} style={styles.reminders}>
        <View style={styles.reminderIcon}><Ionicons name="notifications-outline" size={21} color={colors.tealDark} /></View>
        <View style={styles.reminderCopy}><Text style={styles.reminderLabel}>TIMELINE REMINDERS</Text><Text style={styles.reminderText}>{remindersEnabled ? 'On · follows your assigned meal times' : 'Off · you will not receive timeline prompts'}</Text></View>
        <Switch accessibilityLabel="Timeline reminders" value={remindersEnabled} onValueChange={toggleReminders} trackColor={{ false: colors.line, true: colors.accent }} thumbColor={colors.white} ios_backgroundColor={colors.line} />
      </StaggeredView>

      <StaggeredView delay={235} style={styles.rows}>
        <Text style={styles.settings}>ACCOUNT & HEALTH</Text>
        {rows.map(({ icon, label, meta, route }) => (
          <Pressable accessibilityRole="button" key={label} onPress={() => navigation.navigate(route)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <View style={styles.rowIcon}><Ionicons name={icon} size={20} color={colors.tealDark} /></View>
            <View style={styles.rowCopy}><Text style={styles.rowText}>{label}</Text><Text style={styles.rowMeta}>{meta}</Text></View>
            <Ionicons name="arrow-forward" size={18} color={colors.muted} />
          </Pressable>
        ))}
      </StaggeredView>

      <StaggeredView delay={285} style={styles.trust}><AmbientBackground light /><Ionicons name="lock-closed" size={20} color={colors.accent} /><Text style={styles.trustLabel}>PRIVATE BY DEFAULT</Text><Text style={styles.trustTitle}>Your wellbeing data stays yours.</Text><Text style={styles.trustCopy}>Meal photos, plan progress and activity details are visible only to you and your assigned coach.</Text></StaggeredView>
      <Pressable accessibilityRole="button" onPress={() => dispatch(signOut())} style={({ pressed }) => [styles.logout, pressed && styles.pressed]}><Ionicons name="log-out-outline" size={20} color={colors.danger} /><Text style={styles.logoutText}>Sign out</Text></Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', gap: 15, alignItems: 'center', marginTop: 26 },
  avatar: { width: 78, height: 78, borderRadius: 39, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  initial: { color: colors.accent, fontFamily: fonts.bold, fontSize: 32 },
  status: { position: 'absolute', right: 2, bottom: 4, width: 15, height: 15, borderRadius: 8, backgroundColor: colors.accent, borderWidth: 3, borderColor: colors.paper },
  identity: { flex: 1, minWidth: 0 },
  kicker: { ...type.label, color: colors.tealMid },
  title: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 29, lineHeight: 34, letterSpacing: -0.9, marginTop: 4 },
  email: { color: colors.muted, fontFamily: fonts.medium, fontSize: 13, marginTop: 4 },
  edit: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  goal: { marginTop: 31, backgroundColor: colors.accentSoft, borderRadius: radius.lg, padding: 22 },
  goalTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  goalLabel: { ...type.label, color: colors.tealDark },
  review: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, letterSpacing: 1 },
  goalText: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 19, lineHeight: 27, marginTop: 10 },
  goalProgress: { height: 6, borderRadius: 3, backgroundColor: 'rgba(0,112,119,0.14)', marginTop: 18 },
  goalFill: { width: '72%', height: 6, borderRadius: 3, backgroundColor: colors.tealMid },
  reminders: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, paddingHorizontal: 14, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line },
  reminderIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  reminderCopy: { flex: 1 },
  reminderLabel: { color: colors.tealDark, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, letterSpacing: 1.1 },
  reminderText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 17, marginTop: 4 },
  rows: { marginTop: 29 },
  settings: { ...type.label, color: colors.muted, marginBottom: 5 },
  row: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  rowIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.mist, alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1 },
  rowText: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 16, lineHeight: 21 },
  rowMeta: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 17, marginTop: 3 },
  pressed: { opacity: 0.65, transform: [{ scale: 0.985 }] },
  trust: { marginTop: 29, minHeight: 194, backgroundColor: colors.tealDark, borderRadius: radius.lg, padding: 22, overflow: 'hidden' },
  trustLabel: { color: colors.accent, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, letterSpacing: 1.2, marginTop: 16 },
  trustTitle: { color: colors.white, fontFamily: fonts.semibold, fontSize: 21, lineHeight: 28, marginTop: 6, maxWidth: 285 },
  trustCopy: { color: '#C7E5E1', fontFamily: fonts.medium, fontSize: 13, lineHeight: 20, marginTop: 8, maxWidth: 315 },
  logout: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 18, justifyContent: 'center' },
  logoutText: { color: colors.danger, fontFamily: fonts.semibold, fontSize: 15 },
});
