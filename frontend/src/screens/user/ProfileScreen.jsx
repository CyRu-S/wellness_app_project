import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import Screen from '../../components/common/Screen';
import { signOut } from '../../store/slices/authSlice';
import { colors, radius, type } from '../../theme';

export default function ProfileScreen() {
  const user = useSelector((state) => state.auth.user); const dispatch = useDispatch();
  const rows = [['person-outline', 'Personal details'], ['heart-outline', 'Health preferences'], ['notifications-outline', 'Reminder settings'], ['shield-checkmark-outline', 'Privacy & data']];
  return <Screen><View style={styles.head}><View style={styles.avatar}><Text style={styles.initial}>{user?.name?.[0]}</Text></View><View><Text style={styles.kicker}>YOUR PROFILE</Text><Text style={styles.title}>{user?.name}</Text><Text style={styles.email}>{user?.email}</Text></View></View><View style={styles.goal}><Text style={styles.goalLabel}>CURRENT GOAL</Text><Text style={styles.goalText}>Build energy through steady nutrition and movement.</Text><Text style={styles.goalMeta}>Plan reviewed 2 days ago</Text></View><View style={styles.rows}>{rows.map(([icon, label]) => <Pressable key={label} style={styles.row}><Ionicons name={icon} size={22} color={colors.moss} /><Text style={styles.rowText}>{label}</Text><Ionicons name="chevron-forward" size={18} color={colors.muted} /></Pressable>)}</View><Pressable onPress={() => dispatch(signOut())} style={styles.logout}><Ionicons name="log-out-outline" size={20} color={colors.danger} /><Text style={styles.logoutText}>Sign out</Text></Pressable></Screen>;
}
const styles = StyleSheet.create({ head: { flexDirection: 'row', gap: 18, alignItems: 'center', marginTop: 22 }, avatar: { width: 78, height: 78, borderRadius: 39, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }, initial: { color: colors.accent, fontSize: 33, fontWeight: '800' }, kicker: { ...type.label, color: colors.moss }, title: { ...type.h1, color: colors.ink, marginTop: 3 }, email: { color: colors.muted, marginTop: 3 }, goal: { marginTop: 30, backgroundColor: colors.accentSoft, borderRadius: radius.lg, padding: 23 }, goalLabel: { ...type.label, color: colors.moss }, goalText: { color: colors.ink, fontSize: 18, lineHeight: 25, fontWeight: '700', marginTop: 7 }, goalMeta: { color: colors.muted, marginTop: 13 }, rows: { marginTop: 22 }, row: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line }, rowText: { flex: 1, color: colors.ink, fontSize: 16, fontWeight: '700' }, logout: { flexDirection: 'row', gap: 10, marginTop: 28, paddingVertical: 16, justifyContent: 'center' }, logoutText: { color: colors.danger, fontWeight: '800' } });

