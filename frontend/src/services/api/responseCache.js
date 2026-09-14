import * as Crypto from 'expo-crypto';
import { clearEncryptedData, readEncryptedJson, removeEncryptedPrefix, writeEncryptedJson } from '../storage/encryptedStorage';

const PREFIX = 'mr-care.api-cache.v2:';
const memory = new Map();
const tokenHashes = new Map();
let generation = 0;
let pendingClear = Promise.resolve();

const lifetime = (path) => {
  // Frequently changing views must still notice changes made on another phone.
  if (path.startsWith('/notifications') || path.startsWith('/admin/approvals')) return 30000;
  if (path.startsWith('/shared-members') || path.startsWith('/admin/members/') || path.startsWith('/admin/member-access')) return 30000;
  if (path.startsWith('/dashboard') || path.startsWith('/admin/workspace') || path.startsWith('/plans/today')
    || path.startsWith('/meals/today') || path.startsWith('/meal-posts') || path.startsWith('/profile')) return 60000;
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
    const entry = memory.has(key) ? memory.get(key) : await readEncryptedJson(key);
    if (!entry) return { hit: false };
    memory.set(key, entry);
    return { hit: true, value: entry.value, stale: entry.expiresAt <= Date.now() };
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
    const entry = { expiresAt: Date.now() + lifetime(path), value };
    memory.set(key, entry);
    await writeEncryptedJson(key, entry);
  } catch {
    memory.delete(key);
  }
}

export function invalidateCachedResponses() {
  generation += 1;
  memory.clear();
  pendingClear = pendingClear.then(async () => {
    try {
      await removeEncryptedPrefix(PREFIX);
    } catch { /* A failed cache clear should not block saving or signing out. */ }
  });
  return pendingClear;
}

export async function clearCachedResponses() {
  tokenHashes.clear();
  await invalidateCachedResponses();
  await clearEncryptedData();
}
