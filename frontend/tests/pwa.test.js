import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { webcrypto, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { loadModule, deferred } from './loadModule.js';
import { browserStorage } from './browserStorageHelpers.js';

test('web sessions and page data persist as ciphertext and are cleared on logout', async () => {
  const storage = browserStorage();
  const make = () => loadModule('../src/services/storage/encryptedStorage.web.js', {}, {
    ...storage, crypto: webcrypto, TextEncoder, TextDecoder,
  });
  const first = make();
  await first.writeEncryptedJson('mr-care.session.v1', { token: 'private-jwt', user: { id: 7, status: 'ACTIVE' } });
  await first.writeEncryptedJson('mr-care.api-cache.v2:member', { meal: 'private-meal' });
  const records = storage.databases.get('mr-care-private-v1').get('records');
  assert.equal(records.get('__encryption_key__').extractable, false);
  assert.equal(JSON.stringify(records.get('mr-care.session.v1')).includes('private-jwt'), false);
  assert.equal((await make().readEncryptedJson('mr-care.session.v1')).token, 'private-jwt');
  await first.clearEncryptedData();
  assert.equal(records.size, 0);
  assert.equal(await make().readEncryptedJson('mr-care.session.v1'), null);
});

function pushHarness({ permission = 'default', installed = true, ios = true, registerGate } = {}) {
  const calls = [], bindings = []; let prompts = 0;
  const started = deferred();
  const subscription = { endpoint: 'https://web.push.apple.com/test', options: {},
    toJSON: () => ({ endpoint: 'https://web.push.apple.com/test', keys: { p256dh: 'public-key', auth: 'auth-key' } }), unsubscribe: async () => { calls.push('unsubscribe'); } };
  const Notification = { permission, requestPermission: () => { prompts += 1; Notification.permission = 'granted'; return Promise.resolve('granted'); } };
  const push = loadModule('../src/services/notifications/pushNotifications.web.js', {
    '../api/client': { request: async (path, options) => {
      calls.push({ path, options });
      if (path.endsWith('/config')) return { available: true, publicKey: Buffer.from([4, 1, 2]).toString('base64url') };
      if (path.endsWith('/subscriptions')) { started.resolve(); if (registerGate) await registerGate.promise; }
    } },
    '../pwa/registration': { isInstalled: () => installed, isIOS: () => ios,
      registerPwa: async () => ({ pushManager: { getSubscription: async () => subscription } }),
      pendingPushTap: async () => ({ data: null }), clearPushTap: async () => {},
      bindPushAccount: async (context) => { bindings.push(context); return { cleared: true }; } },
    '../storage/encryptedStorage': { readEncryptedJson: async () => null, writeEncryptedJson: async () => {}, removeEncryptedPrefix: async () => {} },
  }, { window: { PushManager: {}, Notification }, navigator: { serviceWorker: {} }, Notification,
    crypto: { randomUUID }, isSecureContext: true, atob: (value) => Buffer.from(value, 'base64').toString('binary') });
  return { push, calls, bindings, started, prompts: () => prompts, Notification };
}

test('iPhone browser tabs show install guidance and never request notification permission automatically', async () => {
  const { push, calls, prompts } = pushHarness({ installed: false });
  const result = await push.syncPushRegistration(push.beginPushSession('jwt', 7));
  assert.equal(result.status, 'unsupported'); assert.match(result.message, /Home Screen/);
  assert.equal(prompts(), 0); assert.equal(calls.length, 0);
});

test('installed web push permission comes from the button and logout revokes the browser subscription', async () => {
  const { push, calls, bindings, prompts } = pushHarness();
  const session = push.beginPushSession('jwt', 7);
  assert.equal((await push.syncPushRegistration(session)).status, 'disabled'); assert.equal(prompts(), 0);
  const permission = push.requestPushPermission();
  assert.equal(prompts(), 1, 'permission must be invoked synchronously during the user gesture');
  await permission;
  assert.equal((await push.syncPushRegistration(session)).status, 'enabled');
  assert.equal(calls.find((call) => call.path?.endsWith('/subscriptions')).options.headers.Authorization, 'Bearer jwt');
  assert.equal(bindings[0].userId, '7');
  await push.revokePushBeforeLogout('jwt');
  assert.ok(calls.some((call) => call.path?.endsWith('/unregister'))); assert.ok(calls.includes('unsubscribe'));
  assert.equal(bindings.at(-1).clear, true);
});

test('a logout waits for a pending web registration before revoking it', async () => {
  const gate = deferred();
  const { push, calls, started } = pushHarness({ permission: 'granted', registerGate: gate });
  const session = push.beginPushSession('jwt', 7);
  const registering = push.syncPushRegistration(session);
  await started.promise;
  const logout = push.revokePushBeforeLogout('jwt');
  gate.resolve();
  await Promise.all([registering, logout]);
  assert.equal(session.stopped, true);
  assert.ok(calls.some((call) => call.path?.endsWith('/unregister')));
});

function workerHarness() {
  const listeners = {}, shown = [], intercepted = [], messages = [];
  const { indexedDB } = browserStorage();
  const shell = { match: async () => 'offline-shell', open: async () => ({ addAll: async () => {} }), keys: async () => [], delete: async () => true };
  const self = { location: { origin: 'https://care.example' }, clients: {
    claim: async () => {}, matchAll: async () => [{ url: 'https://care.example/', focus: async () => {}, postMessage: (message) => messages.push(message) }], openWindow: async () => {},
  }, registration: { showNotification: async (title, options) => shown.push({ title, options }) },
    addEventListener: (type, handler) => { listeners[type] = handler; }, skipWaiting: () => {} };
  const template = readFileSync(new URL('../pwa/service-worker.template.js', import.meta.url), 'utf8')
    .replace('__BUILD_CACHE__', 'mr-care-shell-test').replace('/* PRECACHE */ []', '["/index.html","/app.js"]');
  runInNewContext(template, { self, caches: shell, indexedDB, URL, setTimeout, fetch: async () => { throw new TypeError('offline'); } });
  const invoke = async (type, data = {}) => {
    let pending;
    listeners[type]({ ...data, waitUntil: (promise) => { pending = promise; }, respondWith: (promise) => intercepted.push(promise) });
    if (pending) await pending;
  };
  return { invoke, shown, intercepted, messages };
}

test('service worker leaves APIs and authenticated media uncached and serves the offline shell', async () => {
  const worker = workerHarness();
  const request = (url, mode = 'cors', authenticated = false) => ({ method: 'GET', url, mode, headers: { has: () => authenticated } });
  await worker.invoke('fetch', { request: request('https://care.example/api/dashboard') });
  await worker.invoke('fetch', { request: request('https://care.example/profile-photo', 'cors', true) });
  assert.equal(worker.intercepted.length, 0);
  await worker.invoke('fetch', { request: request('https://care.example/', 'navigate') });
  assert.equal(await worker.intercepted[0], 'offline-shell');
});

test('worker rejects stale account notifications and stale logout requests', async () => {
  const worker = workerHarness(); const replies = [];
  const account = { userId: '7', registrationId: 'current-registration' };
  await worker.invoke('message', { data: { type: 'SET_PUSH_ACCOUNT', context: account }, ports: [{ postMessage: (message) => replies.push(message) }] });
  await worker.invoke('message', { data: { type: 'SET_PUSH_ACCOUNT', context: { ...account, registrationId: 'old-registration', clear: true } }, ports: [{ postMessage: (message) => replies.push(message) }] });
  assert.equal(replies.at(-1).cleared, false);
  await worker.invoke('push', { data: { json: () => ({ body: 'Old account', data: { userId: '8', registrationId: 'current-registration' } }) } });
  assert.equal(worker.shown.length, 0);
  await worker.invoke('push', { data: { json: () => ({ body: 'A reminder', data: { ...account, notificationId: '12', kind: 'NUDGE' } }) } });
  assert.equal(worker.shown.length, 1); assert.equal(worker.shown[0].options.body, 'A reminder');
  await worker.invoke('notificationclick', { notification: { close: () => {}, data: { ...account, notificationId: '12', kind: 'NUDGE' } } });
  assert.equal(worker.messages.at(-1).type, 'WEB_PUSH_TAP');
  await worker.invoke('message', { data: { type: 'GET_PENDING_PUSH_TAP' }, ports: [{ postMessage: (message) => replies.push(message) }] });
  assert.equal(replies.at(-1).data.notificationId, '12', 'taps survive a window whose listeners are not ready yet');
  await worker.invoke('message', { data: { type: 'SET_PUSH_ACCOUNT', context: { userId: '8', registrationId: 'other' } }, ports: [] });
  await worker.invoke('message', { data: { type: 'GET_PENDING_PUSH_TAP' }, ports: [{ postMessage: (message) => replies.push(message) }] });
  assert.equal(replies.at(-1).data, null, 'pending taps are never handed to another account');
});

test('worker logout acknowledgement reaches the caller so browser unsubscribe can complete', async () => {
  const { MessageChannel } = await import('node:worker_threads');
  const registration = { active: { postMessage: (_message, ports) => { ports[0].postMessage({ ok: true, cleared: true }); ports[0].close(); } } };
  const module = loadModule('../src/services/pwa/registration.web.js', {}, {
    navigator: { serviceWorker: { register: async () => registration, ready: Promise.resolve(registration) } },
    isSecureContext: true, MessageChannel,
  });
  const result = await module.bindPushAccount({ clear: true, userId: '7', registrationId: 'lease' });
  assert.equal(result.ok, true);
  assert.equal(result.cleared, true);
});

test('web pull to refresh only fires for a vertical pull from the top of a page', () => {
  const handlers = {}; let refreshed = 0;
  const element = { contains: () => true, addEventListener: (name, handler) => { handlers[name] = handler; }, removeEventListener: () => {} };
  const react = {
    __esModule: true, default: { createElement: (type, props) => ({ type, props }) },
    useRef: (initial) => ({ current: initial === null ? element : initial }),
    useState: (initial) => [initial, () => {}], useEffect: (effect) => effect(),
  };
  // The two refs hold different kinds of values; the gesture is reset before each touch.
  const { default: Refresh } = loadModule('../src/components/common/WebPageRefresh.jsx', {
    react, 'react-native': { ActivityIndicator: 'ActivityIndicator', Pressable: 'Pressable', Text: 'Text', View: 'View', StyleSheet: { create: (value) => value } },
    '../../theme': { colors: {} },
  });
  Refresh({ enabled: true, refreshing: false, onRefresh: () => { refreshed += 1; } });
  const target = { scrollTop: 20, closest: () => null };
  const touch = (x, y) => ({ target, touches: [{ clientX: x, clientY: y }], cancelable: true, preventDefault: () => {} });
  handlers.touchstart(touch(0, 0)); handlers.touchmove(touch(0, 150)); handlers.touchend();
  assert.equal(refreshed, 0, 'scrolling partway down must not refresh');
  target.scrollTop = 0;
  handlers.touchstart(touch(0, 0)); handlers.touchmove(touch(150, 20)); handlers.touchend();
  assert.equal(refreshed, 0, 'horizontal gestures must not refresh');
  handlers.touchstart(touch(0, 0)); handlers.touchmove(touch(0, 150)); handlers.touchend();
  assert.equal(refreshed, 1);
});
