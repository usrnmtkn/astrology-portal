import assert from 'node:assert/strict';
import { getSkyPlacementSnapshotOffMainThread } from '../apps/web/src/services/skyCalculationClient';

// Exercise the actual calculation client and its existing cache. Only the
// worker transport is synthetic. Numerical facts stay with the actual-worker
// browser tests; no network or reader is involved in this cache-owner check.
const originalWorker = Object.getOwnPropertyDescriptor(globalThis, 'Worker');
const messages: any[] = [];
let worker: SyntheticWorker;
class SyntheticWorker {
  listeners = new Map<string, Array<(event: any) => void>>();
  constructor() { worker = this; }
  addEventListener(kind: string, listener: (event: any) => void) {
    this.listeners.set(kind, [...(this.listeners.get(kind) ?? []), listener]);
  }
  postMessage(message: any) { messages.push(message); }
  terminate() {}
  respond(message: any, ok: boolean) {
    for (const listener of this.listeners.get('message') ?? []) listener({ data: {
      id: message.id, ok, ...(ok ? { value: { generatedAt: message.date, location: message.location } }
        : { error: 'Synthetic placement calculation failed.' })
    } });
  }
}

Object.defineProperty(globalThis, 'Worker', { configurable: true, value: SyntheticWorker });
try {
  const location = { label: 'Synthetic New York', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' };
  const date = new Date('2026-10-13T16:00:00.123Z');
  const initial = getSkyPlacementSnapshotOffMainThread(location, 'sun', 'libra', date, true, 'placement');
  const mounted = getSkyPlacementSnapshotOffMainThread({ ...location }, 'sun', 'libra', new Date(date), true, 'placement');
  assert.equal(initial, mounted, 'Early and mounted exact inputs share the actual pending owner.');
  assert.equal(messages.length, 1);
  assert.equal(messages[0].date, date.toISOString());
  assert.equal(messages[0].includeAspectLists, true);
  assert.equal(messages[0].timingScope, 'placement');
  const rejected = Promise.all([assert.rejects(initial, /Synthetic placement/), assert.rejects(mounted, /Synthetic placement/)]);
  worker!.respond(messages[0], false);
  await rejected;
  const retry = getSkyPlacementSnapshotOffMainThread(location, 'sun', 'libra', date, true, 'placement');
  assert.equal(messages.length, 2, 'Failure evicts the same owner so the mounted request can retry.');
  worker!.respond(messages[1], true);
  assert.equal((await retry).generatedAt, date.toISOString());
  assert.equal(getSkyPlacementSnapshotOffMainThread(location, 'sun', 'libra', date, true, 'placement'), retry);

  for (const input of [
    { location, date: new Date(date.getTime() + 1), planet: 'sun', sign: 'libra' },
    { location: { ...location, latitude: 35.6 }, date, planet: 'sun', sign: 'libra' },
    { location: { ...location, longitude: 139.6 }, date, planet: 'sun', sign: 'libra' },
    { location: { ...location, timeZone: 'UTC' }, date, planet: 'sun', sign: 'libra' },
    { location, date, planet: 'venus', sign: 'libra' },
    { location, date, planet: 'sun', sign: 'scorpio' }
  ]) {
    const before = messages.length;
    const request = getSkyPlacementSnapshotOffMainThread(input.location, input.planet, input.sign, input.date, true, 'placement');
    assert.equal(messages.length, before + 1, 'A changed exact input cannot join the old selection.');
    worker!.respond(messages.at(-1), true);
    const snapshot = await request;
    assert.equal(snapshot.generatedAt, input.date.toISOString());
    assert.deepEqual(snapshot.location, input.location);
  }
} finally {
  if (originalWorker) Object.defineProperty(globalThis, 'Worker', originalWorker);
  else Reflect.deleteProperty(globalThis, 'Worker');
}
console.log('PASS: actual placement client exact-input pending sharing, failed-owner eviction, fresh retry, and changed instant/location/zone/planet/sign isolation.');
