import { Alert as NativeAlert } from 'react-native';
import { getActiveLanguage } from '../i18n/LanguageContext';
import { translateUiText } from '../i18n/displayTranslations';

const Alert = {
  alert(title, message = '', buttons = [], options) {
    const language = getActiveLanguage();
    NativeAlert.alert(translateUiText(language, title), translateUiText(language, message),
      buttons.map((button) => ({ ...button, text: translateUiText(language, button.text) })), options);
  },
};

export default Alert;
