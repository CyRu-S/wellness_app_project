import { Alert, Platform } from 'react-native';

// These endpoints do not accept an idempotency key. A lost response does not
// prove that the write failed, so never silently replay a water/activity POST.
export function confirmRetry(label, retry) {
  const message = `Check the latest ${label.toLowerCase()} first. If the server saved your previous request but its response was lost, retrying can add it twice. Continue?`;
  if (Platform.OS === 'web') {
    if (globalThis.confirm(message)) retry();
  } else {
    Alert.alert(`Retry ${label.toLowerCase()}?`, message, [{ text: 'Cancel', style: 'cancel' }, { text: 'Retry', onPress: retry }]);
  }
}
