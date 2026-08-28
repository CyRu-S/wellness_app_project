import React from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminScreen from '../../components/admin/AdminScreen';
import AppLogo from '../../components/common/AppLogo';
import { signOut } from '../../store/slices/authSlice';
import { selectAdminPreferences, setPreference } from '../../store/slices/adminSlice';
import { adminColors, adminFonts } from '../../theme/admin';

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

function PreferenceRow({ index, title, detail, value, onValueChange, last }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={title}
      accessibilityHint={detail}
      onPress={() => onValueChange(!value)}
      style={({ pressed }) => [styles.preferenceRow, !last && styles.preferenceDivider, pressed && styles.pressed]}
    >
      <View style={[styles.preferenceNumber, value && styles.preferenceNumberActive]}>
        <Text style={[styles.preferenceNumberText, value && styles.preferenceNumberTextActive]}>{index}</Text>
      </View>
      <View style={styles.preferenceCopy}>
        <Text style={styles.preferenceTitle}>{title}</Text>
        <Text style={styles.preferenceDetail}>{detail}</Text>
      </View>
      <View style={styles.preferenceControl}>
        <Text style={[styles.preferenceState, value && styles.preferenceStateActive]}>{value ? 'ON' : 'OFF'}</Text>
        <Switch
          accessible={false}
          pointerEvents="none"
          value={value}
          trackColor={{ false: '#D8E3DF', true: '#86CFC9' }}
          thumbColor={value ? adminColors.deepTeal : adminColors.white}
          ios_backgroundColor="#D8E3DF"
        />
      </View>
    </Pressable>
  );
}

