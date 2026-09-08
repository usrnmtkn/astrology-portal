import assert from "node:assert/strict";
import { contentUpdateStorageKey, subscribeToContentUpdates, subscribeToContentRevalidation } from "../apps/web/src/services/contentUpdateSignal";
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
  for (let index = 0; index < 10; index++) {
    now += 2000;
    win.dispatchEvent(new Event("focus"));
    doc.dispatchEvent(new Event("visibilitychange"));
  }
  assert.equal(refreshes, 2, "Repeated tab switching must not restart bulk content reads");
  now += 10000; win.dispatchEvent(new Event("focus"));
  assert.equal(refreshes, 3, "Resume freshness must recover after the short cooldown");
  win.navigator.onLine = false; now += 300000; tick(); assert.equal(refreshes, 3);
  win.navigator.onLine = true; win.dispatchEvent(new Event("online")); assert.equal(refreshes, 4);
  cleanup(); assert.ok(cleared);
  now += 300000; win.dispatchEvent(new Event("focus")); assert.equal(refreshes, 4);
  const originalChannel = globalThis.BroadcastChannel;
  let channel: EventTarget;
  class TestChannel extends EventTarget { constructor() { super(); channel = this; } close() {} }
  Object.assign(globalThis, { BroadcastChannel: TestChannel });
  try {
    let publications = 0;
    const stop = subscribeToContentUpdates(() => publications++);
    const notice = { contentKey: "sky/example", updatedAt: "2026-09-08T17:00:00Z", published: true };
    const storageNotice = (data: typeof notice) => win.dispatchEvent(Object.assign(new Event("storage"), {
      key: contentUpdateStorageKey, newValue: JSON.stringify(data)
    }));
    storageNotice(notice);
    channel!.dispatchEvent(new MessageEvent("message", { data: notice }));
    assert.equal(publications, 1, "One publication delivered on two transports must reload content once");
    storageNotice({ ...notice, updatedAt: "2026-09-08T17:00:01Z", published: false });
    assert.equal(publications, 2, "A new retirement must bypass the resume cooldown immediately");
    stop();
    storageNotice({ ...notice, updatedAt: "2026-09-08T17:00:02Z" });
    assert.equal(publications, 2, "Unsubscribed readers must stop processing publications");
  } finally { globalThis.BroadcastChannel = originalChannel; }
  console.log("Reader freshness interval, focus, reconnect, coalescing and cleanup passed.");
} finally { Date.now = dateNow; Reflect.deleteProperty(globalThis, "window"); Reflect.deleteProperty(globalThis, "document"); }
