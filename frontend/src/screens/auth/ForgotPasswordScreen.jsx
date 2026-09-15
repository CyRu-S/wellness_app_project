import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuthField from '../../components/auth/AuthField';
import AuthHeader from '../../components/auth/AuthHeader';
import PrimaryButton from '../../components/common/PrimaryButton';
import { requestPasswordReset } from '../../services/api/authApi';
import { colors, fonts, radius, shadows, type } from '../../theme';

export default function ForgotPasswordScreen({ navigation, route }) {
  const lockedEmail = route.params?.email?.trim().toLowerCase() || '';
  const [email, setEmail] = useState(lockedEmail);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const submit = async () => {
    setStatus('loading'); setError(null);
    try {
      await requestPasswordReset(email.trim());
      navigation.navigate(route.params?.verifyRoute || 'VerifyOtp', {
        email: email.trim().toLowerCase(),
        signedInReset: Boolean(route.params?.signedInReset),
      });
    } catch (requestError) {
      setError(requestError.message || 'Could not send the reset code.');
    } finally {
      setStatus('idle');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <AuthHeader compact navigation={navigation} eyebrow="ACCOUNT RECOVERY">Reset your password.</AuthHeader>
          <View style={styles.card}>
            <Text style={styles.title}>Where should we send your code?</Text>
            <Text style={styles.body}>{lockedEmail ? 'We’ll send a six-digit code to your registered admin email address.' : 'Enter the email address registered with Mr_Care. We’ll send a six-digit code if an account exists.'}</Text>
            {lockedEmail ? <Text style={styles.email}>{lockedEmail}</Text> : <AuthField label="Email address" icon="mail-outline" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" textContentType="emailAddress" />}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton title={status === 'loading' ? 'Sending…' : 'Send reset code'} onPress={submit} disabled={!email.trim() || status === 'loading'} icon="mail-outline" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.tealDark }, fill: { flex: 1 }, page: { flexGrow: 1, backgroundColor: colors.paper },
  card: { marginTop: -20, marginHorizontal: 18, padding: 22, gap: 18, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.soft },
  title: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 21, lineHeight: 27 },
  body: { ...type.body, color: colors.muted, marginTop: -8 },
  email: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 14, marginTop: -4 },
  error: { color: colors.danger, fontFamily: fonts.medium, fontSize: 11, textAlign: 'center' },
});
