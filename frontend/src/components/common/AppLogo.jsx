import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

const logo = require('../../../assets/photo_2026-08-15_11-27-46.jpg');

export default function AppLogo({ size = 44, style }) {
  return (
    <View style={[styles.frame, { width: size, height: size, borderRadius: size / 2 }, style]}>
      <Image accessibilityIgnoresInvertColors source={logo} resizeMode="cover" style={styles.image} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: '#FFFFFF' },
  image: { width: '100%', height: '100%' },
});
