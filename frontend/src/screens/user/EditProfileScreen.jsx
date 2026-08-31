import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import Screen from '../../components/common/Screen';
import { updateProfile } from '../../store/slices/authSlice';
import { saveProfileDetails } from '../../store/slices/profileSlice';
import { colors, fonts, radius, shadows, type } from '../../theme';

export default function EditProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);
  const profile = useSelector((state) => state.profile);
  const [name, setName] = useState(user?.name || profile.name || '');
  const [error, setError] = useState('');
  const saving = profile.status === 'saving';

  useEffect(() => { setName(user?.name || profile.name || ''); }, [profile.name, user?.name]);

  const save = async () => {
    const nextName = name.trim();
    if (nextName.length < 2) { setError('Enter at least 2 characters.'); return; }
    if (nextName.length > 120) { setError('Keep your profile name under 120 characters.'); return; }
    try {
      const result = await dispatch(saveProfileDetails({ token, details: { name: nextName, dietaryPreferences: profile.dietaryPreferences || '' } })).unwrap();
      dispatch(updateProfile({ name: result.name || nextName }));
      navigation.goBack();
    } catch (saveError) {
      Alert.alert('Could not update profile', saveError.message || 'Please try again.');
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.nav}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><Ionicons name="arrow-back" size={20} color={colors.ink} /></Pressable><Text style={styles.navTitle}>Edit profile</Text><View style={styles.navSpace} /></View>
      <View style={styles.head}><Text style={styles.kicker}>PROFILE NAME</Text><Text style={styles.title}>What should we call you?</Text><Text style={styles.body}>This name appears across your dashboard and is visible to your assigned coach.</Text></View>
      <View style={styles.form}>
        <Text style={styles.label}>FULL NAME</Text>
        <View style={[styles.inputWrap, error && styles.inputError]}><Ionicons name="person-outline" size={20} color={error ? colors.danger : colors.tealMid} /><TextInput autoFocus accessibilityLabel="Full name" value={name} onChangeText={(value) => { setName(value); setError(''); }} autoCapitalize="words" autoCorrect={false} maxLength={120} returnKeyType="done" onSubmitEditing={save} style={styles.input} /></View>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <View style={styles.readOnly}><Ionicons name="mail-outline" size={19} color={colors.tealMid} /><View><Text style={styles.readOnlyLabel}>EMAIL</Text><Text style={styles.readOnlyValue}>{user?.email}</Text></View></View>
      </View>
      <Pressable accessibilityRole="button" disabled={saving} onPress={save} style={({ pressed }) => [styles.save, saving && styles.disabled, pressed && styles.pressed]}><Text style={styles.saveText}>{saving ? 'Saving…' : 'Save profile name'}</Text><Ionicons name="checkmark" size={19} color={colors.white} /></Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 28 },
  nav: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadows.soft },
  navTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 16 },
  navSpace: { width: 44 },
  head: { marginTop: 30 },
  kicker: { ...type.label, color: colors.tealMid },
  title: { ...type.h1, color: colors.ink, marginTop: 7 },
  body: { color: colors.muted, fontFamily: fonts.medium, fontSize: 15, lineHeight: 22, marginTop: 9, maxWidth: 345 },
  form: { marginTop: 30 },
  label: { ...type.label, color: colors.muted, marginBottom: 8 },
  inputWrap: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 15, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  inputError: { borderColor: colors.danger, backgroundColor: '#FFF5F3' },
  input: { flex: 1, minHeight: 56, color: colors.ink, fontFamily: fonts.semibold, fontSize: 16 },
  error: { color: colors.danger, fontFamily: fonts.medium, fontSize: 12, lineHeight: 17, marginTop: 7 },
  readOnly: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 17, paddingHorizontal: 15, borderRadius: radius.md, backgroundColor: colors.mist },
  readOnlyLabel: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1 },
  readOnlyValue: { color: colors.ink, fontFamily: fonts.medium, fontSize: 14, marginTop: 4 },
  save: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: radius.md, backgroundColor: colors.tealMid, marginTop: 28 },
  saveText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 15 },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.68, transform: [{ scale: 0.985 }] },
});
