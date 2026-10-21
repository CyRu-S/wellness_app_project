import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { translateUiText } from '../src/i18n/displayTranslations.js';

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory()
    ? files(path.join(directory, entry.name))
    : /\.(?:js|jsx)$/.test(entry.name) ? [path.join(directory, entry.name)] : []))).flat();
}

const sourceFiles = (await Promise.all(['src/screens', 'src/components'].map((directory) => files(path.resolve(directory))))).flat();
const missing = new Set();
const intentional = new Set(['Mr_Care', 'you@example.com']);
for (const filename of sourceFiles) {
  const source = await readFile(filename, 'utf8');
  if (/\bText\b/.test(source) && !/LocalizedText/.test(source)) throw new Error(`Screen bypasses localized text: ${filename}`);
  for (const match of source.matchAll(/<Text\b[^>]*>([^<{][^<{]*?)<\/Text>/g)) {
    const text = match[1].trim();
    if (/[A-Za-z]{2}/.test(text) && !intentional.has(text) && translateUiText('te', text) === text) missing.add(text);
  }
  for (const match of source.matchAll(/\bplaceholder=(['"])(.*?)\1/g)) {
    const text = match[2].trim();
    if (/[A-Za-z]{2}/.test(text) && !intentional.has(text) && translateUiText('te', text) === text) missing.add(text);
  }
}
if (missing.size) {
  console.log([...missing].sort().join('\n'));
  process.exitCode = 2;
} else console.log(`All ${sourceFiles.length} screen/component files use localized text and their fixed labels have Telugu copy.`);
