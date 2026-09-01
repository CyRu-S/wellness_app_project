import React, { useEffect, useState } from 'react';
import { Alert, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import Screen from '../../components/common/Screen';
import ProfilePhotoCropper from '../../components/user/ProfilePhotoCropper';
import { updateProfile } from '../../store/slices/authSlice';
import { saveProfileDetails, saveProfilePhoto } from '../../store/slices/profileSlice';
import { colors, fonts, radius, shadows, type } from '../../theme';
import { chooseProfilePhoto, profileImageSource } from '../../utils/profilePhoto';

export default function EditProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);
  const profile = useSelector((state) => state.profile);
  const [name, setName] = useState(user?.name || profile.name || '');
  const [photo, setPhoto] = useState(null);
  const [cropCandidate, setCropCandidate] = useState(null);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const saving = profile.status === 'saving';
  const currentPhoto = photo?.persistentUri || photo?.uri || profile.profileImageUrl || user?.profileImageUrl;
  const currentPhotoSource = profileImageSource(currentPhoto, token, profile.profileImageVersion);

  useEffect(() => { setName(user?.name || profile.name || ''); }, [profile.name, user?.name]);

  const selectPhoto = async () => {
    try {
      const selected = await chooseProfilePhoto();
      if (selected?.needsCrop) setCropCandidate(selected);
      else if (selected) setPhoto(selected);
    } catch (photoError) {
      Alert.alert('Could not open photos', photoError.message || 'Please try again.');
    }
  };

  const save = async () => {
    const nextName = name.trim();
    if (nextName.length < 2) { setError('Enter at least 2 characters.'); return; }
    if (nextName.length > 120) { setError('Keep your profile name under 120 characters.'); return; }
    setSaveError('');
    try {
      const photoResult = photo ? await dispatch(saveProfilePhoto({ token, photo })).unwrap() : null;
      const result = await dispatch(saveProfileDetails({ token, details: { name: nextName, dietaryPreferences: profile.dietaryPreferences || '' } })).unwrap();
      dispatch(updateProfile({ name: result.name || nextName, ...(photoResult?.profileImageUrl ? { profileImageUrl: photoResult.profileImageUrl } : {}) }));
      navigation.goBack();
    } catch (saveFailure) {
      const message = saveFailure.message || 'Please try again.';
      setSaveError(message);
      if (Platform.OS !== 'web') Alert.alert('Could not update profile', message);
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.nav}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><Ionicons name="arrow-back" size={20} color={colors.ink} /></Pressable><Text style={styles.navTitle}>Edit profile</Text><View style={styles.navSpace} /></View>
      <View style={styles.head}><Text style={styles.kicker}>PROFILE NAME</Text><Text style={styles.title}>What should we call you?</Text><Text style={styles.body}>This name appears across your dashboard and is visible to your assigned coach.</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel={currentPhoto ? 'Change profile photo' : 'Add profile photo'} onPress={selectPhoto} style={({ pressed }) => [styles.photoEditor, pressed && styles.pressed]}>
        <View style={styles.avatar}>
          {currentPhotoSource ? <Image source={currentPhotoSource} resizeMode="cover" style={styles.avatarImage} /> : <Text style={styles.avatarInitial}>{(name || 'M')[0].toUpperCase()}</Text>}
          <View style={styles.camera}><Ionicons name="camera" size={17} color={colors.white} /></View>
        </View>
        <View style={styles.photoCopy}><Text style={styles.photoTitle}>{currentPhoto ? 'Change profile picture' : 'Add profile picture'}</Text><Text style={styles.photoHint}>Choose a clear square photo. Your assigned coach will also see it.</Text></View>
        <Ionicons name="chevron-forward" size={19} color={colors.muted} />
      </Pressable>
      <View style={styles.form}>
        <Text style={styles.label}>FULL NAME</Text>
        <View style={[styles.inputWrap, error && styles.inputError]}><Ionicons name="person-outline" size={20} color={error ? colors.danger : colors.tealMid} /><TextInput autoFocus accessibilityLabel="Full name" value={name} onChangeText={(value) => { setName(value); setError(''); }} autoCapitalize="words" autoCorrect={false} maxLength={120} returnKeyType="done" onSubmitEditing={save} style={styles.input} /></View>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <View style={styles.readOnly}><Ionicons name="mail-outline" size={19} color={colors.tealMid} /><View><Text style={styles.readOnlyLabel}>EMAIL</Text><Text style={styles.readOnlyValue}>{user?.email}</Text></View></View>
      </View>
      {saveError ? <Text accessibilityRole="alert" style={styles.saveError}>{saveError}</Text> : null}
      <Pressable accessibilityRole="button" disabled={saving} onPress={save} style={({ pressed }) => [styles.save, saving && styles.disabled, pressed && styles.pressed]}><Text style={styles.saveText}>{saving ? 'Saving…' : 'Save profile'}</Text><Ionicons name="checkmark" size={19} color={colors.white} /></Pressable>
      <ProfilePhotoCropper photo={cropCandidate} onCancel={() => setCropCandidate(null)} onConfirm={(cropped) => { setPhoto(cropped); setCropCandidate(null); setSaveError(''); }} />
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
  photoEditor: { minHeight: 112, flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 24, padding: 15, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, ...shadows.soft },
  avatar: { width: 72, height: 72, borderRadius: 25, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 25 },
  avatarInitial: { color: colors.accent, fontFamily: fonts.bold, fontSize: 28 },
  camera: { position: 'absolute', right: -4, bottom: -4, width: 29, height: 29, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tealMid, borderWidth: 3, borderColor: colors.surface },
  photoCopy: { flex: 1, minWidth: 0 },
  photoTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
  photoHint: { color: colors.muted, fontFamily: fonts.medium, fontSize: 11, lineHeight: 16, marginTop: 4 },
  form: { marginTop: 22 },
  label: { ...type.label, color: colors.muted, marginBottom: 8 },
  inputWrap: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 15, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  inputError: { borderColor: colors.danger, backgroundColor: '#FFF5F3' },
  input: { flex: 1, minHeight: 56, color: colors.ink, fontFamily: fonts.semibold, fontSize: 16 },
  error: { color: colors.danger, fontFamily: fonts.medium, fontSize: 12, lineHeight: 17, marginTop: 7 },
  saveError: { color: colors.danger, fontFamily: fonts.medium, fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 18 },
  readOnly: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 17, paddingHorizontal: 15, borderRadius: radius.md, backgroundColor: colors.mist },
  readOnlyLabel: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1 },
  readOnlyValue: { color: colors.ink, fontFamily: fonts.medium, fontSize: 14, marginTop: 4 },
  save: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: radius.md, backgroundColor: colors.tealMid, marginTop: 28 },
  saveText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 15 },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.68, transform: [{ scale: 0.985 }] },
});
