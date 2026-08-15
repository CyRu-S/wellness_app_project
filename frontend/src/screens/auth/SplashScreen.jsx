import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import BrandMark from '../../components/common/BrandMark';
import { colors } from '../../theme';

export default function SplashScreen({ navigation }) {
  useEffect(() => { const timer = setTimeout(() => navigation.replace('Onboarding'), 900); return () => clearTimeout(timer); }, [navigation]);
  return <View style={styles.page}><BrandMark light /><Text style={styles.note}>Small rituals. Lasting change.</Text></View>;
}
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', gap: 18 }, note: { color: '#BFCBC4', fontSize: 14, letterSpacing: 0.4 } });

