import { getActiveLanguage } from '../i18n/LanguageContext';
import { translateUiText } from '../i18n/displayTranslations';

// React Native Web's Alert is a no-op. Preserve the app's one- and two-button flows.
const Alert = {
  alert(title, message = '', buttons = []) {
    const language = getActiveLanguage();
    const text = [title, message].filter(Boolean).map((value) => translateUiText(language, value)).join('\n\n');
    const action = buttons.find((button) => button.style !== 'cancel');
    const cancel = buttons.find((button) => button.style === 'cancel');
    if (cancel) {
      if (globalThis.confirm(text)) action?.onPress?.();
      else cancel.onPress?.();
    } else {
      globalThis.alert(text);
      action?.onPress?.();
    }
  },
};
export default Alert;
