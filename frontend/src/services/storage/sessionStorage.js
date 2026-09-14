import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'mr-care.session.v1';

// The JWT is never placed in AsyncStorage or in an unencrypted web store.
export async function readSession() {
  if (Platform.OS === 'web') return null;
  const value = await SecureStore.getItemAsync(SESSION_KEY);
  if (!value) return null;
  try {
    const session = JSON.parse(value);
    return session?.token && session?.user?.id && session.user.status === 'ACTIVE' ? session : null;
  } catch {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    return null;
  }
}

export async function writeSession(response) {
  if (Platform.OS === 'web' || !response?.token || response.status !== 'ACTIVE') return;
  const { token, ...user } = response;
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({ token, user }));
}

export async function clearSession() {
  if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(SESSION_KEY);
}
