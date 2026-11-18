import assert from "node:assert/strict";
import { buildChartReport } from "../apps/web/src/services/chartReport.ts";
import { chartCsv } from "../apps/web/src/services/chartCsv.ts";
import { wheelDegree } from "../apps/web/src/services/zodiacWheelFacts.ts";
import type { ZodiacWheelSnapshot } from "../apps/web/src/services/zodiacWheelFacts.ts";

const names = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
function snapshot(longitudes = names.map(() => 0)): ZodiacWheelSnapshot {
  return { generatedAt: "2000-01-01T12:00:00Z", positions: names.map((planet, index) => ({ planet, longitude: longitudes[index], glyph: "", signGlyph: "", sign: "Aries", degree: longitudes[index], house: 1, motion: "direct", speed: 0.5 })),
    aspects: [], ascendantLongitude: 30, midheavenLongitude: 300, birthTimeKnown: true };
}
const sky = buildChartReport({ kind: "sky", primary: snapshot() });
for (const kind of ["sky", "natal"] as const) {
  const precise = buildChartReport({ kind, primary: snapshot([0, 92 + 3 / 60, ...names.slice(2).map(() => 0)]) });
  const contact = precise.aspects.find(aspect => aspect.row === "Moon" && aspect.column === "Sun")!;
  assert.equal(contact.type, "square");
  assert(Math.abs(contact.orb - (2 + 3 / 60)) < 1e-10, `${kind} report retains the calculated orb before minute formatting`);
  assert.equal(wheelDegree(contact.orb), "2°03′");
  const wrap = buildChartReport({ kind, primary: snapshot([359.98, 0.02, ...names.slice(2).map(() => 0)]) });
  assert.equal(wheelDegree(wrap.aspects.find(aspect => aspect.row === "Moon" && aspect.column === "Sun")!.orb), "0°02′", `${kind} keeps a small conjunction across zero Aries`);
}
// Swiss Ephemeris longitudes at the four supplied 2026 lunation timestamps.
for (const [instant, first, firstLongitude, second, secondLongitude, type, orb] of [
  ["2026-11-09T07:01:48Z", "Venus", 203.3187760662519, "Mars", 142.67991626547018, "sextile", "0°38′"],
  ["2026-11-24T14:53:15Z", "Sun", 242.3359383137689, "Neptune", 1.7081330996433537, "trine", "0°38′"],
  ["2026-12-09T00:51:34Z", "Venus", 213.20933824296958, "Uranus", 63.132114748517445, "quincunx", "0°05′"],
  ["2026-12-24T01:27:55Z", "Sun", 272.23258134298504, "Neptune", 1.6488751237593477, "square", "0°35′"]
] as const) for (const kind of ["sky", "natal"] as const) {
  const data = snapshot();
  data.generatedAt = instant;
  data.positions = data.positions.filter(point => point.planet === first || point.planet === second)
    .map(point => ({ ...point, longitude: point.planet === first ? firstLongitude : secondLongitude }));
  const contact = buildChartReport({ kind, primary: data }).aspects[0];
  assert.equal(contact.type, type);
  assert.equal(wheelDegree(contact.orb), orb, `${kind} matches the reference's minute precision at ${instant}`);
}
assert.equal(sky.aspects.length, 45, "full sky grid must retain every contact, without a reader-card cap");
assert.equal(new Set(sky.aspects.map(aspect => aspect.id)).size, 45);
assert(sky.aspects.every(aspect => sky.rows.findIndex(point => point.name === aspect.row) > sky.columns.findIndex(point => point.name === aspect.column)), "single-chart matrix stores one lower triangle");
for (const kind of ["transit", "synastry"] as const) {
  const report = buildChartReport({ kind, primary: snapshot(), secondary: snapshot() });
  assert.equal(report.aspects.length, 100, `${kind} is a rectangular matrix, including same-planet contacts`);
  assert(report.aspects.some(aspect => aspect.row === "Sun" && aspect.column === "Sun"));
  assert(report.aspects.some(aspect => aspect.row === "Sun" && aspect.column === "Moon"));
  assert(report.aspects.some(aspect => aspect.row === "Moon" && aspect.column === "Sun"));
}
const unknown = buildChartReport({ kind: "natal", primary: { ...snapshot(), birthTimeKnown: false } }, true);
assert(unknown.rows.every(point => point.house === null));
assert(!unknown.rows.some(point => ["Ascendant", "Midheaven", "Lot of Fortune"].includes(point.name)));
assert(unknown.notes.some(note => note.startsWith("Birth time unknown")));
const known = buildChartReport({ kind: "natal", primary: snapshot() }, true);
assert.equal(known.identity, buildChartReport({ kind: "natal", primary: snapshot() }, false).identity, "display filters must not reset download privacy preferences");
assert(known.rows.some(point => point.name === "Ascendant"));
assert(!known.aspects.some(aspect => [aspect.row, aspect.column].every(name => ["Ascendant", "Midheaven"].includes(name))));
const composite = buildChartReport({ kind: "composite", primary: snapshot() });
assert.equal(composite.aspects.length, 45, "composite grid is not the capped composite reader list");
assert(composite.rows.every(point => !point.retrograde && point.speed === undefined));
assert(composite.aspects.every(aspect => aspect.applying === undefined));
const outer = snapshot(); outer.positions = [outer.positions[6]]; outer.positions[0].longitude = 2.5; outer.positions[0].degree = 2.5;
const inner = snapshot(); inner.positions = [inner.positions[0]];
assert.equal(buildChartReport({ kind: "transit", primary: outer, secondary: inner }).aspects.length, 0, "separating Saturn uses its shared 2-degree gate");
outer.positions[0].speed = -0.5;
const applying = buildChartReport({ kind: "transit", primary: outer, secondary: inner });
assert.equal(applying.aspects.length, 1, "applying Saturn uses its shared 3-degree gate");
assert.equal(applying.aspects[0].applying, true);
const fastOuter = snapshot(); fastOuter.positions = [{ ...fastOuter.positions[1], longitude: 59.98, speed: 13 }];
const fixedInner = snapshot(); fixedInner.positions = [{ ...fixedInner.positions[0], longitude: 0 }];
assert.equal(buildChartReport({ kind: "transit", primary: fastOuter, secondary: fixedInner }).aspects[0].applying, true, "fast applying Moon must not be mislabelled after a forward sample overshoots exactness");
fastOuter.positions[0].longitude = 60.02;
assert.equal(buildChartReport({ kind: "transit", primary: fastOuter, secondary: fixedInner }).aspects[0].applying, false);
fastOuter.positions[0].longitude = 59.98; fastOuter.positions[0].speed = -13;
assert.equal(buildChartReport({ kind: "transit", primary: fastOuter, secondary: fixedInner }).aspects[0].applying, false, "the instantaneous phase respects retrograde motion");
inner.positions[0].planet = "Saturn";
assert.equal(buildChartReport({ kind: "synastry", primary: outer, secondary: inner }).aspects.length, 0, "same outer-planet synastry contacts keep the shared tighter gate");
const invalid = snapshot(); invalid.positions[0].longitude = NaN; invalid.positions[0].sign = "Unknown";
assert(!buildChartReport({ kind: "sky", primary: invalid }).rows.some(point => point.name === "Sun"));
assert.equal(buildChartReport({ kind: "transit", primary: snapshot() }).aspects.length, 0);
const privateReport = buildChartReport({ kind: "synastry", primary: snapshot(), secondary: snapshot(), primaryLabel: "Private Person", secondaryLabel: '=HYPERLINK("example")' });
const options = { report: privateReport, scope: "full" as const, metadata: "Private date and name", includeDetails: false };
const csv = chartCsv(options);
assert(csv.includes('"Brand","TLDR Astro"'));
assert(!csv.includes("Private") && !csv.includes("HYPERLINK"), "private metadata is omitted when unchecked");
assert(csv.includes("Person B · outer") && csv.includes("Person A · inner"));
const detailedCsv = chartCsv({ ...options, includeDetails: true });
assert(detailedCsv.includes("'=HYPERLINK"), "CSV spreadsheet formulas are escaped");
assert(!chartCsv({ ...options, scope: "wheel" }).includes("Orb (degrees)"));
assert(!chartCsv({ ...options, scope: "grid" }).includes("Degree in sign"));
console.log("Chart reports passed: all five matrices, uncapped contacts, direction, unknown time, composite motion, invalid data, CSV scope and privacy.");
