import assert from "node:assert/strict";
import { getAstrodienstSky, getSkyPlacementSnapshot } from "../apps/web/src/services/ephemeris.ts";
const location = { label: "New York", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" };
for (const [reference, planet, sign] of [
  ["2026-11-27T16:00:00Z", "sun", "Gemini"],
  ["2027-11-27T16:00:00Z", "sun", "Gemini"],
  ["2026-11-27T16:00:00Z", "sun", "Sagittarius"],
  ["2026-11-27T16:00:00Z", "moon", "Aries"],
  ["2026-11-27T16:00:00Z", "mercury", "Cancer"],
  ["2026-11-27T16:00:00Z", "north-node", "Aquarius"]
]) {
  const sky = await getSkyPlacementSnapshot(location, planet, sign, new Date(reference));
  const normalize = (value: string) => value.toLowerCase().replaceAll(" ", "-").replace("true-node", "north-node");
  const position = sky.positions.find(p => normalize(p.planet) === planet);
  assert.equal(position?.sign, sign);
  const direct = await getAstrodienstSky(location, new Date(sky.generatedAt), { includeTransitWindows: true });
  assert.deepEqual(sky.positions, direct.positions);
  assert.deepEqual(sky.aspects, direct.aspects);
  if (planet === "sun" && sign === "Gemini") {
    assert.ok(sky.generatedAt.startsWith(`${Number(reference.slice(0,4)) + 1}-05`) || sky.generatedAt.startsWith(`${Number(reference.slice(0,4)) + 1}-06`));
    assert.ok(position?.transitStart?.includes("-05-"));
    assert.ok(position?.transitEnd?.includes("-06-"));
  }
}
console.log("PASS: requested placement snapshots preserve calculated signs, residency dates, and aspects across two years, current/next Sun, Moon, Mercury, and True Node.");
