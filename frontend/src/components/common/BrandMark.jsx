import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../../theme';

const logo = require('../../../assets/images/arjun-nutrition-logo.png');

export default function BrandMark({ compact = false, light = false, size = 42 }) {
  return (
    <View style={styles.row}>
      <View style={[styles.logoFrame, { width: size, height: size, borderRadius: size / 2 }]}><Image accessibilityLabel="Arjun Nutrition logo" source={logo} style={styles.logo} resizeMode="contain" /></View>
      {!compact && <Text style={[styles.name, size < 40 && styles.nameSmall, light && styles.nameLight]}>Mr_Care</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoFrame: { overflow: 'hidden', backgroundColor: colors.ink, borderWidth: 1, borderColor: 'rgba(216,170,66,0.52)', shadowColor: colors.ink, shadowOpacity: 0.2, shadowRadius: 7, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  logo: { width: '100%', height: '100%' },
  name: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 16, letterSpacing: 0.2 },
  nameSmall: { fontSize: 14 },
  nameLight: { color: colors.surface },
});
