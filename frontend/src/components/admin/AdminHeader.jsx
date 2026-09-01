import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppLogo from '../common/AppLogo';
import { adminColors, adminFonts, adminShadow } from '../../theme/admin';

export default function AdminHeader({
  title,
  rightIcon,
  onRightPress,
  badge = false,
  back = false,
  onBackPress,
  showAdminBadge = !back,
  rightImage = false,
}) {
  return (
    <View style={styles.header}>
      {back ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onBackPress} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
          <Ionicons name="arrow-back" size={20} color={adminColors.ink} />
        </Pressable>
      ) : (
        <AppLogo size={44} style={styles.brandIcon} />
      )}
      <View style={styles.titleWrap}>
        <Text style={styles.title}>{title}</Text>
        {showAdminBadge && <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>ADMIN</Text></View>}
      </View>
      {rightIcon ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${title} actions`}
          onPress={onRightPress}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          {rightImage ? <AppLogo size={40} /> : <Ionicons name={rightIcon} size={20} color={adminColors.ink} />}
          {badge && <View style={styles.dot} />}
        </Pressable>
      ) : <View style={styles.actionPlaceholder} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 48, flexDirection: 'row', alignItems: 'center' },
  brandIcon: { borderWidth: 1, borderColor: adminColors.line, ...adminShadow },
  titleWrap: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7 },
  title: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 17 },
  adminBadge: { borderRadius: 20, paddingHorizontal: 7, paddingVertical: 4, backgroundColor: adminColors.aqua },
  adminBadgeText: { color: adminColors.deepTeal, fontFamily: adminFonts.semibold, fontSize: 11, letterSpacing: 0.8 },
  action: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line },
  actionPlaceholder: { width: 44, height: 44 },
  dot: { position: 'absolute', top: 9, right: 9, width: 7, height: 7, borderRadius: 4, backgroundColor: adminColors.coral, borderWidth: 1.5, borderColor: adminColors.surface },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
});
