import { request } from '../api/client';
import { isInstalled, isIOS, registerPwa, bindPushAccount, pendingPushTap, clearPushTap } from '../pwa/registration';
import { readEncryptedJson, writeEncryptedJson, removeEncryptedPrefix } from '../storage/encryptedStorage';

const BINDING_KEY = 'mr-care.web-push.binding';
let session;
let operations = Promise.resolve();
const exclusive = (work) => {
  const result = operations.then(work, work); operations = result.catch(() => {}); return result;
};
const headers = (s) => ({ Authorization: `Bearer ${s.authToken}` });
export const pushSupport = () => {
  if (typeof window === 'undefined' || !globalThis.isSecureContext) return 'Web notifications require an HTTPS website.';
  if (isIOS() && !isInstalled()) return 'Add Mr_Care to your Home Screen, open it from its icon, then enable notifications. Requires iOS 16.4 or later.';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'This browser does not support web notifications. The notification inbox is still available.';
  return null;
};
// Called directly by the button's click handler, before any await, to preserve iOS user activation.
export function requestPushPermission() {
  const unsupported = pushSupport();
  if (unsupported) return Promise.resolve(false);
  return Notification.requestPermission().then((permission) => permission === 'granted');
}
export function beginPushSession(authToken, userId) {
  session = { authToken, userId: String(userId), registrationId: crypto.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => { const value = crypto.getRandomValues(new Uint8Array(1))[0] % 16; return (character === 'x' ? value : (value & 3) | 8).toString(16); }), subscription: null, stopped: false };
  return session;
}
const applicationServerKey = (value) => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')), (character) => character.charCodeAt(0));
async function unregister(s) {
  if (!s.subscription) return;
  await request('/notifications/web/subscriptions/unregister', { method: 'POST', headers: headers(s),
    body: JSON.stringify({ endpoint: s.subscription.endpoint, registrationId: s.registrationId }) });
}
export function syncPushRegistration(s) {
  return exclusive(async () => {
    if (s.stopped || session !== s) return { status: 'idle' };
    const unsupported = pushSupport();
    if (unsupported) return { status: 'unsupported', message: unsupported };
    if (Notification.permission !== 'granted') {
      await unregister(s);
      return { status: Notification.permission === 'denied' ? 'denied' : 'disabled', message: Notification.permission === 'denied'
        ? 'Allow notifications for Mr_Care in your device or browser settings, then try again.' : 'Tap Enable web notifications to allow reminders on this device.' };
    }
    const config = await request('/notifications/web/config', { headers: headers(s), cachePolicy: 'network-only' });
    if (!config.available || !config.publicKey) return { status: 'disabled', message: 'Web notification delivery is not enabled on the server yet.' };
    const registration = await registerPwa();
    const binding = await readEncryptedJson(BINDING_KEY);
    if (binding?.userId === s.userId && binding.registrationId) s.registrationId = binding.registrationId;
    let subscription = await registration.pushManager.getSubscription();
    const key = applicationServerKey(config.publicKey);
    const existingKey = subscription?.options?.applicationServerKey;
    if (subscription && existingKey && (existingKey.byteLength !== key.byteLength
        || !Array.from(new Uint8Array(existingKey)).every((value, index) => value === key[index]))) {
      s.subscription = subscription; await unregister(s); await subscription.unsubscribe(); subscription = null;
    }
    if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    if (s.stopped || session !== s) return { status: 'idle' };
    s.subscription = subscription;
    const json = subscription.toJSON();
    if (!json.keys?.p256dh || !json.keys?.auth) throw new Error('This browser returned an incomplete notification subscription.');
    await writeEncryptedJson(BINDING_KEY, { userId: s.userId, registrationId: s.registrationId });
    // Bind the worker before registering the server to avoid dropping the first arriving message.
    await bindPushAccount({ userId: s.userId, registrationId: s.registrationId });
    await request('/notifications/web/subscriptions', { method: 'PUT', headers: headers(s), body: JSON.stringify({
      endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, registrationId: s.registrationId,
    }) });
    if (s.stopped || session !== s) { await unregister(s); return { status: 'idle' }; }
    return { status: 'enabled', message: 'Web notifications are enabled on this device.' };
  });
}
async function clearBinding(s) {
  try {
    const result = await bindPushAccount({ clear: true, userId: s.userId, registrationId: s.registrationId });
    if (result?.cleared) {
      await s.subscription?.unsubscribe();
      await removeEncryptedPrefix(BINDING_KEY);
    }
  } catch { /* Service worker may already be gone after uninstall. */ }
}
export async function revokePushBeforeLogout(authToken) {
  const s = session; if (!s || s.authToken !== authToken) return;
  s.stopped = true;
  try { await exclusive(async () => { await unregister(s); await clearBinding(s); }); }
  catch (error) { s.stopped = false; throw error; }
}
export function endPushSession(s) {
  s.stopped = true; if (session === s) session = null;
  return exclusive(async () => { try { await unregister(s); } finally { await clearBinding(s); } });
}
export function isOwnNotification(notification, userId) {
  const data = notification?.request?.content?.data;
  return String(data?.userId || '') === String(userId) && (!session || data?.registrationId === session.registrationId);
}
const notification = (data, title, body) => ({ request: { identifier: String(data.notificationId), content: { title, body, data } } });
const fromUrl = () => {
  const params = new URL(window.location.href).searchParams;
  if (params.get('webPush') !== '1') return null;
  return { notification: notification(Object.fromEntries(['notificationId', 'userId', 'registrationId', 'kind'].map((key) => [key, params.get(key)]))) };
};
const listener = (type, callback) => {
  const receive = (event) => {
    if (event.data?.type !== type) return;
    const item = notification(event.data.data, event.data.title, event.data.body);
    callback(type === 'WEB_PUSH_TAP' ? { notification: item } : item);
  };
  navigator.serviceWorker.addEventListener('message', receive);
  return { remove: () => navigator.serviceWorker.removeEventListener('message', receive) };
};
export async function notificationModule() {
  if (pushSupport()) return null;
  const binding = await readEncryptedJson(BINDING_KEY);
  if (session && binding?.userId === session.userId && binding.registrationId) session.registrationId = binding.registrationId;
  const pending = await pendingPushTap().catch(() => ({ data: null }));
  let lastResponse = fromUrl() || (pending.data ? { notification: notification(pending.data) } : null);
  return {
    setNotificationHandler: () => {},
    addNotificationReceivedListener: (callback) => listener('WEB_PUSH_RECEIVED', callback),
    addNotificationResponseReceivedListener: (callback) => listener('WEB_PUSH_TAP', (response) => { lastResponse = response; callback(response); }),
    addPushTokenListener: () => ({ remove: () => {} }),
    getLastNotificationResponse: () => lastResponse,
    clearLastNotificationResponse: () => {
      const data = lastResponse?.notification?.request?.content?.data;
      lastResponse = null;
      if (data) clearPushTap(data).catch(() => {});
      const url = new URL(window.location.href);
      ['webPush', 'notificationId', 'userId', 'registrationId', 'kind'].forEach((key) => url.searchParams.delete(key));
      window.history.replaceState(window.history.state, '', url);
    },
  };
}
