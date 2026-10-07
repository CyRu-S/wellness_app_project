// Small IndexedDB fixture for persistence and service-worker tests; production uses the browser API.
export function browserStorage() {
  const databases = new Map();
  const indexedDB = {
    open(name) {
      const request = {};
      setTimeout(() => {
        const fresh = !databases.has(name);
        if (fresh) databases.set(name, new Map());
        const stores = databases.get(name);
        request.result = {
          createObjectStore: (store) => { if (!stores.has(store)) stores.set(store, new Map()); },
          close: () => {},
          transaction(storeName) {
            const records = stores.get(storeName);
            const transaction = { pending: 0 };
            const execute = (work) => {
              const action = {}; transaction.pending += 1;
              setTimeout(() => {
                try { action.result = work(); action.onsuccess?.(); }
                catch (error) { action.error = error; action.onerror?.(); transaction.error = error; transaction.onerror?.(); }
                transaction.pending -= 1;
                setTimeout(() => { if (!transaction.pending && !transaction.done) { transaction.done = true; transaction.oncomplete?.(); } }, 0);
              }, 0);
              return action;
            };
            transaction.objectStore = () => ({
              get: (key) => execute(() => records.get(key)),
              put: (value, key) => execute(() => { records.set(key, value); return key; }),
              delete: (key) => execute(() => records.delete(key)),
              clear: () => execute(() => records.clear()),
              getAllKeys: () => execute(() => [...records.keys()]),
            });
            transaction.abort = () => { transaction.error = new Error('Aborted'); transaction.onabort?.(); };
            return transaction;
          },
        };
        if (fresh) request.onupgradeneeded?.();
        request.onsuccess?.();
      }, 0);
      return request;
    },
  };
  return { indexedDB, databases };
}
