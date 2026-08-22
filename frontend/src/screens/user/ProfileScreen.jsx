import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import StaggeredView from '../../components/auth/StaggeredView';
import Screen from '../../components/common/Screen';
import AmbientBackground from '../../components/common/AmbientBackground';
import UserHeader from '../../components/user/UserHeader';
import { signOut } from '../../store/slices/authSlice';
import { colors, fonts, radius, type } from '../../theme';

export default function ProfileScreen({ navigation }) {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const rows = [
    { icon: 'person-outline', label: 'Personal details', meta: 'Body measurements · weekly update', onPress: () => navigation.navigate('BodyDetails') },
    { icon: 'heart-outline', label: 'Health preferences', meta: 'Shared with your coach' },
    { icon: 'shield-checkmark-outline', label: 'Privacy & data', meta: 'Permissions and data access' },
  ];
  return (
    <Screen>
      <UserHeader navigation={navigation} showNotifications={false} />
      <StaggeredView delay={40} style={styles.head}><View style={styles.avatar}><Text style={styles.initial}>{user?.name?.[0] || 'A'}</Text><View style={styles.status} /></View><View style={styles.identity}><Text style={styles.kicker}>YOUR PROFILE</Text><Text style={styles.title}>{user?.name}</Text><Text style={styles.email}>{user?.email}</Text></View></StaggeredView>
      <StaggeredView delay={130} style={styles.goal}><View style={styles.goalTop}><Text style={styles.goalLabel}>CURRENT GOAL</Text><Text style={styles.review}>REVIEWED 2D AGO</Text></View><Text style={styles.goalText}>Build energy through steady nutrition and movement.</Text><View style={styles.goalProgress}><View style={styles.goalFill} /></View></StaggeredView>
      <StaggeredView delay={185} style={styles.reminders}><View style={styles.reminderIcon}><Ionicons name="notifications-outline" size={20} color={colors.tealDark} /></View><View style={styles.reminderCopy}><Text style={styles.reminderLabel}>TIMELINE REMINDERS</Text><Text style={styles.reminderText}>Automatic · follows your assigned meal times</Text></View><View style={styles.on}><View style={styles.onDot} /><Text style={styles.onText}>ON</Text></View></StaggeredView>
      <StaggeredView delay={235} style={styles.rows}><Text style={styles.settings}>ACCOUNT & HEALTH</Text>{rows.map(({ icon, label, meta, onPress }) => <Pressable key={label} disabled={!onPress} onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}><View style={styles.rowIcon}><Ionicons name={icon} size={20} color={colors.tealDark} /></View><View style={styles.rowCopy}><Text style={styles.rowText}>{label}</Text><Text style={styles.rowMeta}>{meta}</Text></View>{onPress ? <Ionicons name="arrow-forward" size={17} color={colors.muted} /> : null}</Pressable>)}</StaggeredView>
      <StaggeredView delay={285} style={styles.trust}><AmbientBackground light /><Ionicons name="lock-closed" size={19} color={colors.accent} /><Text style={styles.trustLabel}>PRIVATE BY DEFAULT</Text><Text style={styles.trustTitle}>Your wellbeing data stays yours.</Text><Text style={styles.trustCopy}>Meal photos, plan progress and activity details are visible only to you and your assigned coach.</Text></StaggeredView>
      <Pressable onPress={() => dispatch(signOut())} style={({ pressed }) => [styles.logout, pressed && styles.pressed]}><Ionicons name="log-out-outline" size={19} color={colors.danger} /><Text style={styles.logoutText}>Sign out</Text></Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', gap: 17, alignItems: 'center', marginTop: 26 }, avatar: { width: 78, height: 78, borderRadius: 39, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }, initial: { color: colors.accent, fontFamily: fonts.semibold, fontSize: 32 }, status: { position: 'absolute', right: 2, bottom: 4, width: 15, height: 15, borderRadius: 8, backgroundColor: colors.accent, borderWidth: 3, borderColor: colors.paper }, identity: { flex: 1 }, kicker: { ...type.label, color: colors.tealMid }, title: { ...type.h1, color: colors.ink, marginTop: 3 }, email: { color: colors.muted, fontFamily: fonts.regular, marginTop: 3 },
  goal: { marginTop: 31, backgroundColor: colors.accentSoft, borderRadius: radius.lg, padding: 22 }, goalTop: { flexDirection: 'row', justifyContent: 'space-between' }, goalLabel: { ...type.label, color: colors.tealDark }, review: { ...type.label, color: colors.muted, fontSize: 8 }, goalText: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 18, lineHeight: 25, marginTop: 9 }, goalProgress: { height: 5, borderRadius: 3, backgroundColor: 'rgba(0,112,119,0.14)', marginTop: 18 }, goalFill: { width: '72%', height: 5, borderRadius: 3, backgroundColor: colors.tealMid },
  reminders: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 14, paddingHorizontal: 14, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line }, reminderIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, reminderCopy: { flex: 1 }, reminderLabel: { ...type.label, color: colors.tealDark, fontSize: 7 }, reminderText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10, marginTop: 3 }, on: { flexDirection: 'row', alignItems: 'center', gap: 4 }, onDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.tealMid }, onText: { ...type.label, color: colors.tealMid, fontSize: 7 },
  rows: { marginTop: 28 }, settings: { ...type.label, color: colors.muted, marginBottom: 4 }, row: { minHeight: 69, flexDirection: 'row', alignItems: 'center', gap: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line }, rowIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.mist, alignItems: 'center', justifyContent: 'center' }, rowCopy: { flex: 1 }, rowText: { color: colors.ink, fontFamily: fonts.medium, fontSize: 15 }, rowMeta: { color: colors.muted, fontFamily: fonts.regular, fontSize: 9, marginTop: 3 }, pressed: { opacity: 0.6 },
  trust: { marginTop: 29, minHeight: 188, backgroundColor: colors.tealDark, borderRadius: radius.lg, padding: 22, overflow: 'hidden' }, trustLabel: { ...type.label, color: colors.accent, fontSize: 8, marginTop: 15 }, trustTitle: { color: colors.white, fontFamily: fonts.semibold, fontSize: 20, lineHeight: 26, marginTop: 5, maxWidth: 265 }, trustCopy: { color: '#B7D8D2', fontFamily: fonts.regular, fontSize: 11, lineHeight: 17, marginTop: 8, maxWidth: 295 },
  logout: { flexDirection: 'row', gap: 9, marginTop: 20, paddingVertical: 16, justifyContent: 'center' }, logoutText: { color: colors.danger, fontFamily: fonts.semibold },
});