function AccountRow({ icon, title, detail, onPress, last }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${detail}`}
      onPress={onPress}
      style={({ pressed }) => [styles.accountRow, !last && styles.accountDivider, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={22} color={adminColors.deepTeal} />
      <View style={styles.accountCopy}>
        <Text style={styles.accountTitle}>{title}</Text>
        <Text style={styles.accountDetail}>{detail}</Text>
      </View>
      <View style={styles.accountArrow}>
        <Ionicons name="arrow-forward" size={17} color={adminColors.deepTeal} />
      </View>
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
        <Text style={styles.eyebrow}>ADMIN SPACE</Text>
        <Text style={styles.title}>Tune your space.</Text>
        <Text style={styles.subtitle}>Choose what deserves your attention and keep the rest of your day quiet.</Text>
      </View>

      <View style={styles.profile}>
        <View style={styles.avatarWrap}>
          <AppLogo size={68} style={styles.avatar} />
          <View style={styles.profileStatus} />
        </View>
        <View style={styles.profileCopy}>
          <Text style={styles.profileEyebrow}>ADMIN PROFILE</Text>
          <Text numberOfLines={1} style={styles.profileName}>{admin?.name || 'Arpan'}</Text>
          <Text numberOfLines={1} style={styles.profileClub}>{admin?.clubName || 'Mr_Care Collective'}</Text>
        </View>
      </View>

      <SectionHeading eyebrow="NOTIFICATIONS" title="Only the useful signals" meta={`${activeAlerts}/${alertTotal} active`} />
      <View style={styles.preferenceList}>
        <PreferenceRow
          index="01"
          title="Signup requests"
          detail="When someone asks to join the club"
          value={preferences.signupAlerts}
          onValueChange={(value) => changePreference('signupAlerts', value)}
        />
        <PreferenceRow
          index="02"
          title="Missed deadlines"
          detail="When a member may need support"
          value={preferences.deadlineAlerts}
          onValueChange={(value) => changePreference('deadlineAlerts', value)}
        />
        <PreferenceRow
          index="03"
          title="Morning digest"
          detail="One daily summary of club activity"
          value={preferences.dailyDigest}
          onValueChange={(value) => changePreference('dailyDigest', value)}
          last
        />
      </View>
      <Text style={styles.sessionNote}>Preference changes stay with you for this session.</Text>

      <SectionHeading eyebrow="ACCOUNT & ACCESS" title="The essentials" />
      <View style={styles.accountList}>
        <AccountRow icon="person-outline" title="Profile details" detail="Name, contact and club information" onPress={() => navigation.navigate('AdminProfile')} />
        <AccountRow icon="key-outline" title="Security" detail="Password and signed-in devices" onPress={() => comingNext('Security')} last />
      </View>

      <SectionHeading eyebrow="TRUST CENTER" title="Care beyond coaching" />
      <View style={styles.trustCard}>
        <View pointerEvents="none" style={styles.trustOrb} />
        <View style={styles.trustTopline}>
          <View style={styles.trustIcon}><Ionicons name="lock-closed" size={20} color="#BFECE5" /></View>
          <Text style={styles.trustLabel}>PRIVATE BY DEFAULT</Text>
        </View>
        <Text style={styles.trustTitle}>Member data deserves the same care as member wellbeing.</Text>
        <Text style={styles.trustText}>Activity and coaching information remain confidential inside the admin workspace.</Text>
        <View style={styles.trustLinks}>
          <Pressable accessibilityRole="button" onPress={() => comingNext('Data and privacy')} style={({ pressed }) => [styles.trustLink, pressed && styles.pressed]}>
            <Text style={styles.trustLinkText}>Data & privacy</Text>
            <Ionicons name="arrow-forward" size={16} color={adminColors.white} />
          </Pressable>
          <View style={styles.trustDivider} />
          <Pressable accessibilityRole="button" onPress={() => comingNext('Admin terms')} style={({ pressed }) => [styles.trustLink, pressed && styles.pressed]}>
            <Text style={styles.trustLinkText}>Admin terms</Text>
            <Ionicons name="arrow-forward" size={16} color={adminColors.white} />
          </Pressable>
        </View>
      </View>

      <Pressable accessibilityRole="button" onPress={confirmSignOut} style={({ pressed }) => [styles.logout, pressed && styles.pressed]}>
        <Ionicons name="log-out-outline" size={20} color={adminColors.coral} />
        <Text style={styles.logoutText}>Sign out of admin</Text>
        <Ionicons name="arrow-forward" size={18} color={adminColors.coral} />
      </Pressable>
      <Text style={styles.version}>Mr_Care Admin · Prototype 0.2</Text>
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  screenContent: { paddingBottom: 34 },
  heading: { marginTop: 29 },
  eyebrow: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 17, letterSpacing: 1.35 },
  title: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 33, lineHeight: 39, letterSpacing: -1.2, marginTop: 7 },
  subtitle: { maxWidth: 345, color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 15, lineHeight: 23, marginTop: 6 },
  profile: { minHeight: 116, flexDirection: 'row', alignItems: 'center', paddingVertical: 18, marginTop: 27, borderTopWidth: 1, borderBottomWidth: 1, borderColor: adminColors.line },
  avatarWrap: { width: 70, height: 70 },
  avatar: { borderWidth: 2, borderColor: adminColors.aquaStrong },
  profileStatus: { position: 'absolute', right: 0, bottom: 1, width: 16, height: 16, borderRadius: 8, backgroundColor: adminColors.teal, borderWidth: 3, borderColor: adminColors.canvas },
  profileCopy: { flex: 1, minWidth: 0, paddingHorizontal: 14 },
  profileEyebrow: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 11, lineHeight: 15, letterSpacing: 1.05 },
  profileName: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 21, lineHeight: 26, marginTop: 3 },
  profileClub: { color: adminColors.teal, fontFamily: adminFonts.medium, fontSize: 13, lineHeight: 18, marginTop: 2 },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginTop: 34, marginBottom: 13 },
  sectionHeadingCopy: { flex: 1, minWidth: 0 },
  sectionEyebrow: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 17, letterSpacing: 1.2 },
  sectionTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.55, marginTop: 4 },
  sectionMeta: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 13, lineHeight: 18, marginBottom: 3 },
  preferenceList: { overflow: 'hidden', paddingHorizontal: 16, borderRadius: 24, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line },
  preferenceRow: { minHeight: 91, flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
  preferenceDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: adminColors.line },
  preferenceNumber: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.surfaceMuted },
  preferenceNumberActive: { backgroundColor: adminColors.aqua },
  preferenceNumberText: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 11, lineHeight: 15, letterSpacing: 0.6 },
  preferenceNumberTextActive: { color: adminColors.deepTeal },
  preferenceCopy: { flex: 1, minWidth: 0, paddingHorizontal: 11 },
  preferenceTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 15, lineHeight: 20 },
  preferenceDetail: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 13, lineHeight: 18, marginTop: 3 },
  preferenceControl: { width: 52, alignItems: 'center', gap: 3 },
  preferenceState: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 10, lineHeight: 13, letterSpacing: 0.8 },
  preferenceStateActive: { color: adminColors.teal },
  sessionNote: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 12, lineHeight: 17, marginTop: 9, marginLeft: 3 },
  accountList: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: adminColors.line },
  accountRow: { minHeight: 79, flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 4 },
  accountDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: adminColors.line },
  accountCopy: { flex: 1, minWidth: 0, paddingHorizontal: 13 },
  accountTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 15, lineHeight: 20 },
  accountDetail: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 13, lineHeight: 18, marginTop: 3 },
  accountArrow: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.aqua },
  trustCard: { minHeight: 248, overflow: 'hidden', padding: 19, borderRadius: 26, backgroundColor: adminColors.deepTeal },
  trustOrb: { position: 'absolute', width: 190, height: 190, right: -92, top: -88, borderRadius: 95, backgroundColor: 'rgba(180,245,235,0.08)' },
  trustTopline: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  trustIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  trustLabel: { color: '#BFECE5', fontFamily: adminFonts.semibold, fontSize: 11, lineHeight: 16, letterSpacing: 1.15 },
  trustTitle: { maxWidth: 300, color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 21, lineHeight: 28, letterSpacing: -0.45, marginTop: 17 },
  trustText: { maxWidth: 310, color: '#C7E5E1', fontFamily: adminFonts.regular, fontSize: 13, lineHeight: 20, marginTop: 7 },
  trustLinks: { minHeight: 50, flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.18)', marginTop: 18 },
  trustLink: { minHeight: 50, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7, paddingHorizontal: 5 },
  trustDivider: { width: 1, height: 23, backgroundColor: 'rgba(255,255,255,0.17)', marginHorizontal: 8 },
  trustLinkText: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 13, lineHeight: 18 },
  logout: { minHeight: 59, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F0CBC7', marginTop: 31 },
  logoutText: { flex: 1, color: adminColors.coral, fontFamily: adminFonts.semibold, fontSize: 15, lineHeight: 20 },
  version: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 18 },
  pressed: { opacity: 0.66, transform: [{ scale: 0.99 }] },
});
