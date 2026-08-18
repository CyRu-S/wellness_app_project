import React, { useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, shadows } from '../../theme';

export default function PrimaryButton({ title, onPress, secondary = false, disabled = false, icon = 'arrow-forward' }) {
  const [scale] = useState(() => new Animated.Value(1));
  const animate = (value) => Animated.spring(scale, { toValue: value, speed: 35, bounciness: 2, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => animate(0.975)}
        onPressOut={() => animate(1)}
        style={({ pressed }) => [styles.button, secondary && styles.secondary, pressed && styles.pressed, disabled && styles.disabled]}
      >
        <View style={styles.labelRow}>
          <Text style={[styles.text, secondary && styles.secondaryText]}>{title}</Text>
          {icon ? <Ionicons name={icon} size={17} color={secondary ? colors.ink : colors.white} /> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 58, borderRadius: radius.md, backgroundColor: colors.tealMid, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22, ...shadows.soft },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, shadowOpacity: 0, elevation: 0 },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.45 },
  text: { color: colors.white, fontFamily: fonts.semibold, fontSize: 15 },
  secondaryText: { color: colors.ink },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
});
