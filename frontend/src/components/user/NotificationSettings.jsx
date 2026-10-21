import { LocalizedText as Text } from '../common/LocalizedText';
import React from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Switch, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { loadNotificationPreferences, notificationPreferences, retryPushRegistration, saveNotificationPreferences } from '../../store/slices/notificationSlice';
import SyncFeedback from '../common/SyncFeedback';
import { colors, fonts, radius } from '../../theme';
import { useLanguage } from '../../i18n/LanguageContext';

export default function NotificationSettings() {
  const { t } = useLanguage();
  const dispatch = useDispatch();
  const n = useSelector((state) => state.notifications);
  const admin = useSelector((state) => state.auth.user?.role === 'ADMIN');
  const save = (key, value) => dispatch(saveNotificationPreferences({ ...notificationPreferences(n), [key]: value }));
  const options = admin ? [['signupAlerts', t('signupRequests'), n.signupAlerts], ['deadlineAlerts', t('missedDeadlines'), n.deadlineAlerts],
    ['dailyDigest', t('morningDigest'), n.dailyDigest], ['memberUpdates', t('mealMovementCheckins'), n.memberUpdates]]
    : [['mealReminders', t('mealReminders'), n.timelineRemindersEnabled], ['coachNudges', t('coachNudges'), n.coachNudgesEnabled],
      ['accountUpdates', t('planAccessUpdates'), n.accountUpdates]];
  options.push(['customSound', t('themeRingtone'), n.customSound, t('themeRingtoneDetail')]);
  const retry = () => dispatch(n.failedPreferences ? saveNotificationPreferences(n.failedPreferences) : loadNotificationPreferences());
  return <View style={styles.card}>
    <Text style={styles.title}>{t('remindersNotifications')}</Text>
    {options.map(([key, label, value, detail]) =>
      <View key={key} style={styles.row}><View style={styles.copy}><Text style={styles.label}>{label}</Text>{detail ? <Text style={styles.detail}>{detail}</Text> : null}</View><Switch accessibilityLabel={label} value={value}
        disabled={!n.preferencesLoaded || n.savingPreferences} onValueChange={(next) => save(key, next)}
        trackColor={{ false: colors.line, true: colors.accent }} thumbColor={colors.white} /></View>)}
    {!n.preferencesLoaded && !n.preferencesError ? <ActivityIndicator accessibilityLabel={t('loadingNotificationPreferences')} color={colors.tealMid} /> : null}
    <SyncFeedback pending={n.savingPreferences} error={n.preferencesError} label={t('notificationPreferences')} onRetry={retry} />
    {n.push.status === 'enabled' && n.pushAvailable ? <Text style={styles.note}>{t('phoneNotificationsOn')}</Text> : null}
    {n.preferencesLoaded && !n.pushAvailable ? <Text style={styles.note}>{t('phoneDeliveryUnavailable')}</Text> : null}
    {['unsupported', 'denied', 'error'].includes(n.push.status) && n.push.message ? <Text style={styles.note}>{n.push.message}</Text> : null}
    {!['unsupported', 'enabled', 'registering'].includes(n.push.status) ? <Pressable style={styles.button} accessibilityRole="button"
      onPress={() => n.push.status === 'denied' ? Linking.openSettings().catch(() => dispatch(retryPushRegistration())) : dispatch(retryPushRegistration())}>
      <Text style={styles.buttonText}>{n.push.status === 'denied' ? t('openAndroidSettings') : t('enablePhoneNotifications')}</Text></Pressable> : null}
    {n.push.status === 'registering' ? <ActivityIndicator accessibilityLabel={t('connectingPhoneNotifications')} color={colors.tealMid} /> : null}
  </View>;
}
const styles = StyleSheet.create({
  card: { marginTop: 18, padding: 16, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  title: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 52 },
  copy: { flex: 1, paddingVertical: 8 },
  label: { fontFamily: fonts.medium, color: colors.ink, fontSize: 14 },
  detail: { fontFamily: fonts.medium, color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  note: { fontFamily: fonts.medium, color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 8 },
  button: { minHeight: 44, justifyContent: 'center', alignItems: 'center', padding: 10, marginTop: 8, backgroundColor: colors.accentSoft, borderRadius: 12 },
  buttonText: { fontFamily: fonts.semibold, color: colors.tealDark, fontSize: 13 },
});
