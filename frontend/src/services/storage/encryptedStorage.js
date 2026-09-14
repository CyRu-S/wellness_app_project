import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { AESEncryptionKey, AESSealedData, aesDecryptAsync, aesEncryptAsync } from 'expo-crypto';

const KEY_NAME = 'mr-care.data-key.v1';
const CACHE_PREFIX = 'mr-care.api-cache.';
const SNAPSHOT_PREFIX = 'mr-care.snapshot.';
const LEGACY_CACHE_PREFIX = 'mr-care.api-cache.v1:';
let keyPromise;

export async function purgeLegacyCache() {
  await removeEncryptedPrefix(LEGACY_CACHE_PREFIX);
}

async function encryptionKey(create) {
  if (Platform.OS === 'web') return null;
  if (!keyPromise) keyPromise = (async () => {
    const stored = await SecureStore.getItemAsync(KEY_NAME);
    if (stored) return AESEncryptionKey.import(stored, 'hex');
    if (!create) return null;
    const key = await AESEncryptionKey.generate();
    await SecureStore.setItemAsync(KEY_NAME, await key.encoded('hex'));
    return key;
  })().catch((error) => { keyPromise = null; throw error; });
  const key = await keyPromise;
  if (!key && create) { keyPromise = null; return encryptionKey(true); }
  return key;
}

export async function readEncryptedJson(key) {
  const encryption = await encryptionKey(false);
  if (!encryption) return null;
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    const plain = await aesDecryptAsync(AESSealedData.fromCombined(raw), encryption);
    return JSON.parse(new TextDecoder().decode(plain));
  } catch {
    await AsyncStorage.removeItem(key).catch(() => {});
    return null;
  }
}

export async function writeEncryptedJson(key, value) {
  const encryption = await encryptionKey(true);
  if (!encryption) return;
  const sealed = await aesEncryptAsync(new TextEncoder().encode(JSON.stringify(value)), encryption);
  await AsyncStorage.setItem(key, await sealed.combined('base64'));
}

export async function removeEncryptedPrefix(prefix) {
  if (Platform.OS === 'web') return;
  const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(prefix));
  if (keys.length) await AsyncStorage.multiRemove(keys);
}

export async function clearEncryptedData() {
  if (Platform.OS === 'web') return;
  const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(CACHE_PREFIX) || key.startsWith(SNAPSHOT_PREFIX));
  if (keys.length) await AsyncStorage.multiRemove(keys);
  await SecureStore.deleteItemAsync(KEY_NAME);
  keyPromise = null;
}
