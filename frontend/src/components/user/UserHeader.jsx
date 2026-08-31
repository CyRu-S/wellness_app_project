import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppLogo from '../common/AppLogo';
import { colors, fonts, shadows } from '../../theme';

const getDateLabel = () => new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
}).format(new Date());

export default function UserHeader({ navigation, title = 'Today', showNotifications = true, home = title === 'Today' }) {
  const openNotifications = () => {
    const routeNames = navigation?.getState?.().routeNames || [];
    if (routeNames.includes('Notifications')) navigation.navigate('Notifications');
    else navigation?.navigate?.('Today', { screen: 'Notifications' });
  };

  const openProfile = () => {
    const parent = navigation?.getParent?.();
    if (parent?.getState?.().routeNames?.includes('Profile')) parent.navigate('Profile');
    else navigation?.navigate?.('Profile');
  };

  const goBack = () => {
    const routeNames = navigation?.getState?.().routeNames || [];
    if (routeNames.includes('Dashboard')) {
      navigation.navigate('Dashboard');
      return;
    }
    if (routeNames.includes('Today')) {
      navigation.navigate('Today');
      return;
    }
    const parent = navigation?.getParent?.();
    if (parent?.getState?.().routeNames?.includes('Today')) parent.navigate('Today');
    else if (navigation?.canGoBack?.()) navigation.goBack();
  };

  if (home) {
    return (
      <View style={styles.homeHeader}>
        <View style={styles.brandCluster}>
          <Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={openProfile} style={({ pressed }) => [styles.brandButton, pressed && styles.pressed]}>
            <AppLogo size={46} style={styles.brandLogo} />
            <View style={styles.brandStatus} />
          </Pressable>
          <View style={styles.brandCopy}>
            <Text style={styles.date}>{getDateLabel()}</Text>
            <Text style={styles.deskLabel}>WELLNEST MEMBER DESK</Text>
          </View>
        </View>
        {showNotifications ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Open notifications" onPress={openNotifications} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
            <Ionicons name="notifications-outline" size={20} color={colors.ink} />
            <View style={styles.dot} />
          </Pressable>
        ) : <View style={styles.actionPlaceholder} />}
      </View>
    );
  }

  return (
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to Today" onPress={goBack} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
        <Ionicons name="arrow-back" size={20} color={colors.ink} />
      </Pressable>
      <Text numberOfLines={1} style={styles.title}>{title}</Text>
      <View style={styles.actionPlaceholder} />
    </View>
  );
}

const styles = StyleSheet.create({
  homeHeader: { minHeight: 54, flexDirection: 'row', alignItems: 'center' },
  header: { minHeight: 48, flexDirection: 'row', alignItems: 'center' },
  brandCluster: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  brandLogo: { borderWidth: 1, borderColor: colors.line, ...shadows.soft },
  brandStatus: { position: 'absolute', right: 0, bottom: 1, width: 13, height: 13, borderRadius: 7, backgroundColor: colors.tealMid, borderWidth: 2, borderColor: colors.paper },
  brandCopy: { flex: 1, minWidth: 0 },
  date: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19 },
  deskLabel: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 1.05, marginTop: 1 },
  title: { flex: 1, color: colors.ink, fontFamily: fonts.semibold, fontSize: 17, textAlign: 'center', paddingHorizontal: 8 },
  action: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  actionPlaceholder: { width: 44, height: 44 },
  dot: { position: 'absolute', top: 9, right: 9, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.danger, borderWidth: 1.5, borderColor: colors.surface },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
});
