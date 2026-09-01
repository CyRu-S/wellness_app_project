import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import AuthField from '../../components/auth/AuthField';
import AuthHeader from '../../components/auth/AuthHeader';
import StaggeredView from '../../components/auth/StaggeredView';
import PrimaryButton from '../../components/common/PrimaryButton';
import PrimaryTealCardBackground from '../../components/common/PrimaryTealCardBackground';
import ProfilePhotoCropper from '../../components/user/ProfilePhotoCropper';
import { register } from '../../store/slices/authSlice';
import { colors, fonts, radius, shadows, type } from '../../theme';
import { chooseProfilePhoto } from '../../utils/profilePhoto';

const goals = [
  ['Weight loss', 'trending-down-outline'],
  ['Weight gain', 'trending-up-outline'],
  ['Healthy lifestyle', 'leaf-outline'],
];

function SectionLabel({ number, children }) {
  return (
    <View style={styles.sectionLabel}>
      <View style={styles.sectionNumber}><Text style={styles.sectionNumberText}>{number}</Text></View>
      <Text style={styles.sectionText}>{children}</Text>
    </View>
  );
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
  const [photo, setPhoto] = useState(null);
  const [cropCandidate, setCropCandidate] = useState(null);
  const submit = () => dispatch(register({ name, email, password, age, height, weight, goal, notes, photo }));
  const selectPhoto = async () => {
    try {
      const selected = await chooseProfilePhoto();
      if (selected?.needsCrop) setCropCandidate(selected);
      else if (selected) setPhoto(selected);
    } catch (error) {
      Alert.alert('Could not open photos', error.message || 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <AuthHeader compact navigation={navigation} eyebrow="JOIN MR_CARE">Tell us about you.</AuthHeader>
          <View style={styles.sheet}>
            <StaggeredView delay={70} style={styles.progressHeader}>
              <View style={styles.progressCopy}>
                <Text style={styles.progressEyebrow}>PROFILE SETUP</Text>
                <Text style={styles.progressTitle}>Three quick steps</Text>
              </View>
              <View style={styles.progressSteps}>
                <View style={[styles.progressDot, styles.progressDotActive]} />
                <View style={styles.progressDot} />
                <View style={styles.progressDot} />
              </View>
            </StaggeredView>

            <StaggeredView delay={100} style={styles.profileRow}>
              <PrimaryTealCardBackground />
              <Pressable accessibilityRole="button" accessibilityLabel={photo ? 'Change profile photo' : 'Add profile photo'} onPress={selectPhoto} style={({ pressed }) => [styles.photo, pressed && styles.pressed]}>
                {photo ? <Image source={{ uri: photo.persistentUri || photo.uri }} resizeMode="cover" style={styles.photoImage} /> : <Ionicons name="camera-outline" size={22} color={colors.tealDark} />}
                <View style={styles.photoAdd}><Ionicons name="add" size={12} color={colors.white} /></View>
              </Pressable>
              <View style={styles.profileCopy}>
                <Text style={styles.profileKicker}>YOUR PRIVATE SPACE</Text>
                <Text style={styles.profileTitle}>Create your wellness profile</Text>
                <Text style={styles.profileHint}>Your details are shared only with your assigned consultant.</Text>
              </View>
            </StaggeredView>

            <StaggeredView delay={150} style={styles.sectionCard}>
              <SectionLabel number="01">ACCOUNT DETAILS</SectionLabel>
              <View style={styles.fields}>
                <AuthField label="Full name" icon="person-outline" placeholder="Your full name" value={name} onChangeText={setName} textContentType="name" />
                <AuthField label="Email address" icon="mail-outline" placeholder="you@example.com" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" textContentType="emailAddress" />
                <AuthField label="Password" icon="lock-closed-outline" placeholder="At least 8 characters" value={password} onChangeText={setPassword} secureTextEntry textContentType="newPassword" />
              </View>
            </StaggeredView>

            <StaggeredView delay={210} style={styles.sectionCard}>
              <SectionLabel number="02">BODY DETAILS</SectionLabel>
              <Text style={styles.sectionHint}>Used to personalise targets and recommendations.</Text>
              <View style={styles.measurements}>
                <AuthField style={styles.measure} label="Age" placeholder="28" value={age} onChangeText={setAge} keyboardType="number-pad" />
                <AuthField style={styles.measure} label="Height · cm" placeholder="168" value={height} onChangeText={setHeight} keyboardType="number-pad" />
                <AuthField style={styles.measure} label="Weight · kg" placeholder="62" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
              </View>
            </StaggeredView>

            <StaggeredView delay={270} style={styles.sectionCard}>
              <SectionLabel number="03">PRIMARY GOAL</SectionLabel>
              <Text style={styles.sectionHint}>Choose the focus that matters most to you right now.</Text>
              <View style={styles.goals}>
                {goals.map(([item, icon]) => (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: goal === item }}
                    key={item}
                    onPress={() => setGoal(item)}
                    style={({ pressed }) => [styles.goal, goal === item && styles.goalActive, pressed && styles.pressed]}
                  >
                    <View style={[styles.goalIcon, goal === item && styles.goalIconActive]}><Ionicons name={icon} size={18} color={goal === item ? colors.white : colors.tealDark} /></View>
                    <Text style={[styles.goalText, goal === item && styles.goalTextActive]}>{item}</Text>
                    <View style={[styles.radio, goal === item && styles.radioActive]}>{goal === item ? <View style={styles.radioDot} /> : null}</View>
                  </Pressable>
                ))}
              </View>
              <AuthField style={styles.notes} label="Anything your consultant should know?" placeholder="Preferences, schedule, allergies or targets" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />
            </StaggeredView>

            <StaggeredView delay={330} style={styles.footer}>
              {auth.error ? <Text style={styles.error}>{auth.error}</Text> : null}
              <PrimaryButton title={auth.status === 'loading' ? 'Signing you up…' : 'Create my profile'} icon="person-add-outline" disabled={!name || !email || password.length < 8 || auth.status === 'loading'} onPress={submit} />
              <Text style={styles.legal}>By continuing, you agree to the <Text style={styles.legalStrong}>Terms</Text> and <Text style={styles.legalStrong}>Privacy Policy</Text>.</Text>
              <Pressable onPress={() => navigation.navigate('Login')}><Text style={styles.signIn}>Already have an account? <Text style={styles.signInStrong}>Sign in</Text></Text></Pressable>
            </StaggeredView>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <ProfilePhotoCropper photo={cropCandidate} onCancel={() => setCropCandidate(null)} onConfirm={(cropped) => { setPhoto(cropped); setCropCandidate(null); }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink },
  fill: { flex: 1 },
  page: { flexGrow: 1, backgroundColor: colors.paper },
  sheet: { backgroundColor: colors.paper, marginTop: -20, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 18, paddingTop: 25, paddingBottom: 32 },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 5, marginBottom: 14 },
  progressCopy: { flex: 1 },
  progressEyebrow: { ...type.label, color: colors.tealMid, fontSize: 9 },
  progressTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 16, lineHeight: 21, marginTop: 2 },
  progressSteps: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.line },
  progressDotActive: { width: 25, backgroundColor: colors.tealMid },
  profileRow: { position: 'relative', minHeight: 132, flexDirection: 'row', alignItems: 'center', gap: 15, padding: 18, borderRadius: radius.xl, overflow: 'hidden', ...shadows.raised },
  photo: { width: 66, height: 66, borderRadius: 22, backgroundColor: '#E9F7F4', borderWidth: 1, borderColor: 'rgba(255,255,255,0.65)', alignItems: 'center', justifyContent: 'center' },
  photoImage: { width: '100%', height: '100%', borderRadius: 21 },
  photoAdd: { position: 'absolute', right: -3, bottom: -3, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.tealMid, borderWidth: 2, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  profileCopy: { flex: 1 },
  profileKicker: { ...type.label, color: '#B9EBE8', fontSize: 8.5 },
  profileTitle: { color: colors.white, fontFamily: fonts.semibold, fontSize: 18, lineHeight: 23, marginTop: 4 },
  profileHint: { color: '#C9E5E2', fontFamily: fonts.medium, fontSize: 10.5, lineHeight: 16, marginTop: 5 },
  sectionCard: { marginTop: 14, padding: 18, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, ...shadows.soft },
  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 15 },
  sectionNumber: { width: 27, height: 27, borderRadius: 14, backgroundColor: colors.tealDark, alignItems: 'center', justifyContent: 'center' },
  sectionNumberText: { color: '#B9EBE8', fontFamily: fonts.semibold, fontSize: 8 },
  sectionText: { ...type.label, color: colors.tealDark, fontSize: 9.5 },
  sectionHint: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10.5, lineHeight: 16, marginTop: -8, marginBottom: 14 },
  fields: { gap: 14 },
  measurements: { flexDirection: 'row', gap: 9 },
  measure: { flex: 1 },
  goals: { gap: 9 },
  goal: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12 },
  goalActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  goalIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.mist, alignItems: 'center', justifyContent: 'center' },
  goalIconActive: { backgroundColor: colors.tealMid },
  goalText: { flex: 1, color: colors.ink, fontFamily: fonts.medium, fontSize: 13 },
  goalTextActive: { fontFamily: fonts.semibold, color: colors.tealDark },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: colors.tealMid },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.tealMid },
  notes: { marginTop: 17 },
  footer: { marginTop: 22, paddingHorizontal: 4 },
  error: { color: colors.danger, fontFamily: fonts.medium, fontSize: 11, textAlign: 'center', marginBottom: 9 },
  legal: { textAlign: 'center', color: colors.muted, fontFamily: fonts.regular, fontSize: 9, lineHeight: 14, marginTop: 13 },
  legalStrong: { color: colors.ink, fontFamily: fonts.semibold },
  signIn: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, textAlign: 'center', marginTop: 18, paddingVertical: 8 },
  signInStrong: { color: colors.tealMid, fontFamily: fonts.semibold },
  pressed: { opacity: 0.65 },
});
