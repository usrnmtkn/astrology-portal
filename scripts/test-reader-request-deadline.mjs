import assert from "node:assert/strict";
import { withRequestDeadline } from "../apps/web/src/services/requestDeadline.ts";

assert.equal(await withRequestDeadline(async () => "ready"), "ready");
let timedOutSignal;
await assert.rejects(withRequestDeadline(signal => {
  timedOutSignal = signal;
  return new Promise(() => {});
}, { timeoutMs: 10 }), { name: "TimeoutError" });
assert.equal(timedOutSignal.aborted, true);

const parent = new AbortController();
let pendingSignal;
const pending = withRequestDeadline(signal => {
  pendingSignal = signal;
  return new Promise(() => {});
}, { signal: parent.signal });
parent.abort();
await assert.rejects(pending, { name: "AbortError" });
assert.equal(pendingSignal.aborted, true);
let started = false;
await assert.rejects(withRequestDeadline(async () => { started = true; }, { signal: parent.signal }), { name: "AbortError" });
assert.equal(started, false);

// A late authentication result cannot begin a fetch after the whole operation expires.
let finishAuth;
let queried = false;
const auth = new Promise(resolve => { finishAuth = resolve; });
await assert.rejects(withRequestDeadline(async signal => {
  await auth;
  signal.throwIfAborted();
  queried = true;
}, { timeoutMs: 10 }), { name: "TimeoutError" });
finishAuth();
await new Promise(resolve => setImmediate(resolve));
assert.equal(queried, false);
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
try {
  const page = new EventTarget();
  const listeners = new Map();
  const add = page.addEventListener.bind(page), remove = page.removeEventListener.bind(page);
  page.addEventListener = (type, listener, options) => {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(listener); add(type, listener, options);
  };
  page.removeEventListener = (type, listener, options) => {
    listeners.get(type)?.delete(listener); remove(type, listener, options);
  };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: page });
  for (const event of ['beforeunload', 'pagehide']) {
    let signal;
    const pending = withRequestDeadline(value => { signal = value; return new Promise(() => {}); },
      { cancelOnNavigation: true });
    const rejected = assert.rejects(pending, { name: 'AbortError' });
    page.dispatchEvent(new Event(event));
    await rejected;
    assert.equal(signal.aborted, true);
    assert([...listeners.values()].every(value => value.size === 0), 'Settled requests release both navigation listeners.');
    assert.equal(await withRequestDeadline(async () => 'later read', { cancelOnNavigation: true }), 'later read',
      'A cancelled navigation does not poison a later request on the same page.');
    assert([...listeners.values()].every(value => value.size === 0));
  }
  let finish;
  const unchanged = withRequestDeadline(() => new Promise(resolve => { finish = resolve; }));
  page.dispatchEvent(new Event('beforeunload'));
  finish('normal caller');
  assert.equal(await unchanged, 'normal caller', 'Navigation cancellation remains opt-in.');
} finally {
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
}
console.log("Reader deadlines bound authentication and fetch, propagate cancellation, and reject late work.");
