import assert from "node:assert/strict";
import { getAstrodienstSky } from "../apps/web/src/services/ephemeris.ts";
import { getAstrodienstSkyOffMainThread } from "../apps/web/src/services/skyCalculationClient.ts";
import { readEphemerisHealth } from "../apps/web/src/services/ephemerisHealth.ts";

const date = new Date("2026-11-01T12:00:00Z");
const location = { label: "Synthetic health check", latitude: 0, longitude: 0, timeZone: "UTC" };
const sky = await getAstrodienstSky(location, date, { includeTransitWindows: false, includeAspectTiming: false });
let mode = "hang";
let terminated = 0;
const nativeTimer = globalThis.setTimeout;
const nativeWorker = globalThis.Worker;
class SyntheticWorker extends EventTarget {
  postMessage(message: { id: number }) {
    if (mode === "hang") return;
    queueMicrotask(() => {
      if (mode === "messageerror") this.dispatchEvent(new Event("messageerror"));
      else this.dispatchEvent(new MessageEvent("message", { data: mode === "malformed" ? null : {
        id: message.id, ok: true, value: mode === "wrong-inputs" ? { ...sky, generatedAt: "2026-01-01T00:00:00Z" } : sky
      } }));
    });
  }
  terminate() { terminated++; }
}
globalThis.Worker = SyntheticWorker as unknown as typeof Worker;
// Accelerate only the production foreground deadline, leaving other timers real.
globalThis.setTimeout = ((callback, delay, ...args) => nativeTimer(callback, delay === 30_000 ? 10 : delay, ...args)) as typeof setTimeout;
try {
  await assert.rejects(getAstrodienstSkyOffMainThread(location, date), /timed out/);
  assert.equal(terminated, 1);
  assert.equal(readEphemerisHealth().worker?.ok, false);
  for (const failure of ["messageerror", "malformed", "wrong-inputs"]) {
    mode = failure;
    await assert.rejects(getAstrodienstSkyOffMainThread(location, date));
    assert.equal(readEphemerisHealth().worker?.ok, false);
  }
  mode = "ready";
  assert.equal((await getAstrodienstSkyOffMainThread(location, date)).generatedAt, date.toISOString());
  assert.equal(readEphemerisHealth().worker?.ok, true);
} finally {
  globalThis.Worker = nativeWorker; globalThis.setTimeout = nativeTimer;
}
console.log("Ephemeris worker health passed: hang termination, unreadable/malformed replies, wrong-input rejection, and fresh-worker recovery.");
