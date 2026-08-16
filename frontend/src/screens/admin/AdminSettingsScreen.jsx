import React from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminScreen from '../../components/admin/AdminScreen';
import AppLogo from '../../components/common/AppLogo';
import { signOut } from '../../store/slices/authSlice';
import { selectAdminPreferences, setPreference } from '../../store/slices/adminSlice';
import { adminColors, adminFonts, adminRadius } from '../../theme/admin';

function Section({ label, children }) {
  return <View style={styles.section}><Text style={styles.sectionLabel}>{label}</Text><View style={styles.sectionBody}>{children}</View></View>;
}

function ActionRow({ icon, title, detail, onPress, last }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && styles.pressed]}>
      <View style={styles.rowIcon}><Ionicons name={icon} size={18} color={adminColors.teal} /></View>
      <View style={styles.rowCopy}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowDetail}>{detail}</Text></View>
      <Ionicons name="chevron-forward" size={17} color={adminColors.muted} />
    </Pressable>
  );
}

function ToggleRow({ icon, title, detail, value, onValueChange, last }) {
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: value }} accessibilityLabel={title} onPress={() => onValueChange(!value)} style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && styles.pressed]}>
      <View style={styles.rowIcon}><Ionicons name={icon} size={18} color={adminColors.teal} /></View>
      <View style={styles.rowCopy}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowDetail}>{detail}</Text></View>
      <Switch accessible={false} pointerEvents="none" value={value} trackColor={{ false: '#DCE5E1', true: adminColors.teal }} thumbColor={adminColors.white} ios_backgroundColor="#DCE5E1" />
    </Pressable>
  );
}

export default function AdminSettingsScreen({ navigation }) {
  const dispatch = useDispatch();
  const admin = useSelector((state) => state.auth.user);
  const preferences = useSelector(selectAdminPreferences);
  const comingNext = (title) => Alert.alert(title, 'This destination is planned for the next admin release.');

  const changePreference = (key, value) => dispatch(setPreference({ key, value }));

  return (
    <AdminScreen>
      <AdminHeader title="Settings" rightIcon="help-circle-outline" onRightPress={() => Alert.alert('Admin help', 'Manage your profile, alerts, privacy, and workspace access here.')} />

      <View style={styles.heading}>
        <Text style={styles.eyebrow}>WORKSPACE</Text>
        <Text style={styles.title}>Make it yours.</Text>
        <Text style={styles.subtitle}>A few quiet controls for how you lead and how Wellnest keeps you informed.</Text>
      </View>

      <Pressable accessibilityRole="button" onPress={() => navigation.navigate('AdminProfile')} style={({ pressed }) => [styles.identity, pressed && styles.pressed]}>
        <AppLogo size={60} style={styles.avatar} />
        <View style={styles.identityCopy}>
          <Text style={styles.identityName}>{admin?.name || 'Arpan'}</Text>
          <Text style={styles.identityClub}>{admin?.clubName || 'Wellnest Collective'}</Text>
          <View style={styles.roleLine}><Ionicons name="shield-checkmark-outline" size={12} color={adminColors.teal} /><Text style={styles.roleText}>Club administrator</Text></View>
        </View>
        <View style={styles.editPill}><Text style={styles.editText}>Edit</Text><Ionicons name="arrow-forward" size={14} color={adminColors.teal} /></View>
      </Pressable>

      <Section label="ACCOUNT & ACCESS">
        <ActionRow icon="person-outline" title="Personal profile" detail="Identity and club contact details" onPress={() => navigation.navigate('AdminProfile')} />
        <ActionRow icon="key-outline" title="Security" detail="Password and signed-in devices" onPress={() => comingNext('Security')} last />
      </Section>

      <Section label="SMART ALERTS">
        <ToggleRow icon="person-add-outline" title="New signup requests" detail="When someone asks to join" value={preferences.signupAlerts} onValueChange={(value) => changePreference('signupAlerts', value)} />
        <ToggleRow icon="alert-circle-outline" title="Missed deadline alerts" detail="When a member needs support" value={preferences.deadlineAlerts} onValueChange={(value) => changePreference('deadlineAlerts', value)} />
        <ToggleRow icon="analytics-outline" title="Daily club digest" detail="A morning operations summary" value={preferences.dailyDigest} onValueChange={(value) => changePreference('dailyDigest', value)} last />
      </Section>

      <Section label="PRIVACY & LEGAL">
        <ActionRow icon="shield-checkmark-outline" title="Data and privacy" detail="How member information is handled" onPress={() => comingNext('Data and privacy')} />
        <ActionRow icon="document-text-outline" title="Admin terms" detail="Responsibilities and platform policy" onPress={() => comingNext('Admin terms')} last />
      </Section>

      <View style={styles.privacyNote}>
        <Ionicons name="lock-closed-outline" size={18} color={adminColors.deepTeal} />
        <View style={styles.noteCopy}><Text style={styles.noteTitle}>Private by default</Text><Text style={styles.noteText}>Member activity is confidential coaching information and should be handled with care.</Text></View>
      </View>

      <Pressable accessibilityRole="button" onPress={() => dispatch(signOut())} style={({ pressed }) => [styles.logout, pressed && styles.pressed]}>
        <Ionicons name="log-out-outline" size={19} color={adminColors.coral} />
        <Text style={styles.logoutText}>Sign out of admin</Text>
      </Pressable>
      <Text style={styles.version}>Wellnest Admin · Prototype 0.2</Text>
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  heading: { marginTop: 27 },
  eyebrow: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 11, letterSpacing: 1.4 },
  title: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 30, lineHeight: 36, letterSpacing: -1.1, marginTop: 7 },
  subtitle: { maxWidth: 330, color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 14, lineHeight: 21, marginTop: 5 },
  identity: { minHeight: 105, flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: adminColors.line, marginTop: 22 },
  avatar: { borderWidth: 2, borderColor: adminColors.aquaStrong },
  identityCopy: { flex: 1, minWidth: 0, paddingHorizontal: 13 },
  identityName: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 18 },
  identityClub: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 12, marginTop: 3 },
  roleLine: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  roleText: { color: adminColors.teal, fontFamily: adminFonts.medium, fontSize: 11 },
  editPill: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10 },
  editText: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 12 },
  section: { marginTop: 25 },
  sectionLabel: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 11, letterSpacing: 1.2, marginLeft: 3, marginBottom: 9 },
  sectionBody: { overflow: 'hidden', borderRadius: adminRadius.lg, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line },
  row: { minHeight: 69, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: adminColors.line },
  rowIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.aqua },
  rowCopy: { flex: 1, minWidth: 0, paddingHorizontal: 11 },
  rowTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 13 },
  rowDetail: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 12, lineHeight: 17, marginTop: 3 },
  privacyNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, borderRadius: adminRadius.lg, padding: 15, backgroundColor: adminColors.sageSoft, marginTop: 18 },
  noteCopy: { flex: 1 },
  noteTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 12 },
  noteText: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 12, lineHeight: 18, marginTop: 3 },
  logout: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: adminRadius.md, borderWidth: 1, borderColor: '#F0C6C2', marginTop: 20 },
  logoutText: { color: adminColors.coral, fontFamily: adminFonts.semibold, fontSize: 12 },
  version: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 11, textAlign: 'center', marginTop: 17 },
  pressed: { opacity: 0.7 },
});
