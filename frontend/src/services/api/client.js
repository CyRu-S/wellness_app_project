const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8080/api';
const configuredTimeout = Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS);
const API_TIMEOUT_MS = Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 5000;

export async function request(path, options = {}) {
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
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(payload.message || `Request failed (${response.status})`);
    }
    return response.status === 204 ? null : response.json();
  } catch (error) {
    if (timedOut) throw new Error(`Request timed out after ${API_TIMEOUT_MS / 1000} seconds`);
    throw error;
  } finally {
    clearTimeout(timeoutId);
    upstreamSignal?.removeEventListener?.('abort', abortRequest);
  }
}

