import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import StaggeredView from '../../components/auth/StaggeredView';
import SyncFeedback from '../../components/common/SyncFeedback';
import Screen from '../../components/common/Screen';
import { BODY_UPDATE_INTERVAL_MS, loadProfile, saveBodyMetrics } from '../../store/slices/profileSlice';
import { colors, fonts, radius, shadows, type } from '../../theme';

function MetricField({ label, unit, value, onChangeText, editable }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}><TextInput value={value} onChangeText={onChangeText} editable={editable} keyboardType="decimal-pad" style={[styles.input, !editable && styles.inputLocked]} /><Text style={styles.unit}>{unit}</Text></View>
    </View>
  );
}

export default function BodyDetailsScreen({ navigation }) {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);
  const profile = useSelector((state) => state.profile);
  const [values, setValues] = useState(() => Object.fromEntries(Object.entries(profile.bodyMetrics).map(([key, value]) => [key, value == null ? '' : String(value)])));
  const [dirty, setDirty] = useState(false);
  const lastUpdated = profile.lastBodyMetricsUpdatedAt ? new Date(profile.lastBodyMetricsUpdatedAt) : null;
  const nextUpdate = lastUpdated ? new Date(lastUpdated.getTime() + BODY_UPDATE_INTERVAL_MS) : null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const locked = !!nextUpdate && now < nextUpdate.getTime();
  const loading = profile.status === 'loading';
  const saving = profile.status === 'saving';

  useEffect(() => { dispatch(loadProfile(token)); }, [dispatch, token]);
  useEffect(() => {
    if (dirty) return;
    // Refresh the editable draft when server-confirmed measurements change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValues(Object.fromEntries(Object.entries(profile.bodyMetrics).map(([key, value]) => [key, value == null ? '' : String(value)])));
  }, [profile.bodyMetrics, dirty]);

  const change = (key) => (value) => { setDirty(true); setValues((current) => ({ ...current, [key]: value })); };
  const submit = async () => {
    if (saving || locked) return;
    const metrics = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim() === '' ? null : Number(value)]));
    const valid = metrics.heightCm >= 100 && metrics.heightCm <= 250 && metrics.weightKg >= 25 && metrics.weightKg <= 350 && Number.isInteger(metrics.age) && metrics.age >= 1 && metrics.age <= 120 && (metrics.bodyFatPercent == null || (metrics.bodyFatPercent >= 3 && metrics.bodyFatPercent <= 70));
    if (!valid) { Alert.alert('Check your measurements', 'Enter realistic values in every field before saving.'); return; }
    try {
      await dispatch(saveBodyMetrics({ token, metrics })).unwrap();
      setDirty(false);
      Alert.alert('Body details updated', 'Your next update will be available in seven days.');
    } catch (error) {
      Alert.alert('Update unavailable', error.message || 'Please try again later.');
    }
  };

  return (
    <Screen>
      <SyncFeedback label="Measurements" pending={saving} error={profile.error} onRetry={submit} />
      <View style={styles.nav}><Pressable accessibilityLabel="Go back" onPress={() => navigation.goBack()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><Ionicons name="arrow-back" size={19} color={colors.ink} /></Pressable><Text style={styles.navTitle}>Personal details</Text><View style={styles.navSpace} /></View>
      <StaggeredView delay={40} style={styles.head}><Text style={styles.kicker}>BODY MEASUREMENTS</Text><Text style={styles.title}>Your weekly check-in</Text><Text style={styles.body}>Measurements can be updated once every seven days so progress stays consistent.</Text></StaggeredView>

      <StaggeredView delay={115} style={[styles.availability, locked && styles.availabilityLocked]}>
        <View style={styles.availabilityIcon}><Ionicons name={locked ? 'lock-closed-outline' : 'calendar-outline'} size={20} color={locked ? colors.muted : colors.tealDark} /></View>
        <View style={styles.availabilityCopy}><Text style={styles.availabilityLabel}>{locked ? 'NEXT UPDATE' : 'UPDATE AVAILABLE'}</Text><Text style={styles.availabilityValue}>{locked ? nextUpdate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' }) : 'You can update your measurements today'}</Text></View>
      </StaggeredView>

      <StaggeredView delay={185} style={styles.form}>
        <MetricField label="HEIGHT" unit="cm" value={values.heightCm} onChangeText={change('heightCm')} editable={!locked && !loading && !saving} />
        <MetricField label="WEIGHT" unit="kg" value={values.weightKg} onChangeText={change('weightKg')} editable={!locked && !loading && !saving} />
        <MetricField label="AGE" unit="years" value={values.age} onChangeText={change('age')} editable={!locked && !loading && !saving} />
        <MetricField label="BODY FAT" unit="%" value={values.bodyFatPercent} onChangeText={change('bodyFatPercent')} editable={!locked && !loading && !saving} />
      </StaggeredView>

      <Pressable disabled={locked || loading || saving} onPress={submit} style={({ pressed }) => [styles.save, (locked || loading || saving) && styles.saveDisabled, pressed && styles.pressed]}><Text style={styles.saveText}>{loading ? 'Checking availability…' : saving ? 'Saving…' : locked ? 'Locked until next week' : 'Save weekly update'}</Text><Ionicons name={locked ? 'lock-closed' : 'checkmark'} size={18} color={colors.white} /></Pressable>
      <View style={styles.privacy}><Ionicons name="shield-checkmark-outline" size={18} color={colors.tealMid} /><Text style={styles.privacyText}>Only you and your assigned coach can view these measurements.</Text></View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  nav: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadows.soft }, navTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 14 }, navSpace: { width: 42 }, pressed: { opacity: 0.65, transform: [{ scale: 0.98 }] },
  head: { marginTop: 25 }, kicker: { ...type.label, color: colors.tealMid }, title: { ...type.h1, color: colors.ink, marginTop: 6 }, body: { ...type.body, color: colors.muted, marginTop: 8, maxWidth: 340 },
  availability: { minHeight: 80, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.accentSoft, borderRadius: radius.md, paddingHorizontal: 15, marginTop: 23 }, availabilityLocked: { backgroundColor: colors.mist }, availabilityIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }, availabilityCopy: { flex: 1 }, availabilityLabel: { ...type.label, color: colors.tealMid, fontSize: 11 }, availabilityValue: { color: colors.ink, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, marginTop: 3 },
  form: { marginTop: 24 }, field: { paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line }, fieldLabel: { ...type.label, color: colors.muted, fontSize: 11 }, inputRow: { flexDirection: 'row', alignItems: 'center' }, input: { flex: 1, color: colors.ink, fontFamily: fonts.semibold, fontSize: 27, paddingVertical: 5 }, inputLocked: { color: colors.muted }, unit: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 14 },
  save: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.tealMid, borderRadius: radius.md, marginTop: 25 }, saveDisabled: { backgroundColor: colors.muted }, saveText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 15 }, privacy: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 17, paddingHorizontal: 4 }, privacyText: { flex: 1, color: colors.muted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 18 },
});
