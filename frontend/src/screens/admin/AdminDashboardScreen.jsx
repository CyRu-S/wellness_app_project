import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import StaggeredView from '../../components/auth/StaggeredView';
import AmbientBackground from '../../components/common/AmbientBackground';
import BrandMark from '../../components/common/BrandMark';
import Screen from '../../components/common/Screen';
import { colors, fonts, radius, shadows, type } from '../../theme';

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
  return (
    <Screen>
      <View style={styles.brand}><BrandMark /><Pressable onPress={() => navigation.navigate('AdminProfile')} style={styles.avatar}><Text style={styles.avatarText}>MA</Text><View style={styles.status} /></Pressable></View>
      <StaggeredView delay={50} style={styles.head}><Text style={styles.kicker}>ADMIN WORKSPACE</Text><Text style={styles.title}>Operations</Text><Text style={styles.subtitle}>Member care and programme performance at a glance.</Text></StaggeredView>
      <StaggeredView delay={140} style={styles.hero}>
        <AmbientBackground />
        <View><Text style={styles.heroLabel}>NEEDS ATTENTION</Text><Text style={styles.heroValue}>{stats.pendingUsers}</Text></View>
        <View style={styles.heroCopy}><Text style={styles.heroTitle}>new member requests</Text><Text style={styles.heroMeta}>3 added since yesterday</Text><Pressable onPress={() => navigation.navigate('UserRequests')} style={styles.review}><Text style={styles.reviewText}>Review queue</Text><Ionicons name="arrow-forward" size={16} color={colors.accent} /></Pressable></View>
      </StaggeredView>
      <StaggeredView delay={220} style={styles.metrics}><View><Text style={styles.metric}>{stats.activePlans}</Text><Text style={styles.metricLabel}>ACTIVE PLANS</Text></View><View style={styles.rule} /><View><Text style={styles.metric}>{stats.products}</Text><Text style={styles.metricLabel}>PRODUCTS</Text></View><View style={styles.rule} /><View><Text style={styles.metric}>{stats.missedItems}</Text><Text style={styles.metricLabel}>ALERTS</Text></View></StaggeredView>
      <StaggeredView delay={300}><Text style={styles.section}>WORKSPACE</Text>{tools.map(([route, icon, title, meta]) => <Pressable key={route} onPress={() => navigation.navigate(route)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}><View style={styles.icon}><Ionicons name={icon} size={20} color={colors.tealDark} /></View><View style={styles.copy}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.meta}>{meta}</Text></View><Ionicons name="arrow-forward" size={17} color={colors.muted} /></Pressable>)}</StaggeredView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 }, avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', ...shadows.soft }, avatarText: { color: colors.accent, fontFamily: fonts.semibold }, status: { position: 'absolute', width: 10, height: 10, right: 1, bottom: 2, borderRadius: 5, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.paper },
  head: { marginTop: 29 }, kicker: { ...type.label, color: colors.tealMid }, title: { ...type.display, color: colors.ink, marginTop: 3 }, subtitle: { ...type.body, color: colors.muted, marginTop: 7, maxWidth: 330 },
  hero: { minHeight: 160, backgroundColor: colors.ink, borderRadius: radius.lg, padding: 22, marginTop: 25, flexDirection: 'row', alignItems: 'center', gap: 18, overflow: 'hidden', ...shadows.raised }, heroLabel: { ...type.label, color: '#8EC5C7', fontSize: 8 }, heroValue: { color: colors.accent, fontFamily: fonts.semibold, fontSize: 52, lineHeight: 58 }, heroCopy: { flex: 1 }, heroTitle: { color: colors.white, fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22 }, heroMeta: { color: '#9BBFC1', fontFamily: fonts.regular, fontSize: 12, marginTop: 4 }, review: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 }, reviewText: { color: colors.accent, fontFamily: fonts.semibold, fontSize: 12 },
  metrics: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 26, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line }, metric: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 22, textAlign: 'center' }, metricLabel: { ...type.label, color: colors.muted, fontSize: 7, marginTop: 3, textAlign: 'center' }, rule: { width: 1, height: 34, backgroundColor: colors.line },
  section: { ...type.label, color: colors.muted, marginTop: 29, marginBottom: 5 }, row: { minHeight: 69, flexDirection: 'row', alignItems: 'center', gap: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line }, pressed: { opacity: 0.6 }, icon: { width: 39, height: 39, borderRadius: 13, backgroundColor: colors.mist, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1 }, rowTitle: { color: colors.ink, fontFamily: fonts.medium, fontSize: 15 }, meta: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, marginTop: 3 },
});
