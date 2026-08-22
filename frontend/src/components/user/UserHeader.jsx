import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BrandMark from '../common/BrandMark';
import { colors, fonts, shadows } from '../../theme';

const today = () => new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });

export default function UserHeader({ navigation, showNotifications = true }) {
  const openNotifications = () => {
    const routeNames = navigation?.getState?.().routeNames || [];
    if (routeNames.includes('Notifications')) navigation.navigate('Notifications');
    else navigation?.navigate?.('Today', { screen: 'Notifications' });
  };

  return (
    <View style={styles.header}>
      <BrandMark size={36} />
      <View style={styles.context}>
        <Text style={styles.date}>{today()}</Text>
        {showNotifications ? (
          <Pressable accessibilityLabel="Open notifications" onPress={openNotifications} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
            <Ionicons name="notifications-outline" size={19} color={colors.ink} />
            <View style={styles.dot} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  context: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  date: { color: colors.muted, fontFamily: fonts.medium, fontSize: 10 },
  action: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadows.soft },
  dot: { position: 'absolute', top: 9, right: 9, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent, borderWidth: 1.5, borderColor: colors.surface },
  pressed: { opacity: 0.65, transform: [{ scale: 0.96 }] },
});
