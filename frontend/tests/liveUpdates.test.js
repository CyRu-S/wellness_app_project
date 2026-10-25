import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './loadModule.js';

function harness() {
  const connections = [], timers = [];
  class Xhr {
    constructor() { this.headers = {}; this.status = 200; this.responseText = ''; connections.push(this); }
    open(method, url) { this.method = method; this.url = url; }
    setRequestHeader(key, value) { this.headers[key] = value; }
    send() {}
    abort() { this.aborted = true; }
    chunk(text) { this.responseText += text; this.onprogress(); }
  }
  const module = loadModule('../src/services/api/liveUpdates.js', { './client': { API_URL: 'https://example.test/api' } }, {
    XMLHttpRequest: Xhr, setTimeout: (fn, ms) => { const timer = { fn, ms }; timers.push(timer); return timer; },
    clearTimeout: (timer) => { if (timer) timer.cancelled = true; },
  });
  return { ...module, connections, timers };
}

test('one authenticated live connection shares signals, ignores heartbeats and cleans up', () => {
  const app = harness(); let first = 0, second = 0;
  const leave1 = app.subscribeLiveUpdates('secret', () => first++);
  const leave2 = app.subscribeLiveUpdates('secret', () => second++);
  assert.equal(app.connections.length, 1);
  const xhr = app.connections[0];
  assert.equal(xhr.url, 'https://example.test/api/live/updates');
  assert.equal(xhr.headers.Authorization, 'Bearer secret');
  assert.ok(!xhr.url.includes('secret'));
  xhr.chunk('event: ready\ndata: 1\n\n: keepalive\n\n');
  xhr.chunk('event: chan'); xhr.chunk('ged\ndata: 2\n\n');
  xhr.chunk('event: changed\ndata: 2\n\n');
  assert.equal(first, 2); assert.equal(second, 2);
  assert.equal(app.timers.length, 0, 'idle live connections must not schedule data polling');
  leave1(); assert.ok(!xhr.aborted);
  leave2(); assert.equal(xhr.aborted, true);
});

test('reconnection refreshes missed changes once, backs off failures and stops on sign-out', () => {
  const app = harness(); let updates = 0;
  const leave = app.subscribeLiveUpdates('jwt', () => updates++);
  app.connections[0].chunk('event: ready\ndata: 1\n\n');
  app.connections[0].onload(); app.timers[0].fn();
  app.connections[1].chunk('event: ready\ndata: 1\n\n');
  assert.equal(updates, 1, 'rotating an unchanged connection must not refetch data');
  app.connections[1].chunk('event: changed\ndata: 3\n\n');
  assert.equal(updates, 2);
  app.connections[1].onerror();
  leave(); assert.equal(app.timers.at(-1).cancelled, true);
  app.timers.at(-1).fn(); assert.equal(app.connections.length, 2);
});

test('expired credentials do not retry and changing accounts closes the old stream', () => {
  const app = harness(); let oldUpdates = 0;
  app.subscribeLiveUpdates('old', () => oldUpdates++);
  const xhr = app.connections[0]; xhr.status = 401; xhr.onload();
  assert.equal(app.timers.length, 0);
  const leave = app.subscribeLiveUpdates('new', () => {});
  assert.equal(xhr.aborted, true);
  xhr.status = 200; xhr.chunk('event: changed\ndata: 4\n\n');
  assert.equal(oldUpdates, 0);
  leave();
});
