import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import AnimatedLogo from '../../components/auth/AnimatedLogo';
import AuthDivider from '../../components/auth/AuthDivider';
import GoogleButton from '../../components/auth/GoogleButton';
import StaggeredView from '../../components/auth/StaggeredView';
import AmbientBackground from '../../components/common/AmbientBackground';
import BrandMark from '../../components/common/BrandMark';
import PrimaryButton from '../../components/common/PrimaryButton';
import { finishOnboarding } from '../../store/slices/authSlice';
import { colors, fonts, radius, type } from '../../theme';

export default function GetStartedScreen({ navigation }) {
  const dispatch = useDispatch();
  const open = (screen) => { dispatch(finishOnboarding()); navigation.navigate(screen); };
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[colors.ink, colors.tealDark]} style={styles.hero}>
          <AmbientBackground />
          <StaggeredView delay={30} style={styles.top}><BrandMark light /><Text style={styles.step}>02 / 02</Text></StaggeredView>
          <View style={styles.logo}><AnimatedLogo size={218} halo={false} /></View>
          <StaggeredView delay={180} style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>YOUR PLAN. YOUR PACE.</Text>
            <Text style={styles.heroTitle}>Wellness that fits.</Text>
          </StaggeredView>
        </LinearGradient>

        <View style={styles.sheet}>
          <StaggeredView delay={250}>
            <Text style={styles.title}>How would you like to begin?</Text>
            <Text style={styles.body}>Create your personalised plan, or return to the routine you already started.</Text>
          </StaggeredView>
          <StaggeredView delay={350} style={styles.actions}>
            <PrimaryButton title="Create my plan" onPress={() => open('Register')} />
            <PrimaryButton title="Sign in to my account" onPress={() => open('Login')} secondary icon={null} />
            <AuthDivider label="OR" />
            <GoogleButton onPress={() => open('Login')} />
          </StaggeredView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink }, page: { flexGrow: 1, backgroundColor: colors.paper },
  hero: { minHeight: 430, paddingHorizontal: 24, paddingTop: 15, paddingBottom: 42, overflow: 'hidden' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, step: { ...type.label, color: '#77AEB1', fontSize: 9 },
  logo: { alignItems: 'center', justifyContent: 'center', minHeight: 250 },
  heroCopy: { marginTop: -8 }, heroEyebrow: { ...type.label, color: colors.accent }, heroTitle: { color: colors.white, fontFamily: fonts.semibold, fontSize: 38, lineHeight: 42, letterSpacing: -1.4, marginTop: 7 },
  sheet: { flex: 1, backgroundColor: colors.paper, marginTop: -24, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: 24, paddingTop: 34 },
  title: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 25, lineHeight: 30, letterSpacing: -0.6 }, body: { ...type.body, color: colors.muted, marginTop: 9, maxWidth: 340 },
  actions: { marginTop: 25, gap: 13 },
});
