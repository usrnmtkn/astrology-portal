import assert from "node:assert/strict";
import { getAstrodienstSky } from "../apps/web/src/services/ephemeris.ts";

const fixtures = [
  { date: "1990-01-01T17:00:00Z", location: { label: "New York, NY", latitude: 40.7128, longitude: -74.006, timeZone: "America/New_York" } },
  { date: "1988-04-03T00:15:00Z", location: { label: "Tokyo", latitude: 35.6762, longitude: 139.6503, timeZone: "Asia/Tokyo" } },
  { date: "2025-09-07T18:00:00Z", location: { label: "London", latitude: 51.5072, longitude: -0.1276, timeZone: "Europe/London" } }
];
const natalFields = ["location", "generatedAt", "calculationProvenance", "ascendant", "ascendantLongitude", "midheaven", "midheavenLongitude", "houseCusps", "moonPhase", "dominantElement", "positions", "aspects"];
const dailyFields = ["moonStatus", "moonSignTransition", "moonEvent", "solarDaylight"];
for (const { date, location } of fixtures) {
  const full = await getAstrodienstSky(location, new Date(date));
  const natal = await getAstrodienstSky(location, new Date(date), { includeDailyEvents: false });
  for (const field of natalFields) {
    assert.deepEqual(natal[field], full[field], `${field} must preserve the complete natal calculation for ${date}`);
  }
  for (const field of dailyFields) {
    assert.equal(natal[field], undefined, `Natal calculation must not search ${field}`);
  }
  assert.ok(full.moonStatus, "Default Sky calculation retains lunar status");
  assert.ok(full.moonEvent, "Default Sky calculation retains lunations");
  assert.ok(full.solarDaylight, "Default Sky calculation retains solar daylight");
  assert.equal(natal.positions.length, 14, "Keep every canonical point, including both nodes and True Lilith");
  assert.ok(natal.facts?.length, "Natal facts and provenance remain available");
  for (const fact of natal.facts) {
    assert.deepEqual(fact, full.facts.find(candidate => candidate.id === fact.id), "Every retained natal fact matches the full calculation");
  }
}
console.log("Natal calculation scope passed: all positions, angles, houses, aspects, phase and provenance match the full Sky calculation; default daily events remain enabled.");
