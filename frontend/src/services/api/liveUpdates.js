import { API_URL } from './client';

// One shared authenticated stream per focused account. XMLHttpRequest supports
// incremental text on both React Native and browsers without a native plugin.
let session = null;

function start(token) {
  const state = { token, listeners: new Set(), xhr: null, timer: null, stopped: false, revision: null, failures: 0 };
  const connect = () => {
    if (state.stopped) return;
    const xhr = new XMLHttpRequest();
    state.xhr = xhr;
    let offset = 0, buffer = '', finished = false;
    const finish = () => {
      if (finished || state.stopped) return;
      finished = true;
      // Invalid sessions must sign in again; do not hammer an unauthorized endpoint.
      if ([401, 403].includes(xhr.status)) return;
      state.failures += 1;
      state.timer = setTimeout(connect, Math.min(60000, 1000 * (2 ** Math.min(state.failures, 6))));
    };
    const consume = () => {
      if (state.stopped || xhr.status !== 200) return;
      const text = xhr.responseText || '';
      buffer = (buffer + text.slice(offset)).replace(/\r\n/g, '\n'); offset = text.length;
      let end;
      while ((end = buffer.indexOf('\n\n')) >= 0) {
        const frame = buffer.slice(0, end); buffer = buffer.slice(end + 2);
        const event = frame.match(/^event:\s*(.+)$/m)?.[1];
        const revision = frame.match(/^data:\s*(.+)$/m)?.[1];
        if (!['ready', 'changed'].includes(event) || !revision) continue;
        state.failures = 0;
        if (state.revision !== revision) {
          state.revision = revision;
          state.listeners.forEach((listener) => listener());
        }
      }
      // Server rotates streams after five minutes. Also bound retained XHR text
      // if many check-ins arrive before that timeout.
      if (offset > 262144) { finish(); xhr.abort(); }
    };
    xhr.open('GET', `${API_URL}/live/updates`, true);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Accept', 'text/event-stream');
    xhr.timeout = 330000;
    xhr.onprogress = consume;
    xhr.onreadystatechange = () => { if (xhr.readyState === 3 || xhr.readyState === 4) consume(); };
    xhr.onload = finish; xhr.onerror = finish; xhr.ontimeout = finish;
    try { xhr.send(); } catch { finish(); }
  };
  state.connect = connect;
  return state;
}

export function subscribeLiveUpdates(token, listener) {
  if (!token || typeof XMLHttpRequest === 'undefined') return () => {};
  if (session && session.token !== token) stop(session);
  const fresh = !session;
  if (fresh) session = start(token);
  const current = session;
  current.listeners.add(listener);
  if (fresh) current.connect();
  return () => {
    current.listeners.delete(listener);
    if (!current.listeners.size) stop(current);
  };
}

function stop(current) {
  current.stopped = true;
  clearTimeout(current.timer);
  current.xhr?.abort();
  current.listeners.clear();
  if (session === current) session = null;
}
