import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme';

export default function BrandMark({ compact = false, light = false }) {
  return (
    <View style={styles.row}>
      <View style={[styles.mark, light && styles.markLight]}>
        <View style={styles.seedOne} />
        <View style={styles.seedTwo} />
      </View>
      {!compact && <Text style={[styles.name, light && styles.nameLight]}>wellnest</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.ink, overflow: 'hidden' },
  markLight: { backgroundColor: colors.surface },
  seedOne: { position: 'absolute', width: 16, height: 10, borderRadius: 12, backgroundColor: colors.accent, left: 5, top: 9, transform: [{ rotate: '-35deg' }] },
  seedTwo: { position: 'absolute', width: 15, height: 9, borderRadius: 12, backgroundColor: colors.moss, right: 4, bottom: 7, transform: [{ rotate: '-35deg' }] },
  name: { color: colors.ink, fontSize: 22, fontWeight: '800', letterSpacing: -0.7 },
  nameLight: { color: colors.surface },
});

