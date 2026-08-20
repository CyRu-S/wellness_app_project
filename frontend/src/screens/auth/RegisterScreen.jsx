import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import AuthField from '../../components/auth/AuthField';
import AuthHeader from '../../components/auth/AuthHeader';
import StaggeredView from '../../components/auth/StaggeredView';
import PrimaryButton from '../../components/common/PrimaryButton';
import { register } from '../../store/slices/authSlice';
import { colors, fonts, radius, shadows, type } from '../../theme';

const goals = [
  ['Feel energised', 'flash-outline'],
  ['Build habits', 'repeat-outline'],
  ['Manage weight', 'analytics-outline'],
];

function SectionLabel({ number, children }) {
  return <View style={styles.sectionLabel}><View style={styles.sectionNumber}><Text style={styles.sectionNumberText}>{number}</Text></View><Text style={styles.sectionText}>{children}</Text></View>;
}

export default function RegisterScreen({ navigation }) {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState(goals[0][0]);
  const [notes, setNotes] = useState('');
  const submit = () => dispatch(register({ name, email, password, age, height, weight, goal, notes }));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <AuthHeader compact navigation={navigation} eyebrow="YOUR PROFILE">Tell us about you.</AuthHeader>
          <View style={styles.sheet}>
            <StaggeredView delay={100} style={styles.profileRow}>
              <Pressable accessibilityLabel="Add profile photo" style={({ pressed }) => [styles.photo, pressed && styles.pressed]}><Ionicons name="camera-outline" size={22} color={colors.tealDark} /><View style={styles.photoAdd}><Ionicons name="add" size={12} color={colors.white} /></View></Pressable>
              <View style={styles.profileCopy}><Text style={styles.profileTitle}>Create your wellness profile</Text><Text style={styles.profileHint}>A photo is optional and only visible to your assigned consultant.</Text></View>
            </StaggeredView>

            <StaggeredView delay={150} style={styles.section}>
              <SectionLabel number="01">ACCOUNT DETAILS</SectionLabel>
              <View style={styles.fields}>
                <AuthField label="Full name" icon="person-outline" placeholder="Your full name" value={name} onChangeText={setName} textContentType="name" />
                <AuthField label="Email address" icon="mail-outline" placeholder="you@example.com" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" textContentType="emailAddress" />
                <AuthField label="Password" icon="lock-closed-outline" placeholder="At least 8 characters" value={password} onChangeText={setPassword} secureTextEntry textContentType="newPassword" />
              </View>
            </StaggeredView>

            <StaggeredView delay={210} style={styles.section}>
              <SectionLabel number="02">BODY DETAILS</SectionLabel>
              <Text style={styles.sectionHint}>Used to personalise targets and recommendations.</Text>
              <View style={styles.measurements}>
                <AuthField style={styles.measure} label="Age" placeholder="28" value={age} onChangeText={setAge} keyboardType="number-pad" />
                <AuthField style={styles.measure} label="Height · cm" placeholder="168" value={height} onChangeText={setHeight} keyboardType="number-pad" />
                <AuthField style={styles.measure} label="Weight · kg" placeholder="62" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
              </View>
            </StaggeredView>

            <StaggeredView delay={270} style={styles.section}>
              <SectionLabel number="03">PRIMARY GOAL</SectionLabel>
              <View style={styles.goals}>{goals.map(([item, icon]) => <Pressable key={item} onPress={() => setGoal(item)} style={({ pressed }) => [styles.goal, goal === item && styles.goalActive, pressed && styles.pressed]}><View style={[styles.goalIcon, goal === item && styles.goalIconActive]}><Ionicons name={icon} size={18} color={goal === item ? colors.white : colors.tealDark} /></View><Text style={[styles.goalText, goal === item && styles.goalTextActive]}>{item}</Text><View style={[styles.radio, goal === item && styles.radioActive]}>{goal === item ? <View style={styles.radioDot} /> : null}</View></Pressable>)}</View>
              <AuthField style={styles.notes} label="Anything your consultant should know?" placeholder="Preferences, schedule, allergies or targets" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />
            </StaggeredView>

            <StaggeredView delay={330} style={styles.footer}>
              {auth.error ? <Text style={styles.error}>{auth.error}</Text> : null}
              <PrimaryButton title={auth.status === 'loading' ? 'Creating profile…' : 'Create my profile'} disabled={!name || !email || password.length < 8 || auth.status === 'loading'} onPress={submit} />
              <Text style={styles.legal}>By continuing, you agree to the <Text style={styles.legalStrong}>Terms</Text> and <Text style={styles.legalStrong}>Privacy Policy</Text>.</Text>
            </StaggeredView>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink }, fill: { flex: 1 }, page: { flexGrow: 1, backgroundColor: colors.paper },
  sheet: { backgroundColor: colors.paper, marginTop: -20, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 22, paddingTop: 29, paddingBottom: 30 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingBottom: 25, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line }, photo: { width: 66, height: 66, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', ...shadows.soft }, photoAdd: { position: 'absolute', right: -3, bottom: -3, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.tealMid, borderWidth: 2, borderColor: colors.paper, alignItems: 'center', justifyContent: 'center' }, profileCopy: { flex: 1 }, profileTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 17, lineHeight: 21 }, profileHint: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10, lineHeight: 15, marginTop: 4 }, pressed: { opacity: 0.65 },
  section: { marginTop: 27 }, sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 15 }, sectionNumber: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }, sectionNumberText: { color: colors.accent, fontFamily: fonts.semibold, fontSize: 8 }, sectionText: { ...type.label, color: colors.tealDark, fontSize: 9 }, sectionHint: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10, marginTop: -8, marginBottom: 13 }, fields: { gap: 14 },
  measurements: { flexDirection: 'row', gap: 9 }, measure: { flex: 1 },
  goals: { gap: 9 }, goal: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12 }, goalActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent }, goalIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.mist, alignItems: 'center', justifyContent: 'center' }, goalIconActive: { backgroundColor: colors.tealMid }, goalText: { flex: 1, color: colors.ink, fontFamily: fonts.medium, fontSize: 13 }, goalTextActive: { fontFamily: fonts.semibold }, radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }, radioActive: { borderColor: colors.tealMid }, radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.tealMid }, notes: { marginTop: 15 },
  footer: { marginTop: 28 }, error: { color: colors.danger, fontFamily: fonts.medium, fontSize: 11, textAlign: 'center', marginBottom: 9 }, legal: { textAlign: 'center', color: colors.muted, fontFamily: fonts.regular, fontSize: 9, lineHeight: 14, marginTop: 13 }, legalStrong: { color: colors.ink, fontFamily: fonts.semibold },
});
