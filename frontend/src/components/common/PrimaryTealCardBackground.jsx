import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export const primaryTealGradient = ['#064E55', '#08767B', '#0B9295'];

export default function PrimaryTealCardBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={primaryTealGradient}
        start={{ x: 0.02, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.orb} />
      <View style={styles.orbit} />
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    width: 220,
    height: 220,
    right: -78,
    top: -105,
    borderRadius: 110,
    backgroundColor: 'rgba(180,255,242,0.1)',
  },
  orbit: {
    position: 'absolute',
    width: 148,
    height: 148,
    right: 8,
    bottom: -58,
    borderRadius: 74,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
  },
});
