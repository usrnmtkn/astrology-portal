import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import SwissEph from "swisseph-wasm";
import { memoizeSwissCalculation } from "../apps/web/src/services/swissCalculationCache";

let calls = 0;
const engine = {};
const calculate = memoizeSwissCalculation((_engine, day, body, flags) => {
  calls++;
  if (body === 99) throw new Error("ephemeris unavailable");
  return { values: Float64Array.of(day, body, flags, 0, 0, 0), returnedFlags: flags };
}, 2);
const first = calculate(engine, 2_461_000, 0, 2);
first.values[0] = -1;
first.returnedFlags = -1;
const second = calculate(engine, 2_461_000, 0, 2);
assert.equal(calls, 1, "identical requests reuse one successful calculation");
assert.equal(second.values[0], 2_461_000);
assert.equal(second.returnedFlags, 2);
second.values[0] = -2;
assert.equal(calculate(engine, 2_461_000, 0, 2).values[0], 2_461_000, "callers cannot mutate cached vectors");
calculate(engine, 2_461_000, 1, 2);
assert.throws(() => calculate(engine, 2_461_000, 99, 2), /unavailable/);
assert.throws(() => calculate(engine, 2_461_000, 99, 2), /unavailable/);
assert.equal(calls, 4, "failed calculations are never cached");
calculate(engine, 2_461_000, 0, 2);
assert.equal(calls, 4, "failures do not evict successful entries");
calculate(engine, 2_461_000, 0, 258);
calculate(engine, 2_461_000, 0, 2);
assert.equal(calls, 6, "flags remain distinct and the bounded cache evicts old entries");
calculate(engine, 2_461_000 + 1e-9, 0, 2);
assert.equal(calls, 7, "Julian days are not rounded");
calculate({}, 2_461_000 + 1e-9, 0, 2);
assert.equal(calls, 8, "ephemeris instances never share results");

// Compare the complete real-engine outputs with the same calculation path
// running uncached. The fixture changes only cache capacity, not astronomy.
const root = process.cwd();
const cacheRoot = path.join(root, "node_modules/.cache/tldrastro");
await mkdir(cacheRoot, { recursive: true });
const directory = await mkdtemp(path.join(cacheRoot, "swiss-cache-parity-"));
try {
  const modules = [];
  for (const uncached of [true, false]) {
    const outfile = path.join(directory, `${uncached ? "direct" : "cached"}.mjs`);
    await build({
      entryPoints: ["apps/web/src/services/ephemeris.ts"], bundle: true,
      platform: "node", format: "esm", outfile, external: ["swisseph-wasm"],
      define: { "import.meta.env": "{}" }, logLevel: "silent",
      plugins: uncached ? [{ name: "uncached-ephemeris", setup(builder) {
        builder.onResolve({ filter: /swissCalculationCache\.js$/ }, () => ({ path: "uncached", namespace: "fixture" }));
        builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
          resolveDir: root, loader: "js",
          contents: `import { memoizeSwissCalculation as memoize } from ${JSON.stringify(path.join(root, "apps/web/src/services/swissCalculationCache.ts"))};
            export const memoizeSwissCalculation = calculate => memoize(calculate, 0);`
        }));
      } }] : []
    });
    modules.push(await import(pathToFileURL(outfile).href));
  }
  const [direct, cached] = modules;
  const swiss = new SwissEph();
  await swiss.initSwissEph();
  const newYork = { label: "New York", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" };
  const tokyo = { label: "Tokyo", latitude: 35.6762, longitude: 139.6503, timeZone: "Asia/Tokyo" };
  for (const [iso, location] of [
    ["2026-09-20T16:00:00Z", newYork],
    ["2026-09-20T16:00:00Z", tokyo],
    ["2026-03-08T06:30:00Z", newYork],
    ["2026-11-01T06:30:00Z", newYork]
  ] as const) {
    const date = new Date(iso);
    for (const detail of ["basic", "full"]) {
      assert.deepEqual(await cached.getLunarCalendarWeek(location, date, { detail }),
        await direct.getLunarCalendarWeek(location, date, { detail }), `${iso} ${location.timeZone}: complete ${detail} Calendar facts`);
    }
    const sky = await cached.getAstrodienstSky(location, date, { includeTransitWindows: true });
    assert.deepEqual(sky, await direct.getAstrodienstSky(location, date, { includeTransitWindows: true }), `${iso}: positions, houses, phases, exact passes and transit windows`);
    assert.equal(sky.calculationProvenance.actualEphemeris, "swiss");
    const julianDay = swiss.julday(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(),
      date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600);
    for (const [planet, body] of [["Sun", swiss.SE_SUN], ["Moon", swiss.SE_MOON], ["North Node", swiss.SE_TRUE_NODE], ["Lilith", 13]] as const) {
      const vector = swiss.calc_ut(julianDay, body, swiss.SEFLG_SWIEPH | swiss.SEFLG_SPEED);
      const position = sky.positions.find((row: { planet: string }) => row.planet === planet);
      assert.equal(position.longitude, Number((((vector[0] % 360) + 360) % 360).toFixed(4)), `${iso}: direct ${planet} longitude`);
      assert.equal(position.speed, Number(vector[3].toFixed(6)), `${iso}: direct ${planet} speed`);
    }
  }
  const month = new Date("2026-09-20T16:00:00Z");
  assert.deepEqual(await cached.getLunarCalendarMonth(newYork, month, { detail: "full" }),
    await direct.getLunarCalendarMonth(newYork, month, { detail: "full" }), "complete month event and timing parity");
  const timingSky = await direct.getAstrodienstSky(newYork, month, { includeDailyEvents: false });
  for (const planet of ["Moon", "Saturn"]) {
    const options = { aspectDegrees: 90, timeZone: newYork.timeZone };
    const longitude = timingSky.positions.find((row: { planet: string }) => row.planet === planet).longitude;
    const natalLongitude = (longitude + 270) % 360;
    const timing = await cached.natalTransitTimingFor(planet, natalLongitude, month, options);
    assert(timing?.exactPasses.length > 0, `${planet}: the fixture must exercise an active contact and exact pass`);
    assert.deepEqual(timing, await direct.natalTransitTimingFor(planet, natalLongitude, month, options),
      `${planet}: personal transit window parity`);
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}
console.log("PASS: bounded exact-input cache, isolated immutable results, retryable failures; direct Swiss parity across dates, locations, DST, complete Calendar/Sky and personal transit timing.");
