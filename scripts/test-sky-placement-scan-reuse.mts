import assert from "node:assert/strict";
import path from "node:path";
import { createServer } from "vite";

// Compare the optimized complete scan with the unchanged, uncached exact-pass
// scanner. Count Swiss evaluations rather than imposing a machine-speed limit.
const vite = await createServer({
  root: path.join(process.cwd(), "apps/web"), appType: "custom", logLevel: "silent", server: { middlewareMode: true },
  plugins: [{ name: "placement-scan-test-exports", enforce: "pre", transform(code, id) {
    if (!id.endsWith("/src/services/ephemeris.ts")) return;
    return code.replace("function exactPlanetLongitude(swe: SwissEphInstance, planetId: number, date: Date) {",
      "function exactPlanetLongitude(swe: SwissEphInstance, planetId: number, date: Date) { __longitudeReads += 1;")
      + "\nlet __longitudeReads = 0; export function takeLongitudeReads() { const count = __longitudeReads; __longitudeReads = 0; return count; } export { getSwissEph, skyPointPlanetId, scanExactAspectPasses, findSkyPlacementResidencyAspects, calendarAspectDefinitions };";
  } }]
});
try {
  const engine = await vite.ssrLoadModule("/src/services/ephemeris.ts");
  const swe = await engine.getSwissEph();
  for (const [planet, startISO, endISO] of [
    ["Sun", "2026-08-22T00:00:00Z", "2026-09-23T00:00:00Z"],
    ["Neptune", "2026-01-01T00:00:00Z", "2028-01-01T00:00:00Z"],
    ["South Node", "2026-01-01T00:00:00Z", "2027-01-01T00:00:00Z"]
  ]) {
    const start = new Date(startISO), end = new Date(endISO);
    const subjectId = planet === "South Node" ? swe.SE_TRUE_NODE : engine.skyPointPlanetId(swe, planet);
    const expected: string[] = [];
    engine.takeLongitudeReads();
    for (const other of ["Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "Lilith"].filter(p => p !== planet)) {
      for (const [aspect, degrees] of engine.calendarAspectDefinitions) {
        const passes = engine.scanExactAspectPasses(swe, subjectId, engine.skyPointPlanetId(swe, other),
          planet === "South Node" ? 180 - degrees : degrees, start, end, 0.25);
        for (const date of passes) if (date >= start && date < end) expected.push(`${other}|${aspect}|${date.toISOString()}`);
      }
    }
    const uncachedReads = engine.takeLongitudeReads();
    const actual = engine.findSkyPlacementResidencyAspects(swe, start, end, "America/New_York", planet);
    const sharedReads = engine.takeLongitudeReads();
    assert.deepEqual(actual.map((event: any) => `${event.planets[1]}|${event.aspect}|${event.startsAt}`).sort(), expected.sort(),
      `${planet}: every exact pass and its timestamp must equal the uncached scan`);
    assert(sharedReads < uncachedReads / 3, `${planet}: shared samples must eliminate most duplicate Swiss evaluations (${sharedReads}/${uncachedReads})`);
    console.log(`PASS ${planet}: ${actual.length} identical exact passes; ${uncachedReads} -> ${sharedReads} Swiss longitude evaluations.`);
  }
} finally { await vite.close(); }
