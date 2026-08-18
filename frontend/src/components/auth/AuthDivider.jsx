import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, type } from '../../theme';
export default function AuthDivider({ label = 'OR CONTINUE WITH' }) { return <View style={styles.row}><View style={styles.line} /><Text style={styles.text}>{label}</Text><View style={styles.line} /></View>; }
const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 13 }, line: { flex: 1, height: 1, backgroundColor: colors.line }, text: { ...type.label, color: colors.muted, fontSize: 9 } });
