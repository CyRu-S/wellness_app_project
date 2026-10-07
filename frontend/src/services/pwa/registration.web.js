let registration;
export function isInstalled() {
  return typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true);
}
export function isIOS() {
  return typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
}
export function registerPwa() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || !globalThis.isSecureContext)
    return Promise.reject(new Error('Installable web apps require HTTPS and service worker support.'));
  if (!registration) registration = navigator.serviceWorker.register('/service-worker.js', { scope: '/', updateViaCache: 'none' })
    .then(async () => {
      let timer;
      try { return await Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('The web app is still preparing. Try again shortly.')), 15000);
      })]); } finally { clearTimeout(timer); }
    }).catch((error) => { registration = null; throw error; });
  return registration;
}
async function workerMessage(type, context) {
  const worker = (await registerPwa()).active;
  if (!worker) throw new Error('The web app is not ready yet.');
  return await new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => { channel.port1.close(); reject(new Error('Could not secure this notification session. Try again.')); }, 5000);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer); channel.port1.close();
      if (event.data?.ok) resolve(event.data); else reject(new Error('Could not save this notification session.'));
    };
    worker.postMessage({ type, context }, [channel.port2]);
  });
}

export const bindPushAccount = (context) => workerMessage('SET_PUSH_ACCOUNT', context);
export const pendingPushTap = () => workerMessage('GET_PENDING_PUSH_TAP');
export const clearPushTap = (context) => workerMessage('CLEAR_PENDING_PUSH_TAP', context);
