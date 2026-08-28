import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

const logo = require('../../../assets/images/arjun-nutrition-logo.png');

export default function AppLogo({ size = 44, style }) {
  return (
    <View style={[styles.frame, { width: size, height: size, borderRadius: size / 2 }, style]}>
      <Image accessibilityLabel="Arjun Nutrition logo" source={logo} resizeMode="contain" style={styles.image} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: '#073B3A', borderWidth: 1, borderColor: 'rgba(216,170,66,0.52)' },
  image: { width: '100%', height: '100%' },
});
