import assert from "node:assert/strict";
import vm from "node:vm";
import { build } from "esbuild";

// Execute the real worker transport with explicit calculation fixtures. Holding
// one job reproduces background enrichment queued before a route change.
const names = ["getAstrodienstSky", "getSkyPlacementSnapshot", "getSkyPlacementTransitFacts",
  "getLunarCalendarMonth", "getLunarCalendarRangeEvents", "getLunarCalendarWeek",
  "getMatchingNewMoonForFullMoon", "natalTransitTimingFor", "preloadSwissEphemeris"];
const output = await build({
  entryPoints: ["apps/web/src/services/skyCalculation.worker.ts"], bundle: true,
  write: false, platform: "node", format: "cjs",
  plugins: [{ name: "calculation-fixture", setup(builder) {
    builder.onResolve({ filter: /\/ephemeris\.js$/ }, () => ({ path: "fixture", namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: names.map(name =>
      `export const ${name} = (...args) => globalThis.calculateFixture(${JSON.stringify(name)}, args);`
    ).join("\n"), loader: "js" }));
  } }]
});
let receive: (event: { data: unknown }) => void;
let release: () => void;
const held = new Promise<void>(resolve => { release = resolve; });
const replies: Array<{ id: number; ok: boolean; value?: unknown; error?: string }> = [];
const scheduled: Array<() => Promise<void>> = [];
vm.runInNewContext(output.outputFiles[0].text, {
  setTimeout: (callback: () => Promise<void>) => { scheduled.push(callback); },
  self: {
    addEventListener: (_kind: string, callback: typeof receive) => { receive = callback; },
    postMessage: (message: (typeof replies)[number]) => { replies.push(message); }
  },
  calculateFixture: async (name: string, args: unknown[]) => {
    if (name === "preloadSwissEphemeris") await held;
    if (args[0] === "failure") throw "fixture calculation failure";
    return JSON.stringify({ name, args });
  }
});
receive!({ data: { id: 1, kind: "preload" } });
const first = scheduled.shift()!();
receive!({ data: { id: 2, kind: "natal-transit-timing", args: ["background-one"] } });
receive!({ data: { id: 3, kind: "natal-transit-timing", args: ["background-two"] } });
receive!({ data: { id: 7, kind: "sky", location: { label: "New York" }, date: "2026-07-16T12:00:00Z", options: { includeTransitWindows: true } } });
receive!({ data: { id: 4, kind: "lunar-calendar-week", args: ["2026-07-16", "America/New_York"] } });
release!();
await first;
assert.deepEqual(replies.map(reply => reply.id), [1]);
await scheduled.shift()!();
assert.deepEqual(replies.map(reply => reply.id), [1, 4]);
assert.equal(replies[1].value, JSON.stringify({ name: "getLunarCalendarWeek", args: ["2026-07-16", "America/New_York"] }));
await scheduled.shift()!();
assert.deepEqual(replies.map(reply => reply.id), [1, 4, 7], "Full Sky details follow visible calendar facts but precede optional natal timing.");
assert.equal(replies[2].value, JSON.stringify({ name: "getAstrodienstSky", args: [{ label: "New York" }, "2026-07-16T12:00:00.000Z", { includeTransitWindows: true }] }));
await scheduled.shift()!();
// New foreground work is observed between background jobs, including errors.
receive!({ data: { id: 5, kind: "lunar-calendar-month", args: ["failure"] } });
receive!({ data: { id: 6, kind: "lunar-calendar-week", args: ["2027-01-12", "Asia/Tokyo"] } });
while (scheduled.length) await scheduled.shift()!();
assert.deepEqual(replies.map(reply => reply.id), [1, 4, 7, 2, 5, 6, 3]);
assert.equal(replies[4].ok, false);
assert.equal(replies[4].error, "fixture calculation failure");
assert.equal(replies[5].value, JSON.stringify({ name: "getLunarCalendarWeek", args: ["2027-01-12", "Asia/Tokyo"] }));
assert.equal(replies[6].ok, true);
console.log("PASS: Calendar facts precede full Sky details and optional natal timing; request identity, inputs, serial execution and recovery are preserved.");
