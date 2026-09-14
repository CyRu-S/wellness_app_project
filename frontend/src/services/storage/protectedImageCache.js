import { Directory, File, Paths } from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

const folder = () => new Directory(Paths.document, 'protected-images-v1');
const pending = new Map();
let generation = 0;
let downloadId = 0;

async function destination(uri, authorization) {
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${authorization}\n${uri}`);
  const directory = folder();
  directory.create({ idempotent: true });
  return new File(directory, `${hash}.img`);
}

// A private, URL-versioned copy survives screen changes and app restarts.
export async function cachedProtectedImage(uri, authorization) {
  if (Platform.OS === 'web') throw new Error('Native cache only');
  const started = generation;
  const file = await destination(uri, authorization);
  if (started !== generation) throw new Error('Image cache was cleared');
  if (file.exists) return { uri: file.uri };
  const key = file.uri;
  if (!pending.has(key)) {
    const work = (async () => {
      const temporary = new File(folder(), `${downloadId++}.part`);
      try {
        const downloaded = await File.downloadFileAsync(uri, temporary, { headers: { Authorization: authorization } });
        if (started !== generation) throw new Error('Image cache was cleared');
        if (!file.exists) await downloaded.move(file);
        else if (downloaded.exists) downloaded.delete();
        return { uri: file.uri };
      } finally {
        if (temporary.exists) temporary.delete();
      }
    })().finally(() => pending.delete(key));
    pending.set(key, work);
  }
  return pending.get(key);
}

// The just-uploaded file is already on the phone; avoid its first network fetch.
export async function primeProtectedImageCache(uri, authorization, localUri) {
  if (Platform.OS === 'web' || !uri || !authorization || !/^(file|content):/i.test(localUri || '')) return;
  const started = generation;
  try {
    const file = await destination(uri, authorization);
    if (started !== generation || file.exists) return;
    await new File(localUri).copy(file);
    if (started !== generation && file.exists) file.delete();
  } catch { /* Upload succeeded; the image can still be fetched on first view. */ }
}

export async function clearProtectedImageCache() {
  generation += 1;
  pending.clear();
  if (Platform.OS === 'web') return;
  try {
    const directory = folder();
    if (directory.exists) directory.delete();
  } catch { /* An OS storage error must not block logout. */ }
}
