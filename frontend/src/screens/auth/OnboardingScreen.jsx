import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AnimatedLogo from '../../components/auth/AnimatedLogo';
import StaggeredView from '../../components/auth/StaggeredView';
import AmbientBackground from '../../components/common/AmbientBackground';
import BrandMark from '../../components/common/BrandMark';
import PrimaryButton from '../../components/common/PrimaryButton';
import { colors, fonts, radius, type } from '../../theme';

export default function OnboardingScreen({ navigation }) {
  const today = new Date();
  const date = today.toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' });
  const weekday = today.toLocaleDateString('en-US', { weekday: 'long' });
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.poster}>
          <AmbientBackground />
          <StaggeredView delay={30} style={styles.topline}>
            <BrandMark light />
            <View style={styles.dateBlock}><Text style={styles.weekday}>{weekday}</Text><Text style={styles.date}>{date}</Text></View>
          </StaggeredView>
          <View style={styles.logoStage}>
            <Text style={styles.posterWord}>CARE</Text>
            <AnimatedLogo size={212} halo />
          </View>
          <StaggeredView delay={220} style={styles.posterFooter}>
            <View style={styles.goldLine} />
            <Text style={styles.mantra}>PERSONAL WELLNESS{`\n`}FOR REAL LIFE</Text>
          </StaggeredView>
        </View>

        <View style={styles.sheet}>
          <StaggeredView delay={270}>
            <Text style={styles.eyebrow}>YOUR WELLNESS JOURNEY</Text>
            <Text style={styles.title}>A better day starts with a steadier rhythm.</Text>
            <Text style={styles.body}>Meals, movement and expert guidance—shaped around the life you already live.</Text>
          </StaggeredView>
          <StaggeredView delay={390} style={styles.footer}>
            <View style={styles.progress}><View style={styles.activeBar} /><View style={styles.bar} /></View>
            <PrimaryButton title="Begin your journey" onPress={() => navigation.navigate('GetStarted')} />
          </StaggeredView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink },
  page: { flexGrow: 1, backgroundColor: colors.paper },
  poster: { minHeight: 440, backgroundColor: colors.ink, overflow: 'hidden', paddingHorizontal: 24, paddingTop: 15, paddingBottom: 32 },
  topline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateBlock: { alignItems: 'flex-end' }, weekday: { color: colors.white, fontFamily: fonts.semibold, fontSize: 12 }, date: { color: '#9ED0CC', fontFamily: fonts.medium, fontSize: 10, marginTop: 2 },
  logoStage: { minHeight: 292, alignItems: 'center', justifyContent: 'center' },
  posterWord: { position: 'absolute', color: 'rgba(255,255,255,0.045)', fontFamily: fonts.bold, fontSize: 78, letterSpacing: 9 },
  posterFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  goldLine: { width: 30, height: 1, backgroundColor: colors.gold },
  mantra: { ...type.label, color: '#A7D3D4', fontSize: 9, lineHeight: 15 },
  sheet: { flex: 1, backgroundColor: colors.paper, marginTop: -22, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingHorizontal: 24, paddingTop: 34, paddingBottom: 24 },
  eyebrow: { ...type.label, color: colors.tealMid },
  title: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 33, lineHeight: 37, letterSpacing: -1.2, marginTop: 10, maxWidth: 350 },
  body: { ...type.body, color: colors.muted, marginTop: 14, maxWidth: 345 },
  footer: { marginTop: 25, gap: 18 },
  progress: { flexDirection: 'row', gap: 7 }, activeBar: { width: 32, height: 4, borderRadius: 2, backgroundColor: colors.tealMid }, bar: { width: 8, height: 4, borderRadius: 2, backgroundColor: colors.line },
});
