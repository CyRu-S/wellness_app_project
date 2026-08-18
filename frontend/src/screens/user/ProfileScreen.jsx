import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import StaggeredView from '../../components/auth/StaggeredView';
import Screen from '../../components/common/Screen';
import { signOut } from '../../store/slices/authSlice';
import { colors, fonts, radius, type } from '../../theme';

export default function ProfileScreen() {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const rows = [['person-outline', 'Personal details'], ['heart-outline', 'Health preferences'], ['notifications-outline', 'Reminder settings'], ['shield-checkmark-outline', 'Privacy & data']];
  return (
    <Screen>
      <StaggeredView delay={40} style={styles.head}><View style={styles.avatar}><Text style={styles.initial}>{user?.name?.[0] || 'A'}</Text><View style={styles.status} /></View><View style={styles.identity}><Text style={styles.kicker}>YOUR PROFILE</Text><Text style={styles.title}>{user?.name}</Text><Text style={styles.email}>{user?.email}</Text></View></StaggeredView>
      <StaggeredView delay={130} style={styles.goal}><View style={styles.goalTop}><Text style={styles.goalLabel}>CURRENT GOAL</Text><Text style={styles.review}>REVIEWED 2D AGO</Text></View><Text style={styles.goalText}>Build energy through steady nutrition and movement.</Text><View style={styles.goalProgress}><View style={styles.goalFill} /></View></StaggeredView>
      <StaggeredView delay={220} style={styles.rows}><Text style={styles.settings}>SETTINGS</Text>{rows.map(([icon, label]) => <Pressable key={label} style={({ pressed }) => [styles.row, pressed && styles.pressed]}><View style={styles.rowIcon}><Ionicons name={icon} size={20} color={colors.tealDark} /></View><Text style={styles.rowText}>{label}</Text><Ionicons name="arrow-forward" size={17} color={colors.muted} /></Pressable>)}</StaggeredView>
      <Pressable onPress={() => dispatch(signOut())} style={({ pressed }) => [styles.logout, pressed && styles.pressed]}><Ionicons name="log-out-outline" size={19} color={colors.danger} /><Text style={styles.logoutText}>Sign out</Text></Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', gap: 17, alignItems: 'center', marginTop: 22 }, avatar: { width: 78, height: 78, borderRadius: 39, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }, initial: { color: colors.accent, fontFamily: fonts.semibold, fontSize: 32 }, status: { position: 'absolute', right: 2, bottom: 4, width: 15, height: 15, borderRadius: 8, backgroundColor: colors.accent, borderWidth: 3, borderColor: colors.paper }, identity: { flex: 1 }, kicker: { ...type.label, color: colors.tealMid }, title: { ...type.h1, color: colors.ink, marginTop: 3 }, email: { color: colors.muted, fontFamily: fonts.regular, marginTop: 3 },
  goal: { marginTop: 31, backgroundColor: colors.accentSoft, borderRadius: radius.lg, padding: 22 }, goalTop: { flexDirection: 'row', justifyContent: 'space-between' }, goalLabel: { ...type.label, color: colors.tealDark }, review: { ...type.label, color: colors.muted, fontSize: 8 }, goalText: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 18, lineHeight: 25, marginTop: 9 }, goalProgress: { height: 5, borderRadius: 3, backgroundColor: 'rgba(0,112,119,0.14)', marginTop: 18 }, goalFill: { width: '72%', height: 5, borderRadius: 3, backgroundColor: colors.tealMid },
  rows: { marginTop: 28 }, settings: { ...type.label, color: colors.muted, marginBottom: 4 }, row: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line }, rowIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.mist, alignItems: 'center', justifyContent: 'center' }, rowText: { flex: 1, color: colors.ink, fontFamily: fonts.medium, fontSize: 15 }, pressed: { opacity: 0.6 }, logout: { flexDirection: 'row', gap: 9, marginTop: 26, paddingVertical: 16, justifyContent: 'center' }, logoutText: { color: colors.danger, fontFamily: fonts.semibold },
});
