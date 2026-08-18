import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedLogo from '../../components/auth/AnimatedLogo';
import StaggeredView from '../../components/auth/StaggeredView';
import AmbientBackground from '../../components/common/AmbientBackground';
import { colors, fonts, type } from '../../theme';

export default function SplashScreen({ navigation }) {
  useEffect(() => { const timer = setTimeout(() => navigation.replace('Onboarding'), 1500); return () => clearTimeout(timer); }, [navigation]);
  return (
    <LinearGradient colors={[colors.ink, colors.tealDark]} style={styles.page}>
      <AmbientBackground />
      <StaggeredView delay={40} style={styles.edition}><Text style={styles.editionText}>PERSONAL WELLNESS · EST. 2026</Text></StaggeredView>
      <View style={styles.hero}>
        <AnimatedLogo size={190} halo={false} />
        <StaggeredView delay={260} style={styles.copy}><Text style={styles.name}>ARJUN</Text><Text style={styles.nameAccent}>NUTRITION</Text><View style={styles.line} /><Text style={styles.note}>NOURISH · MOVE · THRIVE</Text></StaggeredView>
      </View>
      <StaggeredView delay={420}><Text style={styles.loading}>PREPARING YOUR PLAN</Text></StaggeredView>
    </LinearGradient>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingTop: 68, paddingBottom: 45, overflow: 'hidden' },
  edition: { alignSelf: 'flex-start', marginLeft: 28 }, editionText: { ...type.label, color: '#8BBFC2', fontSize: 9 },
  hero: { alignItems: 'center' }, copy: { alignItems: 'center', marginTop: -15 },
  name: { color: colors.white, fontFamily: fonts.semibold, fontSize: 38, lineHeight: 40, letterSpacing: 5 }, nameAccent: { color: colors.accent, fontFamily: fonts.medium, fontSize: 17, letterSpacing: 7, marginLeft: 7 },
  line: { width: 38, height: 1, backgroundColor: colors.gold, marginVertical: 18 }, note: { ...type.label, color: '#A8DAD8', fontSize: 9, letterSpacing: 2.5 },
  loading: { ...type.label, color: '#6D9EA1', fontSize: 8 },
});
