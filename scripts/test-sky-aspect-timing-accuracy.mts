import assert from "node:assert/strict";
import { createServer } from "vite";
import SwissEph from "swisseph-wasm";
import { calculateSkyAspects, calculateNatalAspects, SKY_ASPECT_DEFINITIONS } from "@tldr/astro-knowledge/sky-aspect-engine";

// Exercise the production boundary search without adding a public test-only API.
const vite = await createServer({
  root: "apps/web", appType: "custom", logLevel: "silent",
  server: { middlewareMode: true, hmr: false },
  optimizeDeps: { entries: [], noDiscovery: true },
  plugins: [{ name: "timing-search-regression-exports", enforce: "pre", transform(source, id) {
    if (id.endsWith("/services/ephemeris.ts")) return `${source}\nexport { findResidualBoundary, aspectPassSeriesTiming };`;
  } }]
});
const swe = new SwissEph();
await swe.initSwissEph();
const normalize = (value: number) => ((value % 360) + 360) % 360;
const separation = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
function positionAt(planet: string, id: number, at: number) {
  const date = new Date(at);
  const jd = swe.julday(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(),
    date.getUTCHours() + date.getUTCMinutes() / 60 + (date.getUTCSeconds() + date.getUTCMilliseconds() / 1000) / 3600);
  const values = swe.calc_ut(jd, id, swe.SEFLG_SWIEPH | swe.SEFLG_SPEED);
  return { planet, longitude: values[0], speed: values[3] };
}
try {
  const ephemeris = await vite.ssrLoadModule("/src/services/ephemeris.ts");
  const at = Date.parse("2026-01-03T06:00:00Z");
  const moonVenus = (time: number) => [positionAt("Moon", swe.SE_MOON, time), positionAt("Venus", swe.SE_VENUS, time)];
  const orbAt = (time: number) => { const [a, b] = moonVenus(time); return Math.abs(separation(a.longitude, b.longitude) - 180); };
  assert.ok(orbAt(at + 60_000) < orbAt(at - 60_000), "Independent Swiss positions show this opposition applying");
  for (const calculate of [calculateSkyAspects, calculateNatalAspects]) {
    assert.equal(calculate(moonVenus(at)).find(aspect => aspect.type === "opposition")?.applying, true,
      "Moon–Venus must not become separating before the contact is exact");
    // Both branches, both relative motions and input orders, across longitude wrap.
    for (const { type, exactAngle } of SKY_ASPECT_DEFINITIONS) {
      for (const branch of [-1, 1]) for (const offset of [-0.2, 0.2]) for (const speed of [-13, 13]) {
        const directed = branch * exactAngle + offset;
        const first = { planet: "Moon", longitude: normalize(359.9 + directed), speed };
        const second = { planet: "Venus", longitude: 359.9, speed: 0 };
        const separationNow = separation(first.longitude, second.longitude);
        const residual = separationNow - exactAngle;
        const directedNow = ((first.longitude - second.longitude + 540) % 360) - 180;
        const expected = residual * Math.sign(directedNow) * speed < 0;
        for (const positions of [[first, second], [second, first]]) {
          assert.equal(calculate(positions).find(aspect => aspect.type === type)?.applying, expected,
            `${type}, branch ${branch}, offset ${offset}, speed ${speed}`);
        }
      }
    }
    for (const speeds of [[0, 0], [1, 1], [Number.NaN, 0]]) {
      assert.equal(calculate([{ planet: "Moon", longitude: 0, speed: speeds[0] }, { planet: "Venus", longitude: 89.8, speed: speeds[1] }])[0]?.applying, false);
    }
    assert.equal(calculate([{ planet: "Moon", longitude: 0, speed: 13 }, { planet: "Venus", longitude: 180, speed: 0 }])[0]?.applying, false,
      "Preserve the existing exact-contact convention");
  }

  const reference = new Date("2026-01-01T00:00:00Z");
  const noCrossing = () => [0.5];
  for (const direction of [-1, 1]) {
    assert.equal(ephemeris.findResidualBoundary(noCrossing, 1.5, reference, direction, 1, 60), null,
      "An exhausted search must not return its cap as an observed boundary");
  }
  assert.equal(ephemeris.aspectPassSeriesTiming({ residualsAt: noCrossing, motionIsRetrogradeAt: () => false,
    reference, presentationDegrees: 1.5, relativeSpeed: 0.1, fastestSpeed: 0.1, maxBoundaryCapDays: 60 }), null);

  const sky = await ephemeris.getAstrodienstSky(ephemeris.defaultLocation, new Date("2026-07-01T12:00:00Z"),
    { includeTransitWindows: true, transitWindowPlanets: [] });
  assert.equal(sky.calculationProvenance.actualEphemeris, "swiss");
  const timing = sky.aspects.find((aspect: { from: string; to: string; type: string }) =>
    aspect.from === "Chiron" && aspect.to === "North Node" && aspect.type === "sextile")?.timing;
  assert.ok(timing, "A slow crossing beyond the initial speed estimate must still be found");
  const end = Date.parse(timing.engagementEnd);
  assert.ok(Math.abs(end - Date.parse("2026-11-09T06:37:02.497Z")) < 2000,
    "Chiron–Node must end at its independently calculated November exit, not the October search cap");
  const chironNodeOrb = (time: number) => Math.abs(separation(positionAt("Chiron", 15, time).longitude,
    positionAt("North Node", swe.SE_TRUE_NODE, time).longitude) - 60);
  assert.ok(chironNodeOrb(end - 60_000) < 1.5 && chironNodeOrb(end + 60_000) > 1.5,
    "The published end must bracket the actual presentation-orb crossing");
  const dates = await vite.ssrLoadModule("/src/services/skyAspectTiming.ts");
  assert.equal(dates.skyAspectDateRange({ timing: { timeZone: "America/New_York" } }, new Date(timing.engagementStart), new Date(end)), "Jun 25 - Nov 9, 2026");
  const { default: handler } = await vite.ssrLoadModule(`${process.cwd()}/api/sky.ts`);
  const response = { statusCode: 0, body: "", setHeader() {}, end(body: string) { this.body = body; } };
  await handler({ method: "GET", url: "/api/sky?at=2026-01-03T06:00:00Z&lat=0&lon=0&timeZone=UTC&version=tldrastro-calculation-v4&detail=core" }, response);
  assert.equal(response.statusCode, 200);
  const apiSky = JSON.parse(response.body).sky;
  assert.equal(apiSky.aspects.find((aspect: { from: string; to: string }) => aspect.from === "Moon" && aspect.to === "Venus").applying, true,
    "The actual API must expose the corrected phase");
  assert.equal(apiSky.facts.find((fact: { kind: string; planetOrPointId: string; targetId: string; aspectType: string }) =>
    fact.kind === "aspect" && fact.planetOrPointId === "moon" && fact.targetId === "venus" && fact.aspectType === "opposition")?.applyingSeparating,
    "applying", "The API fact envelope must preserve the corrected phase");
  assert.equal(apiSky.calculationProvenance.calculationVersion, "tldrastro-calculation-v4");
  console.log("Sky timing accuracy: current motion, all aspect branches, shared Natal behavior, exhausted search and verified slow end date passed.");
} finally {
  await vite.close();
}
