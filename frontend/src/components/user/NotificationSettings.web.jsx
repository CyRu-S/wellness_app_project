import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { loadNotificationPreferences, notificationPreferences, retryPushRegistration, setPushState, saveNotificationPreferences, sendTestNotification } from '../../store/slices/notificationSlice';
import { requestPushPermission } from '../../services/notifications/pushNotifications';
import SyncFeedback from '../common/SyncFeedback';
import { colors, fonts, radius } from '../../theme';

export default function NotificationSettings() {
  const dispatch = useDispatch();
  const n = useSelector((state) => state.notifications);
  const admin = useSelector((state) => state.auth.user?.role === 'ADMIN');
  const save = (key, value) => dispatch(saveNotificationPreferences({ ...notificationPreferences(n), [key]: value }));
  const options = admin ? [['signupAlerts', 'Signup requests', n.signupAlerts], ['deadlineAlerts', 'Missed deadlines', n.deadlineAlerts],
    ['dailyDigest', 'Morning digest (8 AM)', n.dailyDigest], ['memberUpdates', 'Meal & movement check-ins', n.memberUpdates]]
    : [['mealReminders', 'Meal reminders', n.timelineRemindersEnabled], ['coachNudges', 'Admin / coach nudges', n.coachNudgesEnabled],
      ['accountUpdates', 'Plan, access & account updates', n.accountUpdates]];
  const enable = () => { requestPushPermission().then(() => dispatch(retryPushRegistration()))
    .catch((error) => dispatch(setPushState({ status: 'error', message: error.message || 'Could not request notification permission. Try again.' }))); };
  const retry = () => dispatch(n.failedPreferences ? saveNotificationPreferences(n.failedPreferences) : loadNotificationPreferences());
  return <View style={styles.card}>
    <Text style={styles.title}>Reminders & notifications</Text>
    {options.map(([key, label, value]) =>
      <View key={key} style={styles.row}><Text style={styles.label}>{label}</Text><Switch accessibilityLabel={label} value={value}
        disabled={!n.preferencesLoaded || n.savingPreferences} onValueChange={(next) => save(key, next)}
        trackColor={{ false: colors.line, true: colors.accent }} thumbColor={colors.white} /></View>)}
    {!n.preferencesLoaded && !n.preferencesError ? <ActivityIndicator accessibilityLabel="Loading notification preferences" color={colors.tealMid} /> : null}
    <SyncFeedback pending={n.savingPreferences} error={n.preferencesError} label="Notification preferences" onRetry={retry} />
    {n.push.status === 'enabled' && n.pushAvailable ? <Text style={styles.note}>Web notifications are on.</Text> : null}
    {n.preferencesLoaded && !n.pushAvailable ? <Text style={styles.note}>Notification delivery is not enabled on the server yet.</Text> : null}
    {['unsupported', 'disabled', 'denied', 'error'].includes(n.push.status) && n.push.message ? <Text style={styles.note}>{n.push.message}</Text> : null}
    {!['unsupported', 'enabled', 'registering'].includes(n.push.status) ? <Pressable style={styles.button} accessibilityRole="button"
      onPress={enable}>
      <Text style={styles.buttonText}>{n.push.status === 'denied' ? 'Retry web notifications' : 'Enable web notifications'}</Text></Pressable> : null}
    {n.push.status === 'registering' ? <ActivityIndicator accessibilityLabel="Connecting web notifications" color={colors.tealMid} /> : null}
    {n.push.status === 'enabled' && n.pushAvailable ? <Pressable style={styles.button} accessibilityRole="button" disabled={n.testing} onPress={() => dispatch(sendTestNotification())}>
      <Text style={styles.buttonText}>{n.testing ? 'Queuing test…' : 'Send a test notification'}</Text></Pressable> : null}
    {n.testMessage ? <Text accessibilityLiveRegion="polite" style={styles.note}>{n.testMessage}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  card: { marginTop: 18, padding: 16, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  title: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 52 },
  label: { flex: 1, fontFamily: fonts.medium, color: colors.ink, fontSize: 14 },
  note: { fontFamily: fonts.medium, color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 8 },
  button: { minHeight: 44, justifyContent: 'center', alignItems: 'center', padding: 10, marginTop: 8, backgroundColor: colors.accentSoft, borderRadius: 12 },
  buttonText: { fontFamily: fonts.semibold, color: colors.tealDark, fontSize: 13 },
});
