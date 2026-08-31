import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../../components/common/Screen';
import { colors, fonts, radius, shadows, type } from '../../theme';

export default function PrivacyDataScreen({ navigation }) {
  const openShared = () => navigation.getParent()?.navigate('Shared');
  const actions = [
    { icon: 'body-outline', title: 'Review health data', detail: 'See the measurements stored in your profile', onPress: () => navigation.navigate('BodyDetails') },
    { icon: 'people-outline', title: 'Review shared access', detail: 'See the people currently shared with you', onPress: openShared },
  ];
  return (
    <Screen>
      <View style={styles.nav}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><Ionicons name="arrow-back" size={20} color={colors.ink} /></Pressable><Text style={styles.navTitle}>Privacy & data</Text><View style={styles.navSpace} /></View>
      <View style={styles.head}><Text style={styles.kicker}>YOUR DATA</Text><Text style={styles.title}>Clear access, by design</Text><Text style={styles.body}>Your wellness activity is private to your account and the coach assigned by your club.</Text></View>
      <View style={styles.trust}><LinearGradient colors={['#064E55', '#08767B', '#0B9295']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /><Ionicons name="shield-checkmark" size={28} color="#BFE9E8" /><Text style={styles.trustTitle}>Private by default</Text><Text style={styles.trustText}>Meal photos, body measurements, activity, and plan progress are protected behind your signed-in account.</Text></View>
      <View style={styles.section}><Text style={styles.sectionLabel}>MANAGE</Text>{actions.map((action) => <Pressable accessibilityRole="button" key={action.title} onPress={action.onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}><View style={styles.icon}><Ionicons name={action.icon} size={20} color={colors.tealDark} /></View><View style={styles.copy}><Text style={styles.rowTitle}>{action.title}</Text><Text style={styles.rowDetail}>{action.detail}</Text></View><Ionicons name="arrow-forward" size={18} color={colors.muted} /></Pressable>)}</View>
      <View style={styles.boundary}><Ionicons name="lock-closed-outline" size={19} color={colors.tealDark} /><View style={styles.copy}><Text style={styles.boundaryTitle}>Access boundary</Text><Text style={styles.boundaryText}>Shared-member access is read-only and controlled by the club administrator.</Text></View></View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  nav: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadows.soft },
  navTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 16 },
  navSpace: { width: 44 },
  head: { marginTop: 28 }, kicker: { ...type.label, color: colors.tealMid }, title: { ...type.h1, color: colors.ink, marginTop: 7 }, body: { color: colors.muted, fontFamily: fonts.medium, fontSize: 15, lineHeight: 22, marginTop: 9 },
  trust: { minHeight: 190, justifyContent: 'flex-end', padding: 22, borderRadius: radius.lg, backgroundColor: colors.tealDark, marginTop: 25, overflow: 'hidden' },
  trustTitle: { color: colors.white, fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28, marginTop: 16 },
  trustText: { color: '#C7E5E1', fontFamily: fonts.medium, fontSize: 13, lineHeight: 20, marginTop: 7 },
  section: { marginTop: 28 }, sectionLabel: { ...type.label, color: colors.muted, marginBottom: 5 },
  row: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  copy: { flex: 1 }, rowTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 16 }, rowDetail: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 17, marginTop: 4 },
  boundary: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, padding: 16, borderRadius: radius.md, backgroundColor: colors.mist, marginTop: 24 },
  boundaryTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 14 }, boundaryText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, marginTop: 4 },
  pressed: { opacity: 0.68, transform: [{ scale: 0.985 }] },
});
