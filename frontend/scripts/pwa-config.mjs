export function validatePwaApi(env) {
  const api = env.EXPO_PUBLIC_WEB_API_URL || env.EXPO_PUBLIC_API_URL;
  let url;
  try { url = new URL(api); } catch { /* Report the configuration requirement below. */ }
  if (!url || url.protocol !== 'https:' || url.username || url.password
      || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      || url.search || url.hash || !/\/api\/?$/.test(url.pathname)) {
    throw new Error('Set EXPO_PUBLIC_WEB_API_URL to the public HTTPS backend URL ending in /api before building the PWA.');
  }
  return api;
}
