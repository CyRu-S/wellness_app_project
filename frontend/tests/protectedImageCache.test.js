import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { loadModule } from './loadModule.js';

test('private photos survive remounts, never mix accounts, and clear at logout', async () => {
  const files = new Map();
  let downloads = 0;
  class Directory {
    constructor(...parts) { this.uri = parts.map((part) => part.uri || part).join('/'); }
    create() {}
    get exists() { return [...files.keys()].some((path) => path.startsWith(`${this.uri}/`)); }
    delete() { for (const path of files.keys()) if (path.startsWith(`${this.uri}/`)) files.delete(path); }
  }
  class File {
    constructor(...parts) { this.uri = parts.map((part) => part.uri || part).join('/'); }
    get exists() { return files.has(this.uri); }
    delete() { files.delete(this.uri); }
    async move(destination) { files.set(destination.uri, files.get(this.uri)); files.delete(this.uri); }
    async copy(destination) { files.set(destination.uri, files.get(this.uri) || 'uploaded'); }
    static async downloadFileAsync(uri, destination, options) {
      downloads++;
      assert.match(options.headers.Authorization, /^Bearer /);
      files.set(destination.uri, uri);
      return destination;
    }
  }
  const cache = loadModule('../src/services/storage/protectedImageCache.js', {
    'expo-file-system': { Directory, File, Paths: { document: 'file://private' } },
    'expo-crypto': { CryptoDigestAlgorithm: { SHA256: 'SHA256' }, digestStringAsync: async (_, value) => createHash('sha256').update(value).digest('hex') },
    'react-native': { Platform: { OS: 'android' } },
  });
  const uri = 'https://example.test/api/meal-posts/7/image';
  const first = await cache.cachedProtectedImage(uri, 'Bearer member-a');
  assert.equal((await cache.cachedProtectedImage(uri, 'Bearer member-a')).uri, first.uri);
  assert.equal(downloads, 1);
  assert.notEqual((await cache.cachedProtectedImage(uri, 'Bearer member-b')).uri, first.uri);
  assert.equal(downloads, 2);
  await cache.clearProtectedImageCache();
  await cache.cachedProtectedImage(uri, 'Bearer member-a');
  assert.equal(downloads, 3);
});

test('a just-uploaded meal image is copied into its authenticated cache key', async () => {
  const files = new Map([['file://uploaded', 'photo']]);
  let downloads = 0;
  class Directory { constructor(...parts) { this.uri = parts.map((part) => part.uri || part).join('/'); } create() {} }
  class File {
    constructor(...parts) { this.uri = parts.map((part) => part.uri || part).join('/'); }
    get exists() { return files.has(this.uri); }
    async copy(to) { files.set(to.uri, files.get(this.uri)); }
    static async downloadFileAsync() { downloads++; throw Error('Should not download'); }
  }
  const cache = loadModule('../src/services/storage/protectedImageCache.js', {
    'expo-file-system': { Directory, File, Paths: { document: 'file://private' } },
    'expo-crypto': { CryptoDigestAlgorithm: { SHA256: 'SHA256' }, digestStringAsync: async (_, value) => createHash('sha256').update(value).digest('hex') },
    'react-native': { Platform: { OS: 'android' } },
  });
  const remote = 'https://example.test/api/meal-posts/8/image';
  await cache.primeProtectedImageCache(remote, 'Bearer member-a', 'file://uploaded');
  const result = await cache.cachedProtectedImage(remote, 'Bearer member-a');
  assert.equal(files.get(result.uri), 'photo');
  assert.equal(downloads, 0);
});
