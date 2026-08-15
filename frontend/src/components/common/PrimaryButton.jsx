import React, { useState } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius } from '../../theme';

export default function PrimaryButton({ title, onPress, secondary = false, disabled = false }) {
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
        style={[styles.button, secondary && styles.secondary, disabled && styles.disabled]}
      >
        <Text style={[styles.text, secondary && styles.secondaryText]}>{title}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 56, borderRadius: radius.pill, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 },
  secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.ink },
  disabled: { opacity: 0.45 },
  text: { color: colors.white, fontSize: 16, fontWeight: '700' },
  secondaryText: { color: colors.ink },
});
