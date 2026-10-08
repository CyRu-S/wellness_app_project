import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const root = new URL('../dist/', import.meta.url);
const read = (name, encoding = 'utf8') => readFile(new URL(name, root), encoding);
const html = await read('index.html');
assert.match(html, /viewport-fit=cover/);
assert.match(html, /apple-mobile-web-app-capable" content="yes/);
assert.match(html, /font-size:max\(16px,1em\)!important/);
assert.equal((html.match(/rel="manifest"/g) || []).length, 1);
assert.equal((html.match(/rel="apple-touch-icon"/g) || []).length, 1);
const manifest = JSON.parse(await read('manifest.webmanifest'));
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.start_url, '/');
assert.equal(manifest.scope, '/');
assert.equal(manifest.id, '/');
for (const icon of [...manifest.icons, { src: '/icons/apple-touch-icon.png', sizes: '180x180' }]) {
  const png = await read(icon.src.slice(1), null);
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, icon.sizes);
}
const worker = await read('service-worker.js');
assert.doesNotMatch(worker, /__BUILD_CACHE__|\/\* PRECACHE \*\//);
assert.match(worker, /mr-care-shell-[a-f0-9]{16}/);
const assets = JSON.parse(worker.match(/const ASSETS = (\[.*\]);/)[1]);
for (const asset of assets) {
  assert.ok(asset.startsWith('/') && !asset.startsWith('/api/') && !asset.includes('..'));
  assert.equal((await stat(new URL(asset.slice(1), root))).isFile(), true, `Missing precache file: ${asset}`);
}
for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  const value = match[1];
  if (value.startsWith('/') && !value.startsWith('//')) assert.ok(assets.includes(value), `Uncached shell resource: ${value}`);
}
const headers = await read('_headers');
assert.match(headers, /\/service-worker\.js\s+Cache-Control: no-cache\s+Service-Worker-Allowed: \//);
assert.match(headers, /Content-Type: application\/manifest\+json/);
assert.match(await read('_redirects'), /\/\* \/index\.html 200/);
const expectedApi = process.env.EXPO_PUBLIC_WEB_API_URL || process.env.EXPO_PUBLIC_API_URL;
if (expectedApi) {
  const scripts = assets.filter((name) => name.includes('/js/web/') && name.endsWith('.js'));
  const sources = await Promise.all(scripts.map((name) => read(name.slice(1))));
  assert.ok(sources.some((source) => source.includes(expectedApi.replace(/\/+$/, ''))), 'Expected API was not embedded in the web bundle');
}
console.log(`PWA artifact verified: ${assets.length} precache files, install metadata, iOS icons, routes and worker headers${expectedApi ? ', configured API' : ''}.`);
