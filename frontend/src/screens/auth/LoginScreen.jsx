import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import AuthDivider from '../../components/auth/AuthDivider';
import AuthField from '../../components/auth/AuthField';
import AuthHeader from '../../components/auth/AuthHeader';
import GoogleButton from '../../components/auth/GoogleButton';
import StaggeredView from '../../components/auth/StaggeredView';
import PrimaryButton from '../../components/common/PrimaryButton';
import { signIn } from '../../store/slices/authSlice';
import useGoogleSignIn from '../../hooks/useGoogleSignIn';
import { colors, fonts, radius, type } from '../../theme';

export default function LoginScreen({ navigation }) {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);
  const { startGoogleSignIn, ready: googleReady } = useGoogleSignIn();
  const [email, setEmail] = useState('user@mr-care.app');
  const [password, setPassword] = useState('password');
  const submit = () => dispatch(signIn({ email, password }));
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <AuthHeader navigation={navigation} eyebrow="WELCOME BACK">Good to see{`\n`}you again.</AuthHeader>
          <StaggeredView delay={170} style={styles.form}>
            <Text style={styles.helper}>Sign in to continue your progress.</Text>
            <AuthField label="Email address" icon="mail-outline" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            <AuthField label="Password" icon="lock-closed-outline" value={password} onChangeText={setPassword} secureTextEntry />
            <Pressable style={styles.forgot}><Text style={styles.link}>Forgot password?</Text></Pressable>
            {auth.error ? <Text style={styles.error}>{auth.error}</Text> : null}
            <PrimaryButton title={auth.status === 'loading' ? 'Signing in…' : 'Sign in'} onPress={submit} disabled={!email || !password || auth.status === 'loading'} />
            <AuthDivider />
            <GoogleButton onPress={startGoogleSignIn} disabled={!googleReady || auth.status === 'loading'} loading={auth.status === 'loading'} />
            <Text style={styles.demo}>Admin preview: admin@mr-care.app / password</Text>
            <Pressable onPress={() => navigation.navigate('Register')}><Text style={styles.register}>New to Mr_Care? <Text style={styles.strong}>Create account</Text></Text></Pressable>
          </StaggeredView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.tealDark }, fill: { flex: 1 }, page: { flexGrow: 1, backgroundColor: colors.paper },
  form: { flex: 1, backgroundColor: colors.surface, marginTop: -24, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 24, gap: 16 },
  helper: { ...type.body, color: colors.muted, marginBottom: 3 }, forgot: { alignSelf: 'flex-end', marginTop: -4 }, link: { color: colors.accent, fontFamily: fonts.semibold },
  demo: { color: colors.muted, fontSize: 11, textAlign: 'center', backgroundColor: colors.paper, borderRadius: radius.sm, padding: 9 },
  error: { color: colors.danger, fontFamily: fonts.medium, fontSize: 11, textAlign: 'center' },
  register: { textAlign: 'center', color: colors.muted, paddingTop: 3 }, strong: { color: colors.accent, fontFamily: fonts.semibold },
});
