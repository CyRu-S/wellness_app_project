import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validatePwaApi } from './pwa-config.mjs';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('..', import.meta.url));
// Validate the same dotenv values Expo will inline, before producing a deployable bundle.
process.env.NODE_ENV = 'production';
require('@expo/env').load(root, { silent: true });
validatePwaApi(process.env);
const result = spawnSync(process.execPath, [require.resolve('expo/bin/cli'), 'export', '--platform', 'web'],
  { cwd: root, env: process.env, stdio: 'inherit' });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
await import('./build-pwa.mjs');
await import('./verify-pwa.mjs');
