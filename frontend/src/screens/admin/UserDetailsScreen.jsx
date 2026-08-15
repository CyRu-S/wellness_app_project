import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import PrimaryButton from '../../components/common/PrimaryButton';
import Screen from '../../components/common/Screen';
import { colors, radius, type } from '../../theme';

export default function UserDetailsScreen({ route }) {
  const name = route.params?.name || 'Aarav Mehta';
  return <Screen><Text style={styles.kicker}>MEMBER PROFILE</Text><Text style={styles.title}>{name}</Text><Text style={styles.meta}>Active since 12 July 2026</Text><View style={styles.summary}><Text style={styles.summaryLabel}>CURRENT PLAN</Text><Text style={styles.summaryTitle}>Balanced energy</Text><Text style={styles.summaryText}>72% adherence · 8 day streak</Text></View>{[['Daily energy', 'Improving'], ['Average plan completion', '82%'], ['Water target', '2.1 litres'], ['Last check-in', '2 days ago']].map(([label, value]) => <View key={label} style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.value}>{value}</Text></View>)}<View style={styles.actions}><PrimaryButton title="Edit plan" onPress={() => {}} /><PrimaryButton secondary title="Message member" onPress={() => {}} /></View></Screen>;
}
const styles = StyleSheet.create({ kicker: { ...type.label, color: colors.moss, marginTop: 20 }, title: { ...type.display, color: colors.ink, marginTop: 5 }, meta: { color: colors.muted, marginTop: 5 }, summary: { backgroundColor: colors.ink, borderRadius: radius.lg, padding: 24, marginVertical: 28 }, summaryLabel: { ...type.label, color: '#AAC0B4' }, summaryTitle: { color: colors.white, fontSize: 25, fontWeight: '800', marginTop: 7 }, summaryText: { color: colors.accent, marginTop: 8, fontWeight: '700' }, row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line }, rowLabel: { color: colors.muted }, value: { color: colors.ink, fontWeight: '800' }, actions: { gap: 12, marginTop: 28 } });

