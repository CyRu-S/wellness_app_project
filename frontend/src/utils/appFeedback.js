import { store } from '../store';
import { showToast, showDialog, clearDialog } from '../store/slices/toastSlice';
import { getActiveLanguage } from '../i18n/LanguageContext';
import { translateUiText } from '../i18n/displayTranslations';

// Keep callbacks out of Redux/persisted data, and retain only the current choice.
let pendingDialog = null;

function runAction(action) {
  try {
    Promise.resolve(action?.()).catch((error) => presentAppAlert('Could not complete action', error.message || 'Please try again.'));
  } catch (error) {
    presentAppAlert('Could not complete action', error.message || 'Please try again.');
  }
}

export function presentAppAlert(title, message = '', buttons = [], options = {}) {
  const language = getActiveLanguage();
  const text = (value) => translateUiText(language, value || '');
  const requiresChoice = buttons.length > 1 || buttons.some((button) => ['cancel', 'destructive'].includes(button.style));
  if (requiresChoice) {
    const action = showDialog({ title: text(title), message: text(message),
      buttons: buttons.map((button) => ({ text: text(button.text), style: button.style || 'default' })) });
    pendingDialog = { id: action.payload.id, token: store.getState().auth.token, buttons, onDismiss: options?.onDismiss };
    store.dispatch(action);
    return;
  }
  const kind = /could not|cannot|failed|error|unavailable|not sent|not deleted|timed out/i.test(title) ? 'error'
    : /check |complete .*details|already|pending|no new|no .*available/i.test(title) ? 'info' : 'success';
  store.dispatch(showToast({ title: text(title), message: text(message), kind, celebrate: false }));
  // A single Done/Sign in button previously only acknowledged a completed action.
  // Continue navigation immediately; the notification remains visible across screens.
  runAction(buttons[0]?.onPress);
}

export function chooseAppDialog(id, index) {
  const pending = pendingDialog;
  if (store.getState().toast.dialog?.id !== id || pending?.id !== id) return;
  pendingDialog = null;
  store.dispatch(clearDialog(id));
  if (store.getState().auth.token !== pending.token) return;
  if (index == null) {
    const cancel = pending.buttons.find((button) => button.style === 'cancel');
    runAction(cancel?.onPress || pending.onDismiss);
  } else {
    runAction(pending.buttons[index]?.onPress);
  }
}
