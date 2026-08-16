import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AppLogo from './AppLogo';
import { colors } from '../../theme';

export default function BrandMark({ compact = false, light = false }) {
  return (
    <View style={styles.row}>
      <AppLogo size={38} style={light && styles.markLight} />
      {!compact && <Text style={[styles.name, light && styles.nameLight]}>wellnest</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  markLight: { borderWidth: 2, borderColor: colors.surface },
  name: { color: colors.ink, fontSize: 22, fontWeight: '800', letterSpacing: -0.7 },
  nameLight: { color: colors.surface },
});

