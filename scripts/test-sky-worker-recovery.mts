import assert from "node:assert/strict";

// The clock and worker are explicit transport fixtures. Astronomy remains in
// the real worker; this verifies failure recovery without waiting two minutes.
const original = { Worker: globalThis.Worker, setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout };
const timers = new Map<number, () => void>();
let nextTimer = 0;
class WorkerFixture {
  static instances: WorkerFixture[] = [];
  listeners = new Map<string, (event: any) => void>();
  messages: any[] = [];
  terminated = false;
  constructor() { WorkerFixture.instances.push(this); }
  addEventListener(kind: string, listener: (event: any) => void) { this.listeners.set(kind, listener); }
  postMessage(message: any) { this.messages.push(message); }
  terminate() { this.terminated = true; }
  emit(kind: string, event: any) { this.listeners.get(kind)?.(event); }
}
try {
  globalThis.Worker = WorkerFixture as any;
  globalThis.setTimeout = ((callback: () => void, delay: number) => {
    assert.equal(delay, 120_000);
    timers.set(++nextTimer, callback);
    return nextTimer;
  }) as any;
  globalThis.clearTimeout = ((id: number) => { timers.delete(id); }) as any;
  const client = await import("../apps/web/src/services/skyCalculationClient");
  const first = client.preloadSwissEphemerisOffMainThread();
  const second = client.preloadSwissEphemerisOffMainThread();
  const firstRejected = assert.rejects(first, /timed out/);
  const secondRejected = assert.rejects(second, /timed out/);
  const oldWorker = WorkerFixture.instances[0];
  [...timers.values()][0]();
  await Promise.all([firstRejected, secondRejected]);
  assert.equal(timers.size, 0);
  assert.equal(oldWorker.terminated, true);
  const retry = client.preloadSwissEphemerisOffMainThread();
  const newWorker = WorkerFixture.instances[1];
  // A delayed error from the terminated worker cannot reject a newer request.
  oldWorker.emit("error", { message: "late old worker error" });
  newWorker.emit("message", { data: { id: newWorker.messages[0].id, ok: true, value: undefined } });
  await retry;
  assert.equal(timers.size, 0);
  const failed = client.preloadSwissEphemerisOffMainThread();
  const failedAssertion = assert.rejects(failed, /download failed/);
  newWorker.emit("error", { message: "download failed" });
  await failedAssertion;
  assert.equal(newWorker.terminated, true);
  const recovered = client.preloadSwissEphemerisOffMainThread();
  const recoveredWorker = WorkerFixture.instances[2];
  recoveredWorker.emit("message", { data: { id: recoveredWorker.messages[0].id, ok: true, value: undefined } });
  await recovered;
  assert.equal(timers.size, 0);
  console.log("PASS: hung and failed workers release all requests; retry creates a healthy worker; late errors cannot cancel it.");
} finally {
  Object.assign(globalThis, original);
}
