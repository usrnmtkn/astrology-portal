import assert from "node:assert/strict";
import { getAstrodienstSky, defaultLocation } from "../apps/web/src/services/ephemeris.ts";
import { zodiacWheelFacts, wheelDegree, wheelOrdinal, type ZodiacWheelSnapshot } from "../apps/web/src/services/zodiacWheelFacts.ts";
import { wheelFanLongitudes, wheelPointAt } from "../apps/web/src/components/charts/interactiveWheelGeometry.ts";
import type { PlanetPosition } from "../apps/web/src/types.ts";

// Real Swiss Ephemeris calculations at separate day/night instants. Runtime
// never imports these fixtures or replaces a failed calculation with them.
for (const instant of ["2026-11-04T17:00:00Z", "2026-11-05T05:00:00Z"]) {
  const sky = await getAstrodienstSky(defaultLocation, new Date(instant), { includeTransitWindows: false });
  const before = JSON.stringify(sky);
  const model = zodiacWheelFacts(sky, "sky");
  for (const actual of sky.positions.filter(point => !["Ascendant", "Midheaven"].includes(point.planet))) {
    const point = model.planets.find(value => value.name === actual.planet);
    assert.ok(point, actual.planet);
    assert.equal(point.longitude, actual.longitude);
    assert.equal(point.house, actual.house, `${instant}: ${point.name} retains the direct Swiss whole-sign house`);
  }
  const sun = sky.positions.find(point => point.planet === "Sun")!.longitude!;
  const moon = sky.positions.find(point => point.planet === "Moon")!.longitude!;
  const isDay = sky.solarHorizon!.altitude > 0;
  assert.equal(isDay, instant.includes("T17:"));
  const fortune = ((sky.ascendantLongitude! + (isDay ? moon - sun : sun - moon)) % 360 + 360) % 360;
  assert.equal(model.planets.find(point => point.name === "Lot of Fortune")!.longitude, fortune);
  const asc = wheelPointAt(sky.ascendantLongitude!, 248, model.ascendant);
  assert.equal(asc.x, 52); assert.ok(Math.abs(asc.y - 300) < 1e-10);
  assert.equal(JSON.stringify(sky), before, "Inspection never mutates the saved/calculated chart");
  const unknown = zodiacWheelFacts({ ...sky, birthTimeKnown: true }, "natal", true);
  assert.equal(unknown.hasHouses, false);
  assert.deepEqual(unknown.angles, []);
  assert.equal(unknown.planets.some(point => point.name === "Lot of Fortune"), false);
  assert.ok(unknown.planets.every(point => point.house === null && !point.conditions.some(condition => /sect/i.test(condition.label))));
}

const point = (planet: string, longitude: number, speed = 1): PlanetPosition => ({ planet, longitude,
  sign: ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"][Math.floor(longitude / 30)],
  degree: longitude % 30, glyph: "", signGlyph: "", house: 1, motion: "direct", speed });
const snapshot: ZodiacWheelSnapshot = { positions: [point("Mercury", 0), point("Saturn", 126, -0.1)], aspects: [], ascendantLongitude: 271.2, midheavenLongitude: 208.7 };
assert.equal(zodiacWheelFacts(snapshot, "sky").aspects[0].close, false, "Sky retains its canonical 5° trine orb");
assert.equal(zodiacWheelFacts(snapshot, "natal").aspects[0].close, true, "Natal retains its own canonical orb");
assert.equal(zodiacWheelFacts(snapshot, "natal").planets[1].retrograde, true, "Negative calculated speed supplies Rx even for a stale motion label");
const dignities = zodiacWheelFacts({ ...snapshot, positions: [point("Mercury", 155), point("Saturn", 350)] }, "natal");
assert.deepEqual(dignities.planets[0].conditions.map(condition => condition.label), ["Domicile", "Exalted"]);
const fallen = zodiacWheelFacts({ ...snapshot, positions: [point("Mercury", 335), point("Saturn", 250)] }, "natal");
assert.deepEqual(fallen.planets[0].conditions.map(condition => condition.label), ["Detriment", "Fall"]);
assert.equal(zodiacWheelFacts({ ...snapshot, birthTimeKnown: false }, "natal").hasHouses, false);
assert.equal(zodiacWheelFacts({ ...snapshot, ascendantLongitude: Number.NaN }, "natal").hasHouses, false);
assert.equal(zodiacWheelFacts({ ...snapshot, positions: [{ ...point("Sun", 10), longitude: undefined, sign: "Invalid" }] }, "sky").planets.length, 0);
const legacy = zodiacWheelFacts({ ...snapshot, positions: [{ ...point("Mercury", 155), longitude: undefined }] }, "natal");
assert.equal(legacy.planets[0].longitude, 155);
const nodes = zodiacWheelFacts({ ...snapshot, positions: [point("True Node", 320, -0.05), point("North Node", 320, -0.05), point("South Node", 140, -0.05), point("Lilith", 240, -0.1), point("Sun", 210, -1)] }, "sky");
assert.equal(nodes.planets.filter(value => value.name === "North Node").length, 1);
assert.ok(nodes.planets.every(value => !value.retrograde));
assert.equal(nodes.aspects.length, 0, "Calculated points do not acquire the planet aspect treatment");
const wrap = zodiacWheelFacts({ ...snapshot, positions: [point("Sun", 358), point("Moon", 1), point("Mercury", 4)] }, "sky");
const fan = wheelFanLongitudes(wrap.planets);
assert.equal(fan.get("Moon")! - fan.get("Sun")!, 11);
assert.equal(fan.get("Mercury")! - fan.get("Moon")!, 11);
assert.deepEqual(wrap.planets.map(value => value.longitude), [358, 1, 4], "Fanning leaves true ticks untouched");
assert.equal(wheelDegree(2 + 10 / 60), "2°10′");
assert.equal(wheelDegree(0.01), "0°01′");
assert.equal(wheelOrdinal(11), "11th");
assert.equal(wheelOrdinal(2), "2nd");
console.log("Interactive zodiac wheel: direct day/night Swiss positions, Fortune, unknown time, canonical orbs, dignity, Rx and circular fanning passed.");
