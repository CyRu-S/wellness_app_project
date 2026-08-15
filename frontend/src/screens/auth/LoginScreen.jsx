import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useDispatch } from 'react-redux';
import BrandMark from '../../components/common/BrandMark';
import PrimaryButton from '../../components/common/PrimaryButton';
import Screen from '../../components/common/Screen';
import { signIn } from '../../store/slices/authSlice';
import { colors, radius, type } from '../../theme';

export default function LoginScreen({ navigation }) {
  const dispatch = useDispatch();
  const [email, setEmail] = useState('user@wellnest.app');
  const [password, setPassword] = useState('password');
  const submit = () => dispatch(signIn({ email, password }));
  return (
    <Screen scroll={false} contentStyle={styles.page}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <BrandMark />
        <View style={styles.heading}><Text style={styles.eyebrow}>WELCOME BACK</Text><Text style={styles.title}>Continue your rhythm.</Text><Text style={styles.body}>Your plan is ready for today.</Text></View>
        <View style={styles.form}>
          <Text style={styles.label}>Email address</Text><TextInput autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} style={styles.input} />
          <Text style={styles.label}>Password</Text><TextInput value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
          <PrimaryButton title="Sign in" onPress={submit} disabled={!email || !password} />
          <Text style={styles.demo}>Admin preview: admin@wellnest.app / password</Text>
        </View>
        <Pressable onPress={() => navigation.navigate('Register')} style={styles.register}><Text style={styles.registerText}>New here? <Text style={styles.strong}>Create an account</Text></Text></Pressable>
      </KeyboardAvoidingView>
    </Screen>
  );
}
const styles = StyleSheet.create({ fill: { flex: 1 }, page: { paddingTop: 12 }, heading: { marginTop: 68, gap: 8 }, eyebrow: { ...type.label, color: colors.moss }, title: { ...type.display, color: colors.ink, maxWidth: 300 }, body: { ...type.body, color: colors.muted }, form: { gap: 10, marginTop: 42 }, label: { color: colors.ink, fontSize: 13, fontWeight: '700', marginTop: 5 }, input: { minHeight: 54, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: 16, color: colors.ink, fontSize: 16, marginBottom: 6 }, demo: { color: colors.muted, fontSize: 12, textAlign: 'center' }, register: { marginTop: 'auto', alignItems: 'center', paddingVertical: 18 }, registerText: { color: colors.muted }, strong: { color: colors.ink, fontWeight: '800' } });

