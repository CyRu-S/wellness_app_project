import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts, radius } from '../../theme';

export default function GoogleButton({ onPress, disabled = false, loading = false }) {
  return <Pressable accessibilityRole="button" accessibilityLabel="Sign in with Google" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, pressed && styles.pressed, disabled && styles.disabled]}><Text style={styles.g}>G</Text><Text style={styles.text}>{loading ? 'Connecting to Google…' : 'Sign in with Google'}</Text></Pressable>;
}
const styles = StyleSheet.create({ button: { minHeight: 56, borderRadius: radius.md, borderWidth: 1, borderColor: '#D6E1DD', backgroundColor: colors.surface, flexDirection: 'row', gap: 11, alignItems: 'center', justifyContent: 'center' }, pressed: { opacity: 0.65, transform: [{ scale: 0.985 }] }, disabled: { opacity: 0.48 }, g: { color: '#4285F4', fontSize: 19, fontWeight: '900' }, text: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 14 } });
