import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import BrandMark from '../../components/common/BrandMark';
import PrimaryButton from '../../components/common/PrimaryButton';
import Screen from '../../components/common/Screen';
import { finishOnboarding } from '../../store/slices/authSlice';
import { colors, type } from '../../theme';

export default function OnboardingScreen({ navigation }) {
  const dispatch = useDispatch();
  const continueToLogin = () => { dispatch(finishOnboarding()); navigation.replace('Login'); };
  return (
    <Screen contentStyle={styles.content}>
      <BrandMark />
      <View style={styles.art}>
        <View style={styles.sun} />
        <View style={styles.arc}><Ionicons name="leaf-outline" size={78} color={colors.surface} /></View>
        <Text style={styles.artLabel}>Your day, in balance.</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.kicker}>PERSONAL WELLNESS, DAILY</Text>
        <Text style={styles.title}>A plan that moves with your life.</Text>
        <Text style={styles.body}>Meals, movement and mindful reminders—kept simple enough to become routine.</Text>
      </View>
      <PrimaryButton title="Start your journey" onPress={continueToLogin} />
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { paddingTop: 12, justifyContent: 'space-between' },
  art: { height: 300, backgroundColor: colors.ink, borderRadius: 150, marginTop: 24, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  sun: { position: 'absolute', width: 138, height: 138, borderRadius: 69, backgroundColor: colors.accent, top: 25, right: 25 },
  arc: { width: 186, height: 186, borderRadius: 93, backgroundColor: colors.moss, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-12deg' }] },
  artLabel: { position: 'absolute', bottom: 25, left: 31, color: colors.white, fontSize: 18, fontWeight: '700' },
  copy: { gap: 10, marginVertical: 26 }, kicker: { ...type.label, color: colors.moss }, title: { ...type.h1, color: colors.ink }, body: { ...type.body, color: colors.muted, maxWidth: 340 },
});

