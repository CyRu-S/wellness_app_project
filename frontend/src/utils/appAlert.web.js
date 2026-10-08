// React Native Web's Alert is a no-op. Preserve the app's one- and two-button flows.
const Alert = {
  alert(title, message = '', buttons = []) {
    const text = [title, message].filter(Boolean).join('\n\n');
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
