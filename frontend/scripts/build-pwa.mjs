import { createHash } from 'node:crypto';
import { readFile, writeFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
const api = process.env.EXPO_PUBLIC_WEB_API_URL || process.env.EXPO_PUBLIC_API_URL;
if (api && !api.startsWith('https://')) throw new Error('Production PWA builds require an HTTPS EXPO_PUBLIC_WEB_API_URL.');
let html = await readFile(path.join(output, 'index.html'), 'utf8');
const tags = `<link rel="manifest" href="/manifest.webmanifest" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
<meta name="theme-color" content="#002E36" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Mr_Care" />
<style>html,body,#root{height:100%;min-height:100dvh}body{overscroll-behavior-y:none}input,textarea{font-size:max(16px,1em)}</style>`;
html = html.replace('</head>', `${tags}
</head>`);
html = html.replace(/<meta name="viewport"[^>]*>/, '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />');
await writeFile(path.join(output, 'index.html'), html);
const files = [];
async function walk(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, item.name);
    if (item.isDirectory()) await walk(absolute);
    else {
      const relative = path.relative(output, absolute).split(path.sep).join('/');
      if (!relative.endsWith('.map') && !['service-worker.js', '_headers', '_redirects', 'vercel.json'].includes(relative)) files.push(relative);
    }
  }
}
await walk(output);
for (const required of ['manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png']) await access(path.join(output, required));
const digest = createHash('sha256');
for (const file of files.sort()) { digest.update(file); digest.update(await readFile(path.join(output, file))); }
const version = digest.digest('hex').slice(0, 16);
const template = await readFile(path.join(root, 'pwa/service-worker.template.js'), 'utf8');
await writeFile(path.join(output, 'service-worker.js'), template.replace('__BUILD_CACHE__', `mr-care-shell-${version}`)
  .replace('/* PRECACHE */ []', JSON.stringify(files.map((file) => `/${file}`))));
await writeFile(path.join(output, '_headers'), `/service-worker.js
  Cache-Control: no-cache
  Service-Worker-Allowed: /
/index.html
  Cache-Control: no-cache
/manifest.webmanifest
  Content-Type: application/manifest+json
  Cache-Control: no-cache
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
`);
await writeFile(path.join(output, '_redirects'), '/* /index.html 200\n');
console.log(`PWA ready: ${files.length} public files precached; version ${version}. Deploy frontend/dist over HTTPS.`);
