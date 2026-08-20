import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts, radius } from '../../theme';

export default function GoogleButton({ onPress }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.button, pressed && styles.pressed]}><Text style={styles.g}>G</Text><Text style={styles.text}>Continue with Google</Text></Pressable>;
}
const styles = StyleSheet.create({ button: { minHeight: 54, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, flexDirection: 'row', gap: 11, alignItems: 'center', justifyContent: 'center' }, pressed: { opacity: 0.65, transform: [{ scale: 0.985 }] }, g: { color: '#4285F4', fontSize: 17, fontWeight: '900' }, text: { color: colors.ink, fontFamily: fonts.semibold } });
