import assert from "node:assert/strict";
import { buildChartReport } from "../apps/web/src/services/chartReport.ts";
import { chartCsv } from "../apps/web/src/services/chartCsv.ts";
import type { ZodiacWheelSnapshot } from "../apps/web/src/services/zodiacWheelFacts.ts";

const names = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
function snapshot(longitudes = names.map(() => 0)): ZodiacWheelSnapshot {
  return { generatedAt: "2000-01-01T12:00:00Z", positions: names.map((planet, index) => ({ planet, longitude: longitudes[index], glyph: "", signGlyph: "", sign: "Aries", degree: longitudes[index], house: 1, motion: "direct", speed: 0.5 })),
    aspects: [], ascendantLongitude: 30, midheavenLongitude: 300, birthTimeKnown: true };
}
const sky = buildChartReport({ kind: "sky", primary: snapshot() });
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
