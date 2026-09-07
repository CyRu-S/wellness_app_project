import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { request } from '../api/client';

let session = null;
let operations = Promise.resolve();
let nativeModule;
const exclusive = (work) => {
  const result = operations.then(work, work);
  operations = result.catch(() => {});
  return result;
};
export const pushSupport = () => {
  if (Platform.OS !== 'android') return 'Phone push notifications are currently available in the Android app only.';
  if (Constants.executionEnvironment === 'storeClient') return 'Push notifications require the Mr_Care development build, not Expo Go.';
  if (!(Constants.easConfig?.projectId || Constants.expoConfig?.extra?.eas?.projectId)) return 'An Expo project ID must be configured before enabling push notifications.';
  return null;
};
export async function notificationModule() {
  if (pushSupport()) return null;
  // Never load remote-notification APIs inside Expo Go or on web.
  if (!nativeModule) nativeModule = require('expo-notifications');
  return nativeModule;
}
export function beginPushSession(authToken, userId) {
  session = { authToken, userId: String(userId), registrationId: Crypto.randomUUID(), expoToken: null, stopped: false };
  return session;
}
const headers = (s) => ({ Authorization: `Bearer ${s.authToken}` });
async function withTokenTimeout(promise) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Phone notification registration timed out. Check your internet connection and retry.')), 15000);
    })]);
  } finally { clearTimeout(timer); }
}
async function unregister(s) {
  if (!s?.expoToken) return;
  await request('/notifications/devices/unregister', { method: 'POST', headers: headers(s),
    body: JSON.stringify({ token: s.expoToken, registrationId: s.registrationId }) });
  s.expoToken = null;
}
export function syncPushRegistration(s, askPermission = false, devicePushToken) {
  return exclusive(async () => {
    if (s.stopped || session !== s) return { status: 'idle' };
    const unsupported = pushSupport();
    if (unsupported) return { status: 'unsupported', message: unsupported };
    const Notifications = await notificationModule();
    for (const [id, name] of [['meal-reminders', 'Meal reminders'], ['coach-nudges', 'Coach nudges']]) {
      await Notifications.setNotificationChannelAsync(id, { name, importance: Notifications.AndroidImportance.HIGH, sound: 'default' });
    }
    let permission = await Notifications.getPermissionsAsync();
    if (!permission.granted && askPermission && permission.canAskAgain) permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) {
      await unregister(s);
      return { status: permission.canAskAgain ? 'disabled' : 'denied', message: 'Allow notifications in Android settings to receive reminders and coach nudges.' };
    }
    const projectId = Constants.easConfig?.projectId || Constants.expoConfig?.extra?.eas?.projectId;
    const { data } = await withTokenTimeout(Notifications.getExpoPushTokenAsync({ projectId, ...(devicePushToken ? { devicePushToken } : {}) }));
    if (s.stopped || session !== s) return { status: 'idle' };
    if (s.expoToken && s.expoToken !== data) await unregister(s);
    // Retain the token even on an ambiguous timeout so logout can revoke a registration that reached the server.
    s.expoToken = data;
    await request('/notifications/devices', { method: 'PUT', headers: headers(s),
      body: JSON.stringify({ token: data, registrationId: s.registrationId }) });
    if (s.stopped || session !== s) { await unregister(s); return { status: 'idle' }; }
    return { status: 'enabled', message: 'This Android phone is registered for notifications.' };
  });
}
export async function revokePushBeforeLogout(authToken) {
  const s = session;
  if (!s || s.authToken !== authToken) return;
  // Serialize behind an in-flight registration. On failure keep the user signed in so they can retry safely.
  s.stopped = true;
  try { await exclusive(() => unregister(s)); }
  catch (error) { s.stopped = false; throw error; }
}
export function endPushSession(s) {
  s.stopped = true;
  if (session === s) session = null;
  return exclusive(() => unregister(s));
}
export function isOwnNotification(notification, userId) {
  return String(notification?.request?.content?.data?.userId || '') === String(userId);
}
