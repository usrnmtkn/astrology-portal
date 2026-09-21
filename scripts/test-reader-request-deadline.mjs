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
console.log("Reader deadlines bound authentication and fetch, propagate cancellation, and reject late work.");
