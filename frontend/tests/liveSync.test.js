import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './loadModule.js';

test('idle presence heartbeat does not continuously fetch notifications or page data', async () => {
  const requests = [], actions = [], effects = [];
  let heartbeat, changed, cleanup;
  const hook = loadModule('../src/hooks/useLiveSync.js', {
    react: { useEffect: (effect) => effects.push(effect) },
    'react-native': { AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) } },
    'react-redux': { useDispatch: () => (action) => { actions.push(action); }, useSelector: (fn) => fn({ auth: { token: 'jwt' } }) },
    '../store/slices/notificationSlice': { loadNotifications: () => ({ type: 'notifications/load' }) },
    '../store/slices/authSlice': { validateRestoredSession: () => ({ type: 'auth/validate' }) },
    '../services/api/client': { request: async (...args) => { requests.push(args); }, refreshPageResponses() {} },
    '../services/api/liveUpdates': { subscribeLiveUpdates: (_, callback) => { changed = callback; return () => {}; } },
  }, { setInterval: (fn) => { heartbeat = fn; return 1; }, clearInterval() {} }).default;
  hook(); cleanup = effects[0]();
  await new Promise((resolve) => setImmediate(resolve));
  const before = actions.length;
  await heartbeat(); await heartbeat();
  assert.equal(actions.length, before, 'unchanged idle screens must not dispatch read actions');
  assert.ok(requests.every(([path]) => path === '/presence'));
  changed(); assert.equal(actions.length, before + 1);
  assert.equal(actions.at(-1).type, 'notifications/load');
  cleanup();
});
