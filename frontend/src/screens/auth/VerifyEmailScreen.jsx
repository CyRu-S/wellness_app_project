import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuthField from '../../components/auth/AuthField';
import AuthHeader from '../../components/auth/AuthHeader';
import PrimaryButton from '../../components/common/PrimaryButton';
import { resendVerification, verifyEmail } from '../../services/api/authApi';
import { colors, fonts, radius, shadows, type } from '../../theme';

export default function VerifyEmailScreen({ navigation, route }) {
  const [email, setEmail] = useState(route.params?.email || '');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const submit = async () => {
    setLoading(true); setError(null); setNotice(null);
    try {
      await verifyEmail(email.trim().toLowerCase(), otp);
      Alert.alert('Email verified', 'Your account is now awaiting admin approval. You can sign in after the admin approves it.',
        [{ text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }) }]);
    } catch (requestError) { setError(requestError.message || 'Could not verify your email.'); }
    finally { setLoading(false); }
  };
  const resend = async () => {
    setLoading(true); setError(null); setNotice(null);
    try { await resendVerification(email.trim().toLowerCase()); setNotice('If verification is needed, a new code has been sent.'); }
    catch (requestError) { setError(requestError.message || 'Could not resend the code.'); }
    finally { setLoading(false); }
  };
  return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <AuthHeader compact navigation={navigation} eyebrow="VERIFY YOUR EMAIL">One quick check.</AuthHeader>
        <View style={styles.card}>
          <Text style={styles.body}>Enter the six-digit code sent to your email. After verification, an admin will review your account.</Text>
          <AuthField label="Email address" icon="mail-outline" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" textContentType="emailAddress" />
          <AuthField label="Verification code" icon="key-outline" value={otp} onChangeText={(value) => setOtp(value.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} textContentType="oneTimeCode" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          <PrimaryButton title={loading ? 'Verifying…' : 'Verify email'} onPress={submit} disabled={!email.trim() || otp.length !== 6 || loading} icon="checkmark-circle-outline" />
          <Pressable accessibilityRole="button" disabled={loading || !email.trim()} onPress={resend}><Text style={styles.resend}>Did not receive it? Send again</Text></Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.tealDark }, fill: { flex: 1 }, page: { flexGrow: 1, backgroundColor: colors.paper },
  card: { marginTop: -20, marginHorizontal: 18, padding: 22, gap: 16, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.soft },
  body: { ...type.body, color: colors.muted },
  error: { color: colors.danger, fontFamily: fonts.medium, fontSize: 11, textAlign: 'center' },
  notice: { color: colors.tealMid, fontFamily: fonts.medium, fontSize: 11, textAlign: 'center' },
  resend: { color: colors.accent, fontFamily: fonts.semibold, fontSize: 12, textAlign: 'center', paddingVertical: 7 },
});
