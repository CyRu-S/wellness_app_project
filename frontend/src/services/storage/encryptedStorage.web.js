// Web-only private storage: non-extractable Web Crypto key and ciphertext in IndexedDB.
const DATABASE = 'mr-care-private-v1';
const STORE = 'records';
const DATA_KEY = '__encryption_key__';
const fallback = new Map();
let database;
let keyPromise;
let generation = 0;

async function db() {
  if (!database) database = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('Browser storage is unavailable')); return; }
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return database;
}
async function operation(mode, action) {
  const connection = await db();
  return new Promise((resolve, reject) => {
    const transaction = connection.transaction(STORE, mode);
    const request = action(transaction.objectStore(STORE));
    transaction.oncomplete = () => resolve(request?.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('Browser storage transaction aborted'));
  });
}
async function encryptionKey() {
  if (!keyPromise) keyPromise = (async () => {
    if (!globalThis.crypto?.subtle) throw new Error('Private storage requires HTTPS');
    let key;
    try { key = await operation('readonly', (store) => store.get(DATA_KEY)); } catch { /* Memory-only fallback. */ }
    if (key) return key;
    key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    try {
      // Serialize key creation across tabs so ciphertext always uses the persisted key.
      const connection = await db();
      key = await new Promise((resolve, reject) => {
        const transaction = connection.transaction(STORE, 'readwrite');
        const store = transaction.objectStore(STORE), candidate = key;
        const request = store.get(DATA_KEY);
        let chosen;
        request.onsuccess = () => { chosen = request.result || candidate; if (!request.result) store.put(candidate, DATA_KEY); };
        transaction.oncomplete = () => resolve(chosen);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
    } catch { /* Private browsing can disable IndexedDB. */ }
    return key;
  })().catch((error) => { keyPromise = null; throw error; });
  return keyPromise;
}
export async function readEncryptedJson(key) {
  if (fallback.has(key)) return fallback.get(key);
  try {
    const entry = await operation('readonly', (store) => store.get(key));
    if (!entry) return null;
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: entry.iv }, await encryptionKey(), entry.ciphertext);
    return JSON.parse(new TextDecoder().decode(plaintext));
  } catch { return null; }
}
export async function writeEncryptedJson(key, value) {
  const started = generation;
  fallback.set(key, value);
  try {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await encryptionKey(), new TextEncoder().encode(JSON.stringify(value)));
    if (started === generation) await operation('readwrite', (store) => store.put({ iv, ciphertext }, key));
  } catch { /* Keep this tab usable when the browser disallows persistent storage. */ }
}
export async function removeEncryptedPrefix(prefix) {
  [...fallback.keys()].filter((key) => key.startsWith(prefix)).forEach((key) => fallback.delete(key));
  try {
    const keys = await operation('readonly', (store) => store.getAllKeys());
    await operation('readwrite', (store) => { keys.filter((key) => typeof key === 'string' && key.startsWith(prefix)).forEach((key) => store.delete(key)); });
  } catch { /* No persisted data in memory-only mode. */ }
}
export async function clearEncryptedData() {
  generation += 1;
  fallback.clear();
  try { await operation('readwrite', (store) => store.clear()); } catch { /* Memory-only mode. */ }
  keyPromise = null;
}
export const purgeLegacyCache = () => removeEncryptedPrefix('mr-care.api-cache.v1:');
