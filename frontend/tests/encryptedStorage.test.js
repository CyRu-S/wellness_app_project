import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { loadModule } from './loadModule.js';

test('private cache is ciphertext on disk and is erased with its key on sign-out', async () => {
  const disk = new Map();
  const secrets = new Map();
  const storage = loadModule('../src/services/storage/encryptedStorage.js', {
    'react-native': { Platform: { OS: 'android' } },
    '@react-native-async-storage/async-storage': {
      getItem: async (key) => disk.get(key) || null,
      setItem: async (key, value) => { disk.set(key, value); },
      removeItem: async (key) => { disk.delete(key); },
      getAllKeys: async () => [...disk.keys()],
      multiRemove: async (keys) => keys.forEach((key) => disk.delete(key)),
    },
    'expo-secure-store': {
      getItemAsync: async (key) => secrets.get(key) || null,
      setItemAsync: async (key, value) => { secrets.set(key, value); },
      deleteItemAsync: async (key) => { secrets.delete(key); },
    },
    'expo-crypto': {
      AESEncryptionKey: {
        generate: async () => ({ encoded: async () => 'private-key' }),
        import: async () => ({ encoded: async () => 'private-key' }),
      },
      AESSealedData: { fromCombined: (raw) => raw },
      aesEncryptAsync: async (plain) => ({ combined: async () => Buffer.from(plain.map((byte) => byte ^ 0xaa)).toString('base64') }),
      aesDecryptAsync: async (raw) => Uint8Array.from(Buffer.from(raw, 'base64'), (byte) => byte ^ 0xaa),
    },
  }, { TextEncoder, TextDecoder, Buffer });
  const key = 'mr-care.api-cache.v2:account-hash:/dashboard';
  disk.set('mr-care.api-cache.v1:old-plaintext', '{"private":"old"}');
  await storage.purgeLegacyCache();
  assert.equal(disk.has('mr-care.api-cache.v1:old-plaintext'), false);
  await storage.writeEncryptedJson(key, { private: 'meal details' });
  assert.equal(disk.get(key).includes('meal details'), false);
  assert.equal((await storage.readEncryptedJson(key)).private, 'meal details');
  await storage.clearEncryptedData();
  assert.equal(disk.size, 0);
  assert.equal(secrets.size, 0);
});
