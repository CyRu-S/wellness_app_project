import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminScreen from '../../components/admin/AdminScreen';
import AppLogo from '../../components/common/AppLogo';
import { saveProfileDetails } from '../../store/slices/profileSlice';
import { adminColors, adminFonts, adminRadius } from '../../theme/admin';

const makeForm = (admin) => ({
  name: admin?.name || '',
  email: admin?.email || '',
  phone: admin?.phone || '',
  clubName: admin?.clubName || '',
});

function ViewField({ icon, label, value }) {
  return (
    <View style={styles.viewField}>
      <View style={styles.fieldIcon}><Ionicons name={icon} size={17} color={adminColors.teal} /></View>
      <View style={styles.viewCopy}><Text style={styles.fieldLabel}>{label}</Text><Text selectable style={styles.viewValue}>{value || 'Not added'}</Text></View>
    </View>
  );
}

function EditField({ icon, label, value, onChangeText, error, keyboardType, autoCapitalize = 'words' }) {
  return (
    <View style={styles.inputBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputWrap, error && styles.inputError]}>
        <Ionicons name={icon} size={17} color={error ? adminColors.coral : adminColors.teal} />
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          style={styles.input}
        />
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export default function AdminProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const admin = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);
  const profile = useSelector((state) => state.profile);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => makeForm(admin));
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  // Only refresh the form from the account while it is not being edited.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (!editing) setForm(makeForm(admin)); }, [admin, editing]);

  const setField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setSaved(false);
  };

  const validate = () => {
    const next = {};
    ['name', 'clubName'].forEach((key) => { if (!form[key].trim()) next[key] = 'This field is required.'; });
    if (form.name.trim().length > 120) next.name = 'Use 120 characters or fewer.';
    if (form.clubName.trim().length > 120) next.clubName = 'Use 120 characters or fewer.';
    if (form.phone.trim() && !/^\+?[0-9 ()-]{7,30}$/.test(form.phone.trim())) next.phone = 'Enter a valid phone number.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    if (saving || !validate()) return;
    setSaving(true); setSaveError('');
    try {
      await dispatch(saveProfileDetails({ token, details: { name: form.name.trim(), dietaryPreferences: profile.dietaryPreferences || '',
        phone: form.phone.trim(), clubName: form.clubName.trim() } })).unwrap();
      setEditing(false); setSaved(true);
    } catch (error) { setSaveError(error.message || 'Could not save your profile. Please retry.'); }
    finally { setSaving(false); }
  };

  const cancel = () => {
    setForm(makeForm(admin));
    setErrors({});
    setEditing(false);
  };

  return (
    <AdminScreen keyboardShouldPersistTaps="handled">
      <AdminHeader
        title="Admin profile"
        back
        onBackPress={() => navigation.goBack()}
      />

      <View style={styles.hero}>
        <View style={styles.avatarWrap}><AppLogo size={78} style={styles.avatar} /><View style={styles.verified}><Ionicons name="checkmark" size={11} color={adminColors.white} /></View></View>
        <Text style={styles.name}>{admin?.name || 'Arjun'}</Text>
        <Text style={styles.club}>{admin?.clubName || 'Mr_Care Collective'}</Text>
        <View style={styles.rolePill}><Ionicons name="shield-checkmark-outline" size={13} color={adminColors.deepTeal} /><Text style={styles.roleText}>Club administrator</Text></View>
      </View>

      {saved && <View accessibilityRole="alert" style={styles.saved}><Ionicons name="checkmark-circle" size={18} color={adminColors.teal} /><Text style={styles.savedText}>Profile saved. Home and Settings are already up to date.</Text></View>}

      <View style={styles.sectionHeading}><View><Text style={styles.eyebrow}>{editing ? 'EDITING' : 'CONTACT'}</Text><Text style={styles.sectionTitle}>{editing ? 'Update your details' : 'Profile details'}</Text></View>{!editing && <Pressable accessibilityRole="button" onPress={() => setEditing(true)} style={styles.editButton}><Text style={styles.editButtonText}>Edit profile</Text></Pressable>}</View>

      <View style={styles.formCard}>
        {editing ? (
          <>
            <EditField icon="person-outline" label="FULL NAME" value={form.name} onChangeText={(value) => setField('name', value)} error={errors.name} />
            <ViewField icon="mail-outline" label="SIGN-IN EMAIL (VERIFIED)" value={admin?.email} />
            <EditField icon="call-outline" label="PHONE" value={form.phone} onChangeText={(value) => setField('phone', value)} error={errors.phone} keyboardType="phone-pad" autoCapitalize="none" />
            <EditField icon="business-outline" label="CLUB NAME" value={form.clubName} onChangeText={(value) => setField('clubName', value)} error={errors.clubName} />
          </>
        ) : (
          <>
            <ViewField icon="person-outline" label="FULL NAME" value={admin?.name} />
            <ViewField icon="mail-outline" label="EMAIL" value={admin?.email} />
            <ViewField icon="call-outline" label="PHONE" value={admin?.phone} />
            <ViewField icon="business-outline" label="CLUB NAME" value={admin?.clubName} />
          </>
        )}
      </View>

      {saveError ? <Text accessibilityRole="alert" style={styles.errorText}>{saveError}</Text> : null}

      {editing && (
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" disabled={saving} onPress={save} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}><Text style={styles.saveText}>{saving ? 'Saving…' : 'Save changes'}</Text></Pressable>
          <Pressable accessibilityRole="button" disabled={saving} onPress={cancel} style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}><Text style={styles.cancelText}>Cancel</Text></Pressable>
        </View>
      )}
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: 26, borderBottomWidth: 1, borderBottomColor: adminColors.line, marginTop: 11 },
  avatarWrap: { width: 78, height: 78 },
  avatar: { borderWidth: 2, borderColor: adminColors.aquaStrong },
  verified: { position: 'absolute', right: -3, bottom: 4, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.teal, borderWidth: 3, borderColor: adminColors.canvas },
  name: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 22, letterSpacing: -0.6, marginTop: 13 },
  club: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 12, marginTop: 4 },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: adminColors.aqua, marginTop: 10 },
  roleText: { color: adminColors.deepTeal, fontFamily: adminFonts.semibold, fontSize: 11 },
  saved: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13, borderRadius: adminRadius.md, backgroundColor: adminColors.aqua, marginTop: 14 },
  savedText: { flex: 1, color: adminColors.ink, fontFamily: adminFonts.medium, fontSize: 12, lineHeight: 18 },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 25, marginBottom: 10 },
  eyebrow: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 11, letterSpacing: 1.1 },
  sectionTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 17, marginTop: 4 },
  editButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  editButtonText: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 12 },
  formCard: { overflow: 'hidden', padding: 14, gap: 13, borderRadius: adminRadius.lg, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line },
  viewField: { minHeight: 58, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: adminColors.line },
  fieldIcon: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.aqua },
  viewCopy: { flex: 1, minWidth: 0, paddingLeft: 11 },
  fieldLabel: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 11, letterSpacing: 0.9 },
  viewValue: { color: adminColors.ink, fontFamily: adminFonts.medium, fontSize: 13, marginTop: 4 },
  inputBlock: { gap: 6 },
  inputWrap: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12, borderRadius: 14, backgroundColor: adminColors.surfaceMuted, borderWidth: 1, borderColor: adminColors.line },
  inputError: { borderColor: adminColors.coral, backgroundColor: adminColors.coralSoft },
  input: { flex: 1, minHeight: 48, color: adminColors.ink, fontFamily: adminFonts.medium, fontSize: 14 },
  errorText: { color: adminColors.coral, fontFamily: adminFonts.medium, fontSize: 11 },
  actions: { marginTop: 14, gap: 8 },
  saveButton: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: adminRadius.md, backgroundColor: adminColors.teal },
  saveText: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 12 },
  cancelButton: { minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 12 },
  pressed: { opacity: 0.7 },
});
