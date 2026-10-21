import React, { forwardRef } from 'react';
import { Text as NativeText, TextInput as NativeTextInput } from 'react-native';
import { useLanguage } from '../../i18n/LanguageContext';
import { translateUiNode, translateUiText } from '../../i18n/displayTranslations';

export const LocalizedText = forwardRef(function LocalizedText({ children, translate = true, ...props }, ref) {
  const { language } = useLanguage();
  return <NativeText ref={ref} {...props}>{translate ? translateUiNode(language, children) : children}</NativeText>;
});

export const LocalizedTextInput = forwardRef(function LocalizedTextInput({ placeholder, accessibilityLabel, ...props }, ref) {
  const { language } = useLanguage();
  return <NativeTextInput ref={ref} placeholder={translateUiText(language, placeholder)}
    accessibilityLabel={translateUiText(language, accessibilityLabel)} {...props} />;
});

export default LocalizedText;

