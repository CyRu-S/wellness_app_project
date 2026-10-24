import { LocalizedText as Text } from '../../components/common/LocalizedText';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import Screen from '../../components/common/Screen';
import { request } from '../../services/api/client';
import { colors, fonts, radius, shadows, type } from '../../theme';

export default function HealthReportsScreen({ navigation }) {
  const token = useSelector((state) => state.auth.token);
  const [reports, setReports] = useState([]);
  const [status, setStatus] = useState('loading');
  const load = useCallback(async () => {
    setStatus('loading');
    try { setReports(await request('/profile/history', { headers: { Authorization: `Bearer ${token}` }, cachePolicy: 'network-only' })); setStatus('ready'); }
    catch { setStatus('error'); }
  }, [token]);
  useEffect(() => {
    let active = true;
    request('/profile/history', { headers: { Authorization: `Bearer ${token}` }, cachePolicy: 'network-only' })
      .then((items) => { if (active) { setReports(items); setStatus('ready'); } })
      .catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [token]);
  return <Screen>
    <View style={styles.nav}><Pressable accessibilityLabel="Go back" onPress={() => navigation.goBack()} style={styles.back}><Ionicons name="arrow-back" size={20} color={colors.ink} /></Pressable><Text style={styles.navTitle}>Health reports</Text><View style={styles.navSpace} /></View>
    <View style={styles.head}><Text style={styles.kicker}>SAVED CHECK-INS</Text><Text style={styles.title}>Your health history</Text><Text style={styles.body}>Each saved body-measurement check-in appears here.</Text></View>
    {status === 'loading' ? <ActivityIndicator color={colors.tealMid} style={styles.state} /> : null}
    {status === 'error' ? <Pressable onPress={load} style={styles.state}><Text style={styles.error}>Reports could not be loaded. Tap to retry.</Text></Pressable> : null}
    <View style={styles.list}>{reports.map((report) => <View key={report.id} style={styles.report}><View style={styles.reportHead}><Text style={styles.date}>{new Date(report.recordedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text><Ionicons name="checkmark-circle" size={18} color={colors.tealMid} /></View><View style={styles.metrics}><Text style={styles.metric}>{report.weightKg ?? '—'} kg</Text><Text style={styles.metric}>{report.heightCm ?? '—'} cm</Text><Text style={styles.metric}>{report.bodyFatPercent ?? '—'}% body fat</Text></View><Text style={styles.preferences}>{report.dietaryPreferences || 'No health preferences recorded'}</Text></View>)}</View>
    {status === 'ready' && !reports.length ? <View style={styles.empty}><Ionicons name="document-text-outline" size={28} color={colors.tealMid} /><Text style={styles.emptyTitle}>No saved reports yet</Text><Text style={styles.body}>Your next health-profile update will appear here.</Text></View> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  nav: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadows.soft }, navTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 16 }, navSpace: { width: 44 },
  head: { marginTop: 27 }, kicker: { ...type.label, color: colors.tealMid }, title: { ...type.h1, color: colors.ink, marginTop: 7 }, body: { color: colors.muted, fontFamily: fonts.medium, fontSize: 14, lineHeight: 21, marginTop: 7 }, state: { marginTop: 30 }, error: { color: colors.danger, textAlign: 'center' }, list: { marginTop: 23, gap: 12 }, report: { padding: 17, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }, reportHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, date: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 15 }, metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }, metric: { color: colors.tealDark, fontFamily: fonts.semibold, fontSize: 12, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.accentSoft }, preferences: { color: colors.muted, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, marginTop: 13 }, empty: { alignItems: 'center', padding: 28, marginTop: 24, borderRadius: radius.md, backgroundColor: colors.mist }, emptyTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 17, marginTop: 10 },
});
