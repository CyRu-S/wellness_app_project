import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { cacheVersion, invalidateCachedResponses, readCachedResponse, saveCachedResponse } from './responseCache';

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

// Share simultaneous reads (focus + live sync). Authenticated GETs use a
// short-lived, account-scoped disk cache; data-changing writes invalidate it.
const inFlightReads = new Map();
let readGeneration = 0;

export function request(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const isRead = method === 'GET';
  const mutatesData = !isRead && path !== '/meals/analyze';
  const cacheable = isRead && !options.signal && options.cachePolicy !== 'network-only';
  if (mutatesData) { readGeneration += 1; inFlightReads.clear(); invalidateCachedResponses(); }
  if (cacheable) {
    const key = JSON.stringify([readGeneration, path, options.headers || {}, options.cachePolicy || 'default']);
    if (inFlightReads.has(key)) return inFlightReads.get(key);
    const promise = (async () => {
      const version = cacheVersion();
      const authorization = options.headers?.Authorization;
      const cached = await readCachedResponse(path, authorization);
      if (version === cacheVersion() && cached.hit && (options.cachePolicy === 'stale-ok' || !cached.stale)) return cached.value;
      try {
        const value = await performRequest(path, options);
        await saveCachedResponse(path, authorization, value, version);
        return value;
      } catch (error) {
        // Preserve already-fetched read-only data through a cold start or outage.
        // Mutations and explicit authentication checks never use this fallback.
        if (cached.hit && version === cacheVersion() && (error.status === undefined || [429, 502, 503, 504].includes(error.status))) return cached.value;
        throw error;
      }
    })().finally(() => {
      if (inFlightReads.get(key) === promise) inFlightReads.delete(key);
    });
    inFlightReads.set(key, promise);
    return promise;
  }
  return performRequest(path, options).finally(() => {
    if (mutatesData) { readGeneration += 1; inFlightReads.clear(); invalidateCachedResponses(); }
  });
}

export { invalidateCachedResponses };

async function performRequest(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  for (let attempt = 0; attempt < (method === 'GET' ? 2 : 1); attempt += 1) {
    try { return await performOnce(path, options); }
    catch (error) {
      const retryable = error.message?.startsWith('Request timed out') || error.name === 'TypeError'
        || [429, 502, 503, 504].includes(error.status);
      if (attempt > 0 || method !== 'GET' || !retryable || options.signal?.aborted) throw error;
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }
  return null;
}

async function performOnce(path, options = {}) {
  const controller = new AbortController();
  const upstreamSignal = options.signal;
  const timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : API_TIMEOUT_MS;
  let timedOut = false;
  const abortRequest = () => controller.abort();
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  if (upstreamSignal?.aborted) abortRequest();
  else upstreamSignal?.addEventListener?.('abort', abortRequest);

  try {
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const fetchOptions = { ...options };
    delete fetchOptions.cachePolicy;
    delete fetchOptions.timeoutMs;
    const response = await fetch(`${API_URL}${path}`, {
      ...fetchOptions,
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
    if (timedOut) throw new Error(`Request timed out after ${timeoutMs / 1000} seconds`);
    throw error;
  } finally {
    clearTimeout(timeoutId);
    upstreamSignal?.removeEventListener?.('abort', abortRequest);
  }
}
