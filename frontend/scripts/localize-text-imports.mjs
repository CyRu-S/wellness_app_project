import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('src');
const targets = [path.join(root, 'screens'), path.join(root, 'components')];

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => entry.isDirectory()
    ? files(path.join(directory, entry.name))
    : /\.(?:js|jsx)$/.test(entry.name) ? [path.join(directory, entry.name)] : []));
  return nested.flat();
}

for (const filename of (await Promise.all(targets.map(files))).flat()) {
  if (filename.endsWith(`${path.sep}LocalizedText.jsx`)) continue;
  const source = await readFile(filename, 'utf8');
  let needsText = false;
  let needsInput = false;
  const rewritten = source.replace(/import\s*\{([\s\S]*?)\}\s*from\s*(['"])react-native\2;/g, (statement, names, quote) => {
    const imports = names.split(',').map((name) => name.trim()).filter(Boolean).filter((name) => {
      if (name === 'Text') { needsText = true; return false; }
      if (name === 'TextInput') { needsInput = true; return false; }
      return true;
    });
    return imports.length ? `import { ${imports.join(', ')} } from ${quote}react-native${quote};` : '';
  });
  if (!needsText && !needsInput) continue;
  let relative = path.relative(path.dirname(filename), path.join(root, 'components', 'common', 'LocalizedText')).replaceAll('\\', '/');
  if (!relative.startsWith('.')) relative = `./${relative}`;
  const names = [needsText ? 'LocalizedText as Text' : '', needsInput ? 'LocalizedTextInput as TextInput' : ''].filter(Boolean).join(', ');
  await writeFile(filename, `import { ${names} } from '${relative}';\n${rewritten}`, 'utf8');
}
