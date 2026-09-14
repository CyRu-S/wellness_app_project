import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const PREFIX = 'mr-care.api-cache.v1:';
const memory = new Map();
const tokenHashes = new Map();
let generation = 0;
let pendingClear = Promise.resolve();

const lifetime = (path) => {
  // Frequently changing views must still notice changes made on another phone.
  if (path.startsWith('/notifications') || path.startsWith('/admin/approvals')) return 30000;
  if (path.startsWith('/dashboard') || path.startsWith('/admin/workspace')) return 60000;
  return 5 * 60000;
};

async function keyFor(path, authorization) {
  if (!authorization?.startsWith('Bearer ')) return null;
  const token = authorization.slice(7);
  let hash = tokenHashes.get(token);
  if (!hash) {
    hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, token);
    tokenHashes.set(token, hash);
  }
  return `${PREFIX}${hash}:${encodeURIComponent(path)}`;
}

export function cacheVersion() { return generation; }

export async function readCachedResponse(path, authorization) {
  await pendingClear;
  const key = await keyFor(path, authorization);
  if (!key) return { hit: false };
  try {
    const raw = memory.has(key) ? memory.get(key) : await AsyncStorage.getItem(key);
    if (!raw) return { hit: false };
    const entry = JSON.parse(raw);
    if (entry.expiresAt <= Date.now()) {
      memory.delete(key);
      AsyncStorage.removeItem(key).catch(() => {});
      return { hit: false };
    }
    memory.set(key, raw);
    return { hit: true, value: entry.value };
  } catch {
    // Storage errors must never block the API or display corrupted cached data.
    memory.delete(key);
    return { hit: false };
  }
}

export async function saveCachedResponse(path, authorization, value, version) {
  await pendingClear;
  if (version !== generation) return;
  const key = await keyFor(path, authorization);
  if (!key || version !== generation) return;
  try {
    const raw = JSON.stringify({ expiresAt: Date.now() + lifetime(path), value });
    memory.set(key, raw);
    await AsyncStorage.setItem(key, raw);
  } catch {
    memory.delete(key);
  }
}

export function invalidateCachedResponses() {
  generation += 1;
  memory.clear();
  pendingClear = pendingClear.then(async () => {
    try {
      const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(PREFIX));
      if (keys.length) await AsyncStorage.multiRemove(keys);
    } catch { /* A failed cache clear should not block saving or signing out. */ }
  });
  return pendingClear;
}

export async function clearCachedResponses() {
  tokenHashes.clear();
  await invalidateCachedResponses();
}
