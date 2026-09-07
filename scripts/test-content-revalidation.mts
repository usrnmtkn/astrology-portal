import assert from "node:assert/strict";
import { subscribeToContentRevalidation } from "../apps/web/src/services/contentUpdateSignal";
let now = 1000000;
const dateNow = Date.now;
Date.now = () => now;
const win = Object.assign(new EventTarget(), { navigator: { onLine: true }, setInterval: (fn: () => void) => { tick = fn; return 1; }, clearInterval: () => { cleared = true; } });
const doc = Object.assign(new EventTarget(), { visibilityState: "visible" });
let tick: () => void = () => {};
let cleared = false;
Object.assign(globalThis, { window: win, document: doc });
try {
  let refreshes = 0;
  const cleanup = subscribeToContentRevalidation(() => { refreshes++; });
  tick(); assert.equal(refreshes, 0);
  now += 300000; tick(); assert.equal(refreshes, 1, "Visible readers must periodically see edits from another device");
  doc.visibilityState = "hidden"; now += 300000; tick(); assert.equal(refreshes, 1);
  doc.visibilityState = "visible"; doc.dispatchEvent(new Event("visibilitychange")); assert.equal(refreshes, 2);
  win.dispatchEvent(new Event("focus")); assert.equal(refreshes, 2, "Focus and visibility events must coalesce");
  win.navigator.onLine = false; now += 300000; tick(); assert.equal(refreshes, 2);
  win.navigator.onLine = true; win.dispatchEvent(new Event("online")); assert.equal(refreshes, 3);
  cleanup(); assert.ok(cleared);
  now += 300000; win.dispatchEvent(new Event("focus")); assert.equal(refreshes, 3);
  console.log("Reader freshness interval, focus, reconnect, coalescing and cleanup passed.");
} finally { Date.now = dateNow; Reflect.deleteProperty(globalThis, "window"); Reflect.deleteProperty(globalThis, "document"); }
