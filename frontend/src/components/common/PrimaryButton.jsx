import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, shadows } from '../../theme';

export default function PrimaryButton({ title, onPress, secondary = false, disabled = false, icon = 'arrow-forward' }) {
  return (
    <View style={[styles.shadow, secondary && styles.noShadow]}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [styles.button, secondary && styles.secondary,
          pressed && (secondary ? styles.secondaryPressed : styles.pressed), disabled && styles.disabled]}
      >
        <View style={styles.labelRow}>
          <Text style={[styles.text, secondary && styles.secondaryText]}>{title}</Text>
          {icon ? <Ionicons name={icon} size={17} color={secondary ? colors.ink : colors.white} /> : null}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: { borderRadius: radius.md, backgroundColor: colors.tealMid, ...shadows.soft },
  noShadow: { backgroundColor: colors.surface, shadowOpacity: 0, elevation: 0 },
  button: { minHeight: 58, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.tealMid, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  pressed: { backgroundColor: colors.tealDark },
  secondaryPressed: { backgroundColor: colors.surfaceMuted },
  disabled: { opacity: 0.45 },
  text: { color: colors.white, fontFamily: fonts.semibold, fontSize: 15 },
  secondaryText: { color: colors.ink },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
});
