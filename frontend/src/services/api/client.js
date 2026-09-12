import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getExpoHost = () => {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return null;

  try {
    return new URL(hostUri.includes('://') ? hostUri : `http://${hostUri}`).hostname;
  } catch {
    return null;
  }
};

const getNativeApiUrl = () => {
  // An explicit value is still useful for production builds. During local Expo
  // development, the Metro host follows the computer's current LAN address.
  if (process.env.EXPO_PUBLIC_MOBILE_API_URL) return process.env.EXPO_PUBLIC_MOBILE_API_URL;

  const expoHost = getExpoHost();
  if (expoHost) {
    const port = process.env.EXPO_PUBLIC_API_PORT || '8080';
    return `http://${expoHost}:${port}/api`;
  }

  return process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8080/api';
};

export const API_URL = Platform.OS === 'web'
  ? process.env.EXPO_PUBLIC_WEB_API_URL || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api'
  : getNativeApiUrl();
const configuredTimeout = Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS);
const API_TIMEOUT_MS = Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 20000;

// Share simultaneous reads (focus + live sync), but never cache settled data or
// replay a write. A write invalidates older reads for subsequent callers.
const inFlightReads = new Map();
let readGeneration = 0;

export function request(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const isRead = method === 'GET';
  if (!isRead) { readGeneration += 1; inFlightReads.clear(); }
  if (isRead && !options.signal) {
    const key = JSON.stringify([readGeneration, path, options.headers || {}]);
    if (inFlightReads.has(key)) return inFlightReads.get(key);
    const promise = performRequest(path, options).finally(() => {
      if (inFlightReads.get(key) === promise) inFlightReads.delete(key);
    });
    inFlightReads.set(key, promise);
    return promise;
  }
  return performRequest(path, options).finally(() => {
    if (!isRead) { readGeneration += 1; inFlightReads.clear(); }
  });
}

async function performRequest(path, options = {}) {
  const controller = new AbortController();
  const upstreamSignal = options.signal;
  let timedOut = false;
  const abortRequest = () => controller.abort();
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, API_TIMEOUT_MS);

  if (upstreamSignal?.aborted) abortRequest();
  else upstreamSignal?.addEventListener?.('abort', abortRequest);

  try {
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { ...(isFormData ? {} : { 'Content-Type': 'application/json' }), ...options.headers },
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({ message: 'Request failed' }));
      const error = new Error(payload.message || `Request failed (${response.status})`);
      error.status = response.status;
      throw error;
    }
    if (response.status === 204) return null;
    const body = await response.text();
    return body ? JSON.parse(body) : null;
  } catch (error) {
    if (timedOut) throw new Error(`Request timed out after ${API_TIMEOUT_MS / 1000} seconds`);
    throw error;
  } finally {
    clearTimeout(timeoutId);
    upstreamSignal?.removeEventListener?.('abort', abortRequest);
  }
}
