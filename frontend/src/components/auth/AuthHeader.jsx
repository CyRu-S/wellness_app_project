import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import BrandMark from '../common/BrandMark';
import AmbientBackground from '../common/AmbientBackground';
import StaggeredView from './StaggeredView';
import { colors, fonts, type } from '../../theme';

export default function AuthHeader({ navigation, eyebrow, children, compact = false }) {
  return (
    <LinearGradient colors={[colors.ink, colors.tealDark]} style={[styles.header, compact && styles.compact]}>
      <AmbientBackground />
      <View style={styles.nav}>
        <Pressable accessibilityLabel="Go back" onPress={() => navigation.goBack()} style={styles.back}><Ionicons name="arrow-back" size={19} color={colors.white} /></Pressable>
        <BrandMark light />
      </View>
      <StaggeredView delay={100} style={styles.copy}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={[styles.title, compact && styles.compactTitle]}>{children}</Text>
      </StaggeredView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { height: 252, paddingHorizontal: 22, paddingTop: 14, overflow: 'hidden' },
  compact: { height: 190 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.13)', alignItems: 'center', justifyContent: 'center' },
  copy: { marginTop: 30 },
  eyebrow: { ...type.label, color: '#B9EBE8' },
  title: { color: colors.white, fontFamily: fonts.semibold, fontSize: 38, lineHeight: 41, letterSpacing: -1.4, marginTop: 8, maxWidth: 330 },
  compactTitle: { fontSize: 30, lineHeight: 34 },
});
