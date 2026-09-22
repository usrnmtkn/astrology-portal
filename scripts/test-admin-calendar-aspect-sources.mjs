#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  calendarAspectDisplayTitle,
  calendarAspectMatchesSelection,
  calendarAspectSearchMatches,
  calendarAspectSelectionOptions,
  calendarAspectSignedTitle,
  normalizeCalendarAspectSearch,
  parseCalendarAspectContentKey
} from "../apps/admin/src/calendarAspectSources.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

assert.deepEqual(parseCalendarAspectContentKey("sky.aspect.moon.sextile.lilith"), {
  first: "moon",
  aspect: "sextile",
  second: "lilith"
});
assert.deepEqual(parseCalendarAspectContentKey("sky.aspect.mercury.square.lilith"), {
  first: "mercury",
  aspect: "square",
  second: "lilith"
});
assert.deepEqual(parseCalendarAspectContentKey("sky.aspect.sun.trine.chiron.leo.taurus"), {
  first: "sun",
  aspect: "trine",
  second: "chiron",
  firstSign: "leo",
  secondSign: "taurus"
});
assert.deepEqual(parseCalendarAspectContentKey("sky-card/venus/libra/square/saturn/aries"), {
  first: "venus",
  aspect: "square",
  second: "saturn",
  firstSign: "libra",
  secondSign: "aries"
});
assert.deepEqual(parseCalendarAspectContentKey("fallback-hook/sky-aspect-sign/venus/libra/square/saturn/aries"), {
  first: "venus",
  aspect: "square",
  second: "saturn",
  firstSign: "libra",
  secondSign: "aries"
});
assert.equal(parseCalendarAspectContentKey("sky.placement.moon.libra"), null);
assert.equal(
  calendarAspectDisplayTitle({ first: "moon", aspect: "sextile", second: "lilith" }),
  "Moon Sextile Lilith"
);
assert.equal(calendarAspectSignedTitle("sky.aspect.moon.sextile.neptune.aquarius.aries"), "Moon in Aquarius Sextile Neptune in Aries");
assert.equal(calendarAspectSignedTitle("sky.aspect.moon.sextile.neptune"), null);
assert.equal(calendarAspectSignedTitle("sky.aspect.moon.sextile.neptune.2026-09-22"), null);
assert.equal(calendarAspectSignedTitle("sky.aspect.moon.sextile.neptune.revision.1"), null);
assert.equal(calendarAspectSignedTitle("sky.placement.moon.aquarius"), null);
const signedKeys = [
  "sky.aspect.venus.square.saturn.libra.aries",
  "sky-card/venus/libra/square/saturn/aries",
  "fallback-hook/sky-aspect-sign/venus/libra/square/saturn/aries"
];
for (const content_key of signedKeys) {
  assert.equal(calendarAspectSignedTitle(content_key), "Venus in Libra Square Saturn in Aries");
  for (const selection of [
    { first: "venus", firstSign: "libra", aspect: "square", second: "saturn", secondSign: "aries" },
    { first: "saturn", firstSign: "aries", aspect: "square", second: "venus", secondSign: "libra" }
  ]) {
    const entries = Object.entries(selection);
    for (let mask = 0; mask < 32; mask += 1) {
      const partial = Object.fromEntries(entries.filter((_, index) => mask & (1 << index)));
      assert.ok(calendarAspectMatchesSelection({ content_key }, partial), `${content_key}: ${JSON.stringify(partial)}`);
    }
  }
  for (const mismatch of [
    { first: "venus", firstSign: "aries" },
    { second: "saturn", secondSign: "libra" },
    { firstSign: "libra", secondSign: "libra" },
    { firstSign: "taurus" },
    { first: "venus", second: "saturn", aspect: "trine" }
  ]) assert.equal(calendarAspectMatchesSelection({ content_key }, mismatch), false);
}
assert.equal(calendarAspectMatchesSelection({ content_key: "sky.aspect.venus.square.saturn" }, { firstSign: "libra" }), false);

assert.equal(normalizeCalendarAspectSearch("Mercury squares Lilith Rx"), "mercury square lilith");
assert.equal(normalizeCalendarAspectSearch("Moon sextiles Lilith"), "moon sextile lilith");
assert.ok(calendarAspectSearchMatches(
  "sky.aspect.mercury.square.lilith Mercury Square Lilith",
  "Mercury squares Lilith"
));
assert.ok(calendarAspectSearchMatches(
  "sky.aspect.mercury.square.lilith Mercury Square Lilith",
  "Mercury squares Lilith Rx"
));
assert.ok(calendarAspectSearchMatches(
  "sky.aspect.moon.sextile.lilith Moon Sextile Lilith",
  "Moon sextile Lilith"
));
assert.equal(calendarAspectSearchMatches(
  "sky.aspect.mercury.square.lilith Mercury Square Lilith",
  "Moon sextile Lilith"
), false);

const options = calendarAspectSelectionOptions([
  { content_key: "sky.aspect.moon.sextile.lilith" },
  { content_key: "sky-card/venus/libra/square/saturn/aries" }
]);
assert.ok(options.first.includes("moon"));
assert.ok(options.first.includes("lilith"));
assert.ok(options.first.includes("mercury"));
assert.ok(options.aspects.includes("sextile"));
assert.ok(options.aspects.includes("square"));
assert.ok(calendarAspectMatchesSelection(
  { content_key: "sky.aspect.moon.sextile.lilith" },
  { first: "moon", aspect: "sextile", second: "lilith" }
));
assert.ok(calendarAspectMatchesSelection(
  { content_key: "sky.aspect.moon.sextile.lilith" },
  { first: "lilith", aspect: "sextile", second: "moon" }
));
assert.equal(calendarAspectMatchesSelection(
  { content_key: "sky.aspect.mercury.square.lilith" },
  { first: "moon", aspect: "sextile", second: "lilith" }
), false);

const dashboardSource = fs.readFileSync(path.join(repoRoot, "apps/admin/src/GeneratedContentAdminDashboard.tsx"), "utf8");
assert.match(dashboardSource, /calendarAspectSelectionOptions/u, "Calendar Aspects must expose planet and aspect dropdowns.");
assert.match(dashboardSource, /normalizeCalendarAspectSearch|calendarAspectSearchMatches/u, "Calendar Aspects search must accept squares and ignore Rx.");
assert.match(dashboardSource, /aria-label="Calendar aspect planet or point"/u);
assert.match(dashboardSource, /aria-label="Calendar aspect type"/u);
assert.match(dashboardSource, /aria-label="Other calendar aspect planet or point"/u);
