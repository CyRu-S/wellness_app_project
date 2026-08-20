import React from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminScreen from '../../components/admin/AdminScreen';
import AppLogo from '../../components/common/AppLogo';
import { signOut } from '../../store/slices/authSlice';
import { selectAdminPreferences, setPreference } from '../../store/slices/adminSlice';
import { adminColors, adminFonts, adminRadius, adminShadow } from '../../theme/admin';

function SectionHeading({ eyebrow, title, meta }) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionHeadingCopy}>
        <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {meta ? <Text style={styles.sectionMeta}>{meta}</Text> : null}
    </View>
  );
}

function ActionRow({ icon, title, detail, onPress, last }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${detail}`}
      onPress={onPress}
      style={({ pressed }) => [styles.actionRow, !last && styles.rowBorder, pressed && styles.pressed]}
    >
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={21} color={adminColors.deepTeal} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDetail}>{detail}</Text>
      </View>
      <View style={styles.forwardButton}>
        <Ionicons name="arrow-forward" size={17} color={adminColors.deepTeal} />
      </View>
    </Pressable>
  );
}

function ToggleRow({ icon, title, detail, value, onValueChange, last }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={title}
      accessibilityHint={detail}
      onPress={() => onValueChange(!value)}
      style={({ pressed }) => [styles.toggleRow, !last && styles.toggleBorder, pressed && styles.pressed]}
    >
      <View style={[styles.toggleIcon, value && styles.toggleIconActive]}>
        <Ionicons name={icon} size={22} color={value ? adminColors.white : adminColors.deepTeal} />
      </View>
      <View style={styles.rowCopy}>
        <View style={styles.toggleTitleLine}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={[styles.toggleState, value && styles.toggleStateActive]}>{value ? 'On' : 'Off'}</Text>
        </View>
        <Text style={styles.rowDetail}>{detail}</Text>
      </View>
      <Switch
        accessible={false}
        pointerEvents="none"
        value={value}
        trackColor={{ false: '#D6E2DE', true: '#79C9C4' }}
        thumbColor={value ? adminColors.deepTeal : adminColors.white}
        ios_backgroundColor="#D6E2DE"
      />
    </Pressable>
  );
}

export default function AdminSettingsScreen({ navigation }) {
  const dispatch = useDispatch();
  const admin = useSelector((state) => state.auth.user);
  const preferences = useSelector(selectAdminPreferences);
  const activeAlerts = Object.values(preferences).filter(Boolean).length;
  const alertTotal = Object.keys(preferences).length;
  const comingNext = (title) => Alert.alert(title, 'This destination is planned for the next admin release.');

  const changePreference = (key, value) => dispatch(setPreference({ key, value }));
  const confirmSignOut = () => {
    Alert.alert(
      'Sign out of admin?',
      'You will return to the login screen.',
      [
        { text: 'Stay signed in', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: () => dispatch(signOut()) },
      ],
    );
  };

  return (
    <AdminScreen contentStyle={styles.screenContent}>
      <AdminHeader title="Settings" back onBackPress={() => navigation.navigate('AdminDashboard')} />

      <View style={styles.heading}>
        <Text style={styles.eyebrow}>YOUR WORKSPACE</Text>
        <Text style={styles.title}>Set your rhythm.</Text>
        <Text style={styles.subtitle}>Keep the signals that matter close, and let everything else stay quiet.</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open profile for ${admin?.name || 'Arpan'}`}
        onPress={() => navigation.navigate('AdminProfile')}
        style={({ pressed }) => [styles.identity, pressed && styles.pressed]}
      >
        <View style={styles.avatarWrap}>
          <AppLogo size={66} style={styles.avatar} />
          <View style={styles.onlineDot} />
        </View>
        <View style={styles.identityCopy}>
          <Text numberOfLines={1} style={styles.identityName}>{admin?.name || 'Arpan'}</Text>
          <Text numberOfLines={1} style={styles.identityEmail}>{admin?.email || 'arpan@wellnest.app'}</Text>
          <View style={styles.roleLine}>
            <Ionicons name="shield-checkmark" size={14} color={adminColors.teal} />
            <Text style={styles.roleText}>Club administrator</Text>
          </View>
        </View>
        <View style={styles.editButton}>
          <Ionicons name="create-outline" size={19} color={adminColors.deepTeal} />
        </View>
      </Pressable>

      <SectionHeading eyebrow="SMART ALERTS" title="Choose what reaches you" meta={`${activeAlerts} of ${alertTotal} on`} />
      <View style={styles.alertShell}>
        <LinearGradient
          colors={['#E0F5F1', '#C4E8E1']}
          start={{ x: 0.03, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.alertPanel}
        >
          <View pointerEvents="none" style={styles.alertOrbLarge} />
          <View pointerEvents="none" style={styles.alertOrbSmall} />
          <View style={styles.alertIntro}>
            <View style={styles.alertMark}>
              <Ionicons name="notifications" size={21} color={adminColors.white} />
            </View>
            <View style={styles.alertIntroCopy}>
              <Text style={styles.alertIntroTitle}>Your signal desk</Text>
              <Text style={styles.alertIntroText}>Changes are saved for this session.</Text>
            </View>
            <View style={styles.activeCount}>
              <Text style={styles.activeCountValue}>{activeAlerts}</Text>
              <Text style={styles.activeCountLabel}>ACTIVE</Text>
            </View>
          </View>

          <View style={styles.toggleList}>
            <ToggleRow
              icon="person-add-outline"
              title="New signup requests"
              detail="When someone asks to join your club"
              value={preferences.signupAlerts}
              onValueChange={(value) => changePreference('signupAlerts', value)}
            />
            <ToggleRow
              icon="alert-circle-outline"
              title="Missed deadline alerts"
              detail="When a member may need your support"
              value={preferences.deadlineAlerts}
              onValueChange={(value) => changePreference('deadlineAlerts', value)}
            />
            <ToggleRow
              icon="sunny-outline"
              title="Daily club digest"
              detail="A quiet morning summary of club activity"
              value={preferences.dailyDigest}
              onValueChange={(value) => changePreference('dailyDigest', value)}
              last
            />
          </View>
        </LinearGradient>
      </View>

      <SectionHeading eyebrow="ACCOUNT" title="Profile and access" />
      <View style={styles.actionList}>
        <ActionRow icon="person-outline" title="Personal profile" detail="Identity and club contact details" onPress={() => navigation.navigate('AdminProfile')} />
        <ActionRow icon="key-outline" title="Security" detail="Password and signed-in devices" onPress={() => comingNext('Security')} last />
      </View>

      <SectionHeading eyebrow="TRUST CENTER" title="Privacy, considered" />
      <View style={styles.privacyStatement}>
        <View style={styles.privacyIcon}>
          <Ionicons name="lock-closed" size={21} color="#BCEBE4" />
        </View>
        <View style={styles.privacyCopy}>
          <Text style={styles.privacyTitle}>Private by default</Text>
          <Text style={styles.privacyText}>Member activity is confidential coaching information. Wellnest keeps care and discretion at the center.</Text>
        </View>
      </View>
      <View style={styles.legalLinks}>
        <Pressable accessibilityRole="button" onPress={() => comingNext('Data and privacy')} style={({ pressed }) => [styles.legalLink, pressed && styles.pressed]}>
          <Text style={styles.legalText}>Data & privacy</Text>
          <Ionicons name="arrow-forward" size={16} color={adminColors.deepTeal} />
        </Pressable>
        <View style={styles.legalDivider} />
        <Pressable accessibilityRole="button" onPress={() => comingNext('Admin terms')} style={({ pressed }) => [styles.legalLink, pressed && styles.pressed]}>
          <Text style={styles.legalText}>Admin terms</Text>
          <Ionicons name="arrow-forward" size={16} color={adminColors.deepTeal} />
        </Pressable>
      </View>

      <Pressable accessibilityRole="button" onPress={confirmSignOut} style={({ pressed }) => [styles.logout, pressed && styles.pressed]}>
        <View style={styles.logoutIcon}><Ionicons name="log-out-outline" size={20} color={adminColors.coral} /></View>
        <Text style={styles.logoutText}>Sign out of admin</Text>
        <Ionicons name="arrow-forward" size={18} color={adminColors.coral} />
      </Pressable>
      <Text style={styles.version}>Wellnest Admin · Prototype 0.2</Text>
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  screenContent: { paddingBottom: 34 },
  heading: { marginTop: 28 },
  eyebrow: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 17, letterSpacing: 1.35 },
  title: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 32, lineHeight: 38, letterSpacing: -1.15, marginTop: 7 },
  subtitle: { maxWidth: 345, color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 15, lineHeight: 23, marginTop: 6 },
  identity: { minHeight: 112, flexDirection: 'row', alignItems: 'center', marginTop: 25, paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: adminColors.line },
  avatarWrap: { width: 68, height: 68 },
  avatar: { borderWidth: 2, borderColor: adminColors.aquaStrong },
  onlineDot: { position: 'absolute', right: 0, bottom: 1, width: 16, height: 16, borderRadius: 8, backgroundColor: adminColors.teal, borderWidth: 3, borderColor: adminColors.canvas },
  identityCopy: { flex: 1, minWidth: 0, paddingHorizontal: 14 },
  identityName: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 20, lineHeight: 25 },
  identityEmail: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 13, lineHeight: 18, marginTop: 2 },
  roleLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7 },
  roleText: { color: adminColors.teal, fontFamily: adminFonts.medium, fontSize: 13, lineHeight: 17 },
  editButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.aqua },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14, marginTop: 31, marginBottom: 13 },
  sectionHeadingCopy: { flex: 1 },
  sectionEyebrow: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 17, letterSpacing: 1.2 },
  sectionTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.55, marginTop: 4 },
  sectionMeta: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 13, lineHeight: 18, marginBottom: 3 },
  alertShell: { borderRadius: 27, backgroundColor: '#B7DAD3', ...adminShadow },
  alertPanel: { overflow: 'hidden', borderRadius: 27, padding: 17 },
  alertOrbLarge: { position: 'absolute', width: 176, height: 176, right: -80, top: -92, borderRadius: 88, backgroundColor: 'rgba(255,255,255,0.26)' },
  alertOrbSmall: { position: 'absolute', width: 72, height: 72, left: -29, bottom: 48, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.18)' },
  alertIntro: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 14 },
  alertMark: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.deepTeal },
  alertIntroCopy: { flex: 1, minWidth: 0 },
  alertIntroTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 17, lineHeight: 22 },
  alertIntroText: { color: adminColors.deepTeal, fontFamily: adminFonts.regular, fontSize: 13, lineHeight: 18, marginTop: 2 },
  activeCount: { alignItems: 'flex-end' },
  activeCountValue: { color: adminColors.deepTeal, fontFamily: adminFonts.semibold, fontSize: 25, lineHeight: 28 },
  activeCountLabel: { color: adminColors.deepTeal, fontFamily: adminFonts.semibold, fontSize: 10, lineHeight: 14, letterSpacing: 1.05 },
  toggleList: { overflow: 'hidden', borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.76)' },
  toggleRow: { minHeight: 82, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9 },
  toggleBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#C8E0DA' },
  toggleIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.aqua },
  toggleIconActive: { backgroundColor: adminColors.deepTeal },
  toggleTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  toggleState: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 11, lineHeight: 15, paddingHorizontal: 7, paddingVertical: 2, borderRadius: adminRadius.pill, backgroundColor: '#E8EFEC' },
  toggleStateActive: { color: adminColors.deepTeal, backgroundColor: '#CDECE7' },
  rowCopy: { flex: 1, minWidth: 0, paddingHorizontal: 12 },
  rowTitle: { flexShrink: 1, color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 15, lineHeight: 20 },
  rowDetail: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 13, lineHeight: 18, marginTop: 3 },
  actionList: { overflow: 'hidden', borderTopWidth: 1, borderBottomWidth: 1, borderColor: adminColors.line },
  actionRow: { minHeight: 78, flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: adminColors.line },
  actionIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.aqua },
  forwardButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  privacyStatement: { minHeight: 132, flexDirection: 'row', alignItems: 'flex-start', gap: 13, overflow: 'hidden', padding: 18, borderRadius: 24, backgroundColor: adminColors.deepTeal },
  privacyIcon: { width: 43, height: 43, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.11)' },
  privacyCopy: { flex: 1, minWidth: 0 },
  privacyTitle: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 17, lineHeight: 22 },
  privacyText: { color: '#CBE7E3', fontFamily: adminFonts.regular, fontSize: 13, lineHeight: 20, marginTop: 5 },
  legalLinks: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: adminColors.line, marginTop: 4 },
  legalLink: { minHeight: 58, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 10 },
  legalDivider: { width: 1, height: 24, backgroundColor: adminColors.line },
  legalText: { color: adminColors.deepTeal, fontFamily: adminFonts.semibold, fontSize: 13, lineHeight: 18 },
  logout: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, borderRadius: adminRadius.md, borderWidth: 1, borderColor: '#F0C6C2', backgroundColor: '#FFF9F8', marginTop: 29 },
  logoutIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.coralSoft },
  logoutText: { flex: 1, color: adminColors.coral, fontFamily: adminFonts.semibold, fontSize: 15, lineHeight: 20 },
  version: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 18 },
  pressed: { opacity: 0.68, transform: [{ scale: 0.99 }] },
});
