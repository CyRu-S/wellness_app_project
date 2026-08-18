import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../../theme';

const logo = require('../../../assets/images/arjun-nutrition-logo.png');

export default function BrandMark({ compact = false, light = false }) {
  return (
    <View style={styles.row}>
      <Image source={logo} style={styles.mark} resizeMode="contain" />
      {!compact && <Text style={[styles.name, light && styles.nameLight]}>ARJUN NUTRITION</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { width: 42, height: 42 },
  name: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 14, letterSpacing: 1.1 },
  nameLight: { color: colors.surface },
});
