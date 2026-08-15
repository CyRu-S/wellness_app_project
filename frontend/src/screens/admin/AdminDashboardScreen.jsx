import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import Screen from '../../components/common/Screen';
import { colors, radius, type } from '../../theme';

export default function AdminDashboardScreen({ navigation }) {
  const stats = useSelector((state) => state.admin);
  const tools = [
    ['UserRequests', 'person-add-outline', 'Review requests', `${stats.pendingUsers} waiting`],
    ['UserList', 'people-outline', 'Manage members', `${stats.activePlans} active plans`],
    ['DietPlans', 'restaurant-outline', 'Diet plans', 'Assign and adjust'],
    ['Products', 'leaf-outline', 'Product catalogue', `${stats.products} products`],
    ['Alerts', 'warning-outline', 'Missed items', `${stats.missedItems} need review`],
    ['Reports', 'bar-chart-outline', 'Reports', 'Weekly trends'],
    ['NotificationSettings', 'notifications-outline', 'Reminders', 'Rules and channels'],
  ];
  return <Screen><View style={styles.head}><View><Text style={styles.kicker}>ADMIN WORKSPACE</Text><Text style={styles.title}>Operations</Text></View><Pressable onPress={() => navigation.navigate('AdminProfile')} style={styles.avatar}><Text style={styles.avatarText}>MA</Text></Pressable></View><View style={styles.hero}><Text style={styles.heroValue}>{stats.pendingUsers}</Text><View><Text style={styles.heroTitle}>new member requests</Text><Text style={styles.heroMeta}>3 added since yesterday</Text></View><Ionicons name="arrow-up" size={25} color={colors.accent} /></View><Text style={styles.section}>WORKSPACE</Text><View>{tools.map(([route, icon, title, meta]) => <Pressable key={route} onPress={() => navigation.navigate(route)} style={styles.row}><View style={styles.icon}><Ionicons name={icon} size={21} color={colors.ink} /></View><View style={styles.copy}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.meta}>{meta}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.muted} /></Pressable>)}</View></Screen>;
}
const styles = StyleSheet.create({ head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }, kicker: { ...type.label, color: colors.moss }, title: { ...type.display, color: colors.ink, marginTop: 3 }, avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: colors.accent, fontWeight: '800' }, hero: { minHeight: 120, backgroundColor: colors.ink, borderRadius: radius.lg, padding: 22, marginTop: 25, flexDirection: 'row', alignItems: 'center', gap: 14 }, heroValue: { color: colors.accent, fontSize: 45, fontWeight: '800' }, heroTitle: { color: colors.white, fontSize: 17, fontWeight: '800' }, heroMeta: { color: '#AFC1B8', marginTop: 4 }, section: { ...type.label, color: colors.muted, marginTop: 29, marginBottom: 6 }, row: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line }, icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1 }, rowTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' }, meta: { color: colors.muted, marginTop: 3 } });

