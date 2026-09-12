import React, { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminScreen from '../../components/admin/AdminScreen';
import AppLogo from '../../components/common/AppLogo';
import { signOutSafely } from '../../store/slices/authSlice';
import NotificationSettings from '../../components/user/NotificationSettings';
import SyncFeedback from '../../components/common/SyncFeedback';
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
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(null);
  const logout = async () => {
    if (loggingOut) return;
    setLoggingOut(true); setLogoutError(null);
    try { await dispatch(signOutSafely()).unwrap(); }
    catch { setLoggingOut(false); setLogoutError('Could not disconnect notifications. Check your connection and retry.'); }
  };

  const comingNext = (title) => Alert.alert(title, 'This destination is planned for the next admin release.');
  const confirmSignOut = () => {
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.('Sign out of admin?\n\nYou will return to the login screen.')) logout();
      return;
    }

    Alert.alert(
      'Sign out of admin?',
      'You will return to the login screen.',
      [
        { text: 'Stay signed in', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: () => logout() },
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

      <NotificationSettings />
      <Text style={styles.sessionNote}>Preferences are saved to your account. The optional morning digest follows the app timezone.</Text>
      <AccountRow icon="notifications-outline" title="Notification inbox" detail="Signup requests, member updates and daily summaries" onPress={() => navigation.navigate('AdminNotifications')} last />

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
      </View>

      <Pressable accessibilityRole="button" disabled={loggingOut} onPress={confirmSignOut} style={({ pressed }) => [styles.logout, pressed && styles.pressed]}>
        <Ionicons name="log-out-outline" size={20} color={adminColors.coral} />
        <Text style={styles.logoutText}>{loggingOut ? 'Disconnecting…' : 'Sign out of admin'}</Text>
        <Ionicons name="arrow-forward" size={18} color={adminColors.coral} />
      </Pressable>
      <SyncFeedback error={logoutError} label="Sign out" onRetry={logout} />
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
  trustCard: { minHeight: 205, overflow: 'hidden', padding: 19, borderRadius: 26, backgroundColor: adminColors.deepTeal },
  trustOrb: { position: 'absolute', width: 190, height: 190, right: -92, top: -88, borderRadius: 95, backgroundColor: 'rgba(180,245,235,0.08)' },
  trustTopline: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  trustIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  trustLabel: { color: '#BFECE5', fontFamily: adminFonts.semibold, fontSize: 11, lineHeight: 16, letterSpacing: 1.15 },
  trustTitle: { maxWidth: 300, color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 21, lineHeight: 28, letterSpacing: -0.45, marginTop: 17 },
  trustText: { maxWidth: 310, color: '#C7E5E1', fontFamily: adminFonts.regular, fontSize: 13, lineHeight: 20, marginTop: 7 },
  logout: { minHeight: 59, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F0CBC7', marginTop: 31 },
  logoutText: { flex: 1, color: adminColors.coral, fontFamily: adminFonts.semibold, fontSize: 15, lineHeight: 20 },
  version: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 18 },
  pressed: { opacity: 0.66, transform: [{ scale: 0.99 }] },
});
