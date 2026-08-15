import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useDispatch } from 'react-redux';
import PrimaryButton from '../../components/common/PrimaryButton';
import Screen from '../../components/common/Screen';
import { register } from '../../store/slices/authSlice';
import { colors, radius, type } from '../../theme';

export default function RegisterScreen() {
  const dispatch = useDispatch(); const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  return <Screen><View style={styles.head}><Text style={styles.kicker}>YOUR BASELINE</Text><Text style={styles.title}>Let’s build your plan.</Text><Text style={styles.body}>Start with the essentials. You can add health preferences after setup.</Text></View><View style={styles.form}>{[['Full name', name, setName], ['Email address', email, setEmail], ['Password', password, setPassword]].map(([label, value, setter]) => <View key={label} style={styles.field}><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={setter} secureTextEntry={label === 'Password'} autoCapitalize={label === 'Email address' ? 'none' : 'words'} style={styles.input} /></View>)}<PrimaryButton title="Create my account" disabled={!name || !email || !password} onPress={() => dispatch(register({ name, email, password }))} /></View></Screen>;
}
const styles = StyleSheet.create({ head: { marginTop: 48, gap: 9 }, kicker: { ...type.label, color: colors.moss }, title: { ...type.display, color: colors.ink }, body: { ...type.body, color: colors.muted }, form: { marginTop: 38, gap: 17 }, field: { gap: 7 }, label: { color: colors.ink, fontWeight: '700' }, input: { height: 54, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 16, color: colors.ink, fontSize: 16 } });

