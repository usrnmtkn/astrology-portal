#!/usr/bin/env node
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { outputFiles } = await build({
  stdin: {
    contents: [
      'export * from "./apps/web/src/components/reports/attributionFormat.ts";',
      'export { isReaderFacingCopy } from "./apps/web/src/content/readerSafety.ts";'
    ].join("\n"),
    resolveDir: repoRoot,
    sourcefile: "report-attribution-test-entry.ts"
  },
  bundle: true,
  format: "esm",
  platform: "node",
  write: false
});
const bundledModuleUrl = `data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString("base64")}`;
const {
  attributionGlyphs,
  formatAttribution,
  isReaderFacingCopy,
  ordinalHouse
} = await import(bundledModuleUrl);

const aspectCases = [
  ["conjunct", "At this time, Mercury is conjunct your natal Mercury."],
  ["sextile", "At this time, Mercury sextiles your natal Mercury."],
  ["square", "At this time, Mercury squares your natal Mercury."],
  ["trine", "At this time, Mercury trines your natal Mercury."],
  ["opposite", "At this time, Mercury is opposite your natal Mercury."]
];

for (const [aspect, expected] of aspectCases) {
  const output = formatAttribution({
    kind: "transit_to_natal",
    transitingBody: "mercury",
    natalBody: "mercury",
    aspect,
    timeframe: "time"
  });
  assert.equal(output, expected);
  assert.ok(isReaderFacingCopy(output));
  assert.doesNotMatch(output, /—/u);
}

assert.equal(
  formatAttribution({
    kind: "transit_to_natal",
    transitingBody: "uranus",
    natalBody: "mercury",
    aspect: "square",
    timeframe: "season"
  }),
  "During this season, Uranus squares your natal Mercury."
);

assert.equal(
  formatAttribution({
    kind: "transit_to_natal",
    transitingBody: "saturn",
    natalBody: "saturn",
    exactDate: "2027-05-03",
    passIndex: 2,
    passCount: 3
  }),
  "Saturn is exact on your natal Saturn on May 3, 2027, the second of three passes."
);

const houseOrdinals = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
for (const [index, expectedOrdinal] of houseOrdinals.entries()) {
  const house = index + 1;
  assert.equal(ordinalHouse(house), expectedOrdinal);
  const output = formatAttribution({
    kind: "solar_return_to_natal",
    solarReturnBody: "sun",
    natalHouse: house
  });
  assert.equal(output, `Your Solar Return Sun falls in your natal ${expectedOrdinal} house.`);
  assert.ok(isReaderFacingCopy(output));
}

assert.deepEqual(
  attributionGlyphs({
    kind: "transit_to_natal",
    transitingBody: "uranus",
    natalBody: "mercury",
    aspect: "square"
  }).map(({ value }) => value),
  ["♅", "□", "☿"]
);
assert.deepEqual(
  attributionGlyphs({ kind: "solar_return_to_natal", solarReturnBody: "sun", natalHouse: 4 }).map(({ value }) => value),
  ["☉", "IV"]
);

assert.throws(() => ordinalHouse(13), RangeError);
assert.throws(() => formatAttribution({
  kind: "transit_to_natal",
  transitingBody: "saturn",
  natalBody: "saturn"
}), TypeError);

console.log("report attribution verbs, directions, pass series, glyphs, and house ordinals passed");
