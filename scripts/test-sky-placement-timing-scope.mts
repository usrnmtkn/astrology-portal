import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { getAstrodienstSky, getSkyPlacementSnapshot } from "../apps/web/src/services/ephemeris.ts";
const normalize = (value: string) => value.toLowerCase().replaceAll(" ", "-").replace("true-node", "north-node");
const cases = [
  ...[["mars","Leo"],["jupiter","Leo"],["saturn","Aries"],["uranus","Gemini"],["pluto","Aquarius"],["chiron","Aries"],["lilith","Capricorn"]].map(([planet,sign])=>["2026-10-14T16:00:00Z",planet,sign,"America/New_York"]),
  ["2026-12-05T17:00:00Z", "venus", "Scorpio", "America/New_York"],
  ["2026-10-14T16:00:00Z", "sun", "Libra", "America/New_York"],
  ["2027-11-27T17:00:00Z", "sun", "Gemini", "America/New_York"],
  ["2026-11-27T17:00:00Z", "moon", "Aries", "America/New_York"],
  ["2026-11-27T17:00:00Z", "mercury", "Cancer", "America/New_York"],
  ["2026-10-14T16:00:00Z", "venus", "Scorpio", "America/New_York"],
  ["2026-10-14T16:00:00Z", "neptune", "Aries", "America/New_York"],
  ["2026-10-14T16:00:00Z", "north-node", "Aquarius", "America/New_York"],
  ["2026-10-14T16:00:00Z", "south-node", "Leo", "America/New_York"],
  ["2026-10-14T16:00:00Z", "true-node", "Aquarius", "America/New_York"],
  ["2026-03-08T07:30:00Z", "sun", "Pisces", "America/New_York"],
  ["2026-11-01T05:30:00Z", "sun", "Scorpio", "Europe/London"]
];
const measurements = [];
for (const [reference, planet, sign, timeZone] of cases) {
  const location = { label: "Synthetic location", latitude: 40.7, longitude: -74, timeZone };
  const started = performance.now();
  const scoped = await getSkyPlacementSnapshot(location, planet, sign, new Date(reference), true, "placement");
  const scopedMs = performance.now() - started;
  const fullStarted = performance.now();
  const full = await getSkyPlacementSnapshot(location, planet, sign, new Date(reference), true);
  const fullMs = performance.now() - fullStarted;
  const target = normalize(planet);
  const selected = scoped.positions.find(p => normalize(p.planet) === target);
  assert.equal(selected?.sign, sign);
  assert.deepEqual(scoped.positions.map(p=>p.planet).sort(),["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn","Uranus","Neptune","Pluto","Chiron","Lilith","North Node","South Node"].sort());
  const pointIds = target.includes("node") ? ["north_node","south_node"] : [target.replaceAll("-","_")];
  assert.ok((scoped.facts?.filter(f=>pointIds.includes(f.planetOrPointId)).length??0)>=pointIds.length,"Selected structured position facts must be present");
  assert.deepEqual(scoped.facts?.filter(f=>pointIds.includes(f.planetOrPointId)),full.facts?.filter(f=>pointIds.includes(f.planetOrPointId)),"Selected structured fact records preserve exact timing fields");
  if (planet === "venus" && reference.startsWith("2026-12-05")) {
    assert.equal(scoped.generatedAt,new Date(reference).toISOString());
    assert.ok((selected?.residencyPasses??[]).some((pass,index)=>index>0&&Date.parse(pass.entryDate)<=Date.parse(reference)&&Date.parse(pass.exitDate)>Date.parse(reference)),"Venus fixture must actually be in its return visit");
  }
  assert.deepEqual(selected, full.positions.find(p => normalize(p.planet) === target), "Every selected timing/date/structural field must match the full snapshot");
  if (target.includes("node")) {
    for (const node of ["North Node", "South Node"]) assert.deepEqual(scoped.positions.find(p => p.planet===node),full.positions.find(p=>p.planet===node));
  }
  assert.deepEqual(scoped.placementAspectFacts, full.placementAspectFacts, "All exact in-sign and retrograde aspect events remain complete");
  assert.deepEqual(scoped.aspects, full.aspects, "Current aspect timing must remain intact");
  const base = await getAstrodienstSky(location, new Date(scoped.generatedAt));
  for (const position of scoped.positions) {
    const original = base.positions.find(p => p.planet === position.planet)!;
    for (const key of Object.keys(original).filter(key => original[key as keyof typeof original] !== undefined)) assert.deepEqual(position[key as keyof typeof position], original[key as keyof typeof original], `Base field ${position.planet}.${key}`);
  }
  for (const key of ["generatedAt", "location", "calculationProvenance", "ascendant", "midheaven", "houseCusps", "moonPhase", "moonStatus", "moonSignTransition", "moonEvent", "solarDaylight"] as const) assert.deepEqual(scoped[key],full[key]);
  measurements.push({planet,sign,timeZone,scopedMs:Math.round(scopedMs),fullMs:Math.round(fullMs)});
}
console.log(JSON.stringify(measurements));
console.log("PASS article-only timing scope: full selected facts, both nodes, true-node alias, Moon, retrograde/multiple visits, all base points/current aspect timing/daily facts/provenance, two years and DST zones.");
