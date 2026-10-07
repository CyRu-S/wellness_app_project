// Replaced by the web export script. Never bundled into Android.
const CACHE = '__BUILD_CACHE__';
const ASSETS = /* PRECACHE */ [];
const STATIC_PATHS = new Set(ASSETS);
const PUSH_DB = 'mr-care-push-context-v1';
function contextOperation(write, value, key = 'account') {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PUSH_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('context');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('context', write ? 'readwrite' : 'readonly');
      const operation = write ? value ? transaction.objectStore('context').put(value, key) : transaction.objectStore('context').delete(key)
        : transaction.objectStore('context').get(key);
      transaction.oncomplete = () => { db.close(); resolve(operation.result); };
      transaction.onerror = () => { db.close(); reject(transaction.error); };
      transaction.onabort = () => { db.close(); reject(transaction.error); };
    };
  });
}
function updateContext(requested) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(PUSH_DB, 1);
    open.onupgradeneeded = () => open.result.createObjectStore('context');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result, transaction = db.transaction('context', 'readwrite'), store = transaction.objectStore('context');
      const get = store.get('account');
      let cleared = false;
      get.onsuccess = () => {
        if (requested?.clear) {
          const current = get.result;
          cleared = current?.userId === requested.userId && current?.registrationId === requested.registrationId;
          if (cleared) { store.delete('account'); store.delete('pendingTap'); }
        } else if (requested?.userId && requested?.registrationId) {
          store.put({ userId: String(requested.userId), registrationId: requested.registrationId }, 'account');
        } else transaction.abort();
      };
      transaction.oncomplete = () => { db.close(); resolve(cleared); };
      transaction.onerror = () => { db.close(); reject(transaction.error); };
      transaction.onabort = () => { db.close(); reject(transaction.error || new Error('Invalid binding')); };
    };
  });
}
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('mr-care-shell-') && key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') { self.skipWaiting(); return; }
  if (['GET_PENDING_PUSH_TAP', 'CLEAR_PENDING_PUSH_TAP'].includes(event.data?.type)) {
    event.waitUntil((async () => {
      try {
        const account = await contextOperation(false), tap = await contextOperation(false, null, 'pendingTap');
        const data = tap?.data;
        const valid = account && String(data?.userId) === account.userId && data?.registrationId === account.registrationId
          && Date.now() - tap.tappedAt < 86400000;
        if (event.data.type === 'CLEAR_PENDING_PUSH_TAP') {
          if (valid && data.notificationId === event.data.context?.notificationId && data.registrationId === event.data.context?.registrationId)
            await contextOperation(true, null, 'pendingTap');
          event.ports[0]?.postMessage({ ok: true });
        } else event.ports[0]?.postMessage({ ok: true, data: valid ? data : null });
      } catch { event.ports[0]?.postMessage({ ok: false }); }
    })());
    return;
  }
  if (event.data?.type !== 'SET_PUSH_ACCOUNT') return;
  event.waitUntil((async () => {
    try {
      const requested = event.data.context;
      const cleared = await updateContext(requested);
      event.ports[0]?.postMessage({ ok: true, cleared });
    } catch { event.ports[0]?.postMessage({ ok: false }); }
  })());
});
self.addEventListener('fetch', (event) => {
  const request = event.request, url = new URL(request.url);
  // API responses, authenticated photos, uploads and third-party URLs never enter Cache Storage.
  if (request.method !== 'GET' || url.origin !== self.location.origin || request.headers.has('Authorization')
      || url.pathname === '/api' || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => response.ok ? response : caches.match('/index.html', { cacheName: CACHE }))
      .catch(() => caches.match('/index.html', { cacheName: CACHE })));
    return;
  }
  if (!STATIC_PATHS.has(url.pathname)) return;
  event.respondWith(caches.match(url.pathname, { cacheName: CACHE }).then((cached) => cached || fetch(request)));
});
self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let payload;
    try { payload = event.data.json(); } catch { return; }
    const account = await contextOperation(false);
    if (!account || String(payload.data?.userId) !== account.userId || payload.data?.registrationId !== account.registrationId) return;
    const data = payload.data;
    await self.registration.showNotification('Mr_Care', {
      body: payload.body || 'You have an update. Open Mr_Care to review it.',
      icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
      tag: `mr-care-${data.notificationId}`, data,
    });
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    clients.forEach((client) => client.postMessage({ type: 'WEB_PUSH_RECEIVED', data, title: 'Mr_Care', body: payload.body }));
  })());
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const data = event.notification.data, account = await contextOperation(false);
    if (!account || String(data?.userId) !== account.userId || data?.registrationId !== account.registrationId) return;
    await contextOperation(true, { data, tappedAt: Date.now() }, 'pendingTap');
    const url = new URL('/', self.location.origin);
    url.searchParams.set('webPush', '1');
    ['notificationId', 'userId', 'registrationId', 'kind'].forEach((key) => url.searchParams.set(key, String(data[key] || '')));
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find((client) => new URL(client.url).origin === url.origin);
    if (existing) {
      await existing.focus();
      existing.postMessage({ type: 'WEB_PUSH_TAP', data });
    } else await self.clients.openWindow(url.href);
  })());
});
