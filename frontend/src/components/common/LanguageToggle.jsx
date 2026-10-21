import { LocalizedText as Text } from './LocalizedText';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLanguage } from '../../i18n/LanguageContext';
import { colors, fonts, radius } from '../../theme';

export default function LanguageToggle({ admin = false }) {
  const { language, setLanguage, t } = useLanguage();
  return (
    <View style={[styles.shell, admin && styles.adminShell]}>
      <View style={styles.copy}>
        <Text style={styles.title}>{t('language')}</Text>
        <Text style={styles.detail}>{t('languageDetail')}</Text>
      </View>
      <View accessibilityRole="radiogroup" style={styles.options}>
        {[['en', t('english')], ['te', t('telugu')]].map(([value, label]) => {
          const selected = language === value;
          return <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => setLanguage(value)} style={[styles.option, selected && styles.optionSelected]}><Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text></Pressable>;
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { marginTop: 18, padding: 16, gap: 14, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, backgroundColor: colors.surface },
  adminShell: { marginTop: 26 },
  copy: { gap: 3 },
  title: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 16 },
  detail: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 18 },
  options: { flexDirection: 'row', padding: 4, gap: 4, borderRadius: radius.pill, backgroundColor: colors.mist },
  option: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  optionSelected: { backgroundColor: colors.tealDark },
  optionText: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 13 },
  optionTextSelected: { color: colors.white },
});
