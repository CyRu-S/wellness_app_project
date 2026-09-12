import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuthField from '../../components/auth/AuthField';
import AuthHeader from '../../components/auth/AuthHeader';
import PrimaryButton from '../../components/common/PrimaryButton';
import { requestPasswordReset, resetPassword } from '../../services/api/authApi';
import { colors, fonts, radius, shadows, type } from '../../theme';

export default function VerifyOtpScreen({ navigation, route }) {
  const email = route.params?.email || '';
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const submit = async () => {
    if (password !== confirmPassword) { setError('The passwords do not match.'); return; }
    setLoading(true); setError(null); setNotice(null);
    try {
      const result = await resetPassword(email, otp, password);
      Alert.alert('Password reset', result.message, [{ text: 'Sign in', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }) }]);
    } catch (requestError) {
      setError(requestError.message || 'Could not reset your password.');
    } finally { setLoading(false); }
  };

  const resend = async () => {
    setLoading(true); setError(null); setNotice(null);
    try {
      await requestPasswordReset(email);
      setNotice('If the account exists, a new code has been sent.');
    } catch (requestError) { setError(requestError.message || 'Could not resend the code.'); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <AuthHeader compact navigation={navigation} eyebrow="VERIFY YOUR EMAIL">Enter your reset code.</AuthHeader>
          <View style={styles.card}>
            <Text style={styles.body}>Enter the six-digit code sent to <Text style={styles.email}>{email}</Text>, then choose a new password.</Text>
            <AuthField label="Reset code" icon="key-outline" value={otp} onChangeText={(value) => setOtp(value.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} textContentType="oneTimeCode" />
            <AuthField label="New password" icon="lock-closed-outline" value={password} onChangeText={setPassword} secureTextEntry passwordToggle textContentType="newPassword" placeholder="At least 8 characters" />
            <AuthField label="Confirm new password" icon="shield-checkmark-outline" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry passwordToggle textContentType="newPassword" />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {notice ? <Text style={styles.notice}>{notice}</Text> : null}
            <PrimaryButton title={loading ? 'Updating…' : 'Reset password'} onPress={submit} disabled={otp.length !== 6 || password.length < 8 || confirmPassword.length < 8 || loading} icon="checkmark-circle-outline" />
            <Pressable accessibilityRole="button" disabled={loading} onPress={resend}><Text style={styles.resend}>Didn’t receive it? Send again</Text></Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.tealDark }, fill: { flex: 1 }, page: { flexGrow: 1, backgroundColor: colors.paper, paddingBottom: 30 },
  card: { marginTop: -20, marginHorizontal: 18, padding: 22, gap: 16, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.soft },
  body: { ...type.body, color: colors.muted, marginBottom: 2 }, email: { color: colors.ink, fontFamily: fonts.semibold },
  error: { color: colors.danger, fontFamily: fonts.medium, fontSize: 11, textAlign: 'center' },
  notice: { color: colors.tealMid, fontFamily: fonts.medium, fontSize: 11, textAlign: 'center' },
  resend: { color: colors.accent, fontFamily: fonts.semibold, fontSize: 12, textAlign: 'center', paddingVertical: 7 },
});
