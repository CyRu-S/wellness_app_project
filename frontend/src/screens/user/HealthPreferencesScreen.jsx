import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import Screen from '../../components/common/Screen';
import { saveProfileDetails } from '../../store/slices/profileSlice';
import { colors, fonts, radius, shadows, type } from '../../theme';

const options = ['No preference', 'Vegetarian', 'High protein', 'Low sodium', 'Dairy-free', 'Gluten-free'];

export default function HealthPreferencesScreen({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);
  const profile = useSelector((state) => state.profile);
  const initial = useMemo(() => (profile.dietaryPreferences || '').split(',').map((item) => item.trim()).filter(Boolean), [profile.dietaryPreferences]);
  const [selected, setSelected] = useState(initial.length ? initial : ['No preference']);
  const saving = profile.status === 'saving';

  const toggle = (option) => {
    if (option === 'No preference') { setSelected(['No preference']); return; }
    setSelected((current) => {
      const withoutDefault = current.filter((item) => item !== 'No preference');
      const next = withoutDefault.includes(option) ? withoutDefault.filter((item) => item !== option) : [...withoutDefault, option];
      return next.length ? next : ['No preference'];
    });
  };

  const save = async () => {
    const dietaryPreferences = selected.includes('No preference') ? '' : selected.join(', ');
    try {
      await dispatch(saveProfileDetails({ token, details: { name: user?.name || profile.name, dietaryPreferences } })).unwrap();
      Alert.alert('Preferences saved', 'Your health preferences are now available to your coach.', [{ text: 'Done', onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert('Could not save preferences', error.message || 'Please try again.');
    }
  };

  return (
    <Screen>
      <View style={styles.nav}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><Ionicons name="arrow-back" size={20} color={colors.ink} /></Pressable><Text style={styles.navTitle}>Health preferences</Text><View style={styles.navSpace} /></View>
      <View style={styles.head}><Text style={styles.kicker}>NUTRITION PROFILE</Text><Text style={styles.title}>Make your plan fit you</Text><Text style={styles.body}>Select every preference that applies. Your coach can use these details when reviewing meals.</Text></View>
      <View style={styles.options}>{options.map((option) => { const active = selected.includes(option); return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: active }} key={option} onPress={() => toggle(option)} style={({ pressed }) => [styles.option, active && styles.optionActive, pressed && styles.pressed]}><View style={[styles.check, active && styles.checkActive]}>{active ? <Ionicons name="checkmark" size={16} color={colors.white} /> : null}</View><Text style={[styles.optionText, active && styles.optionTextActive]}>{option}</Text></Pressable>; })}</View>
      <View style={styles.note}><Ionicons name="people-outline" size={20} color={colors.tealDark} /><Text style={styles.noteText}>These preferences support planning. They do not replace medical or allergy advice.</Text></View>
      <Pressable accessibilityRole="button" disabled={saving} onPress={save} style={({ pressed }) => [styles.save, saving && styles.disabled, pressed && styles.pressed]}><Text style={styles.saveText}>{saving ? 'Saving…' : 'Save health preferences'}</Text><Ionicons name="checkmark" size={19} color={colors.white} /></Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  nav: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadows.soft },
  navTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 16 },
  navSpace: { width: 44 },
  head: { marginTop: 28 }, kicker: { ...type.label, color: colors.tealMid }, title: { ...type.h1, color: colors.ink, marginTop: 7 }, body: { color: colors.muted, fontFamily: fonts.medium, fontSize: 15, lineHeight: 22, marginTop: 9 },
  options: { marginTop: 25 },
  option: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  optionActive: { backgroundColor: colors.accentSoft, borderRadius: radius.md, borderBottomWidth: 0, paddingHorizontal: 13, marginVertical: 3 },
  check: { width: 26, height: 26, borderRadius: 9, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  checkActive: { backgroundColor: colors.tealMid, borderColor: colors.tealMid },
  optionText: { color: colors.ink, fontFamily: fonts.medium, fontSize: 15 },
  optionTextActive: { color: colors.tealDark, fontFamily: fonts.semibold },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 15, borderRadius: radius.md, backgroundColor: colors.mist, marginTop: 24 },
  noteText: { flex: 1, color: colors.inkSoft, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19 },
  save: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: radius.md, backgroundColor: colors.tealMid, marginTop: 22 },
  saveText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 15 },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.68, transform: [{ scale: 0.985 }] },
});
