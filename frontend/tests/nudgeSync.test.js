import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './loadModule.js';

test('nudge state synchronizes only for the visible member and stops in background or after leaving', async () => {
  const actions = [];
  let timer, cleanup, foreground, removed = false, cleared = false;
  const AppState = { currentState: 'active', addEventListener: (_event, handler) => {
    foreground = handler; return { remove: () => { removed = true; } };
  } };
  const { default: useSync } = loadModule('../src/hooks/useNudgeSync.js', {
    react: { useCallback: (value) => value },
    'react-native': { AppState },
    '@react-navigation/native': { useFocusEffect: (effect) => { cleanup = effect(); } },
    'react-redux': { useDispatch: () => async (action) => { actions.push(action); } },
    '../store/slices/adminSlice': { loadAdminAttention: () => ({ type: 'admin' }) },
    '../store/slices/memberAccessSlice': { syncSharedMemberAttention: (id) => ({ type: 'shared', id }) },
  }, { setInterval: (callback, delay) => { timer = callback; assert.equal(delay, 5000); return 1; },
    clearInterval: () => { cleared = true; } });
  useSync(2, true); await Promise.resolve();
  assert.equal(actions.length, 1); assert.equal(actions[0].id, 2);
  AppState.currentState = 'background'; await timer();
  assert.equal(actions.length, 1);
  AppState.currentState = 'active'; foreground('active'); await Promise.resolve();
  assert.equal(actions.length, 2);
  cleanup(); await timer();
  assert.equal(actions.length, 2); assert.equal(removed, true); assert.equal(cleared, true);
});
