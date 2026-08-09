#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { selectDailyGlanceDriver } from "../apps/web/src/services/chartMath.ts";

const natalTarget = [{ planet: "Mars", longitude: 0 }];
const aspectFixtures = [
  { aspect: "conjunction", applying: 356, separating: 4 },
  { aspect: "sextile", applying: 56, separating: 64 },
  { aspect: "square", applying: 86, separating: 94 },
  { aspect: "trine", applying: 116, separating: 124 },
  { aspect: "opposition", applying: 176, separating: 184 }
];

for (const fixture of aspectFixtures) {
  assert.deepEqual(
    selectDailyGlanceDriver(fixture.applying, natalTarget, 6),
    { kind: "aspect", natal: "Mars", aspect: fixture.aspect, orb: 4 },
    `${fixture.aspect} must be selected while the Moon is applying.`
  );
  assert.deepEqual(
    selectDailyGlanceDriver(fixture.separating, natalTarget, 6),
    { kind: "house", house: 6 },
    `${fixture.aspect} must fall through to the house after the Moon separates.`
  );
}

assert.deepEqual(
  selectDailyGlanceDriver(236, natalTarget, 6),
  { kind: "aspect", natal: "Mars", aspect: "trine", orb: 4 },
  "The applying check must recognize the second exact longitude of a soft aspect."
);

assert.deepEqual(
  selectDailyGlanceDriver(30, natalTarget, 9),
  { kind: "house", house: 9 },
  "A day with no in-orb contact must exercise the house fallback."
);

assert.equal(
  selectDailyGlanceDriver(30, natalTarget, null),
  null,
  "Selection must fail closed when neither an applying contact nor a house is available."
);

assert.deepEqual(
  selectDailyGlanceDriver(86, [
    { planet: "Mars", longitude: 0 },
    { planet: "Venus", longitude: 178 }
  ], 6),
  { kind: "aspect", natal: "Venus", aspect: "square", orb: 2 },
  "The tightest applying contact must win across natal targets."
);

assert.deepEqual(
  selectDailyGlanceDriver(86, [
    { planet: "Ascendant", longitude: 176 },
    { planet: "Descendant", longitude: 356 },
    { planet: "Mars", longitude: 178 }
  ], 6),
  { kind: "aspect", natal: "Mars", aspect: "square", orb: 2 },
  "A tighter angle contact must be ignored in favor of the supported applying contact."
);

const appSource = [
  fs.readFileSync(new URL("../apps/web/src/App.tsx", import.meta.url), "utf8"),
  fs.readFileSync(new URL("../apps/web/src/features/friends/ManualChartsPanel.tsx", import.meta.url), "utf8")
].join("\n");
const driverStart = appSource.indexOf("function dailyGlanceDriver(");
const driverEnd = appSource.indexOf("\nfunction dailyGlanceGeneratedContent(", driverStart);
const driverSource = appSource.slice(driverStart, driverEnd);
assert.ok(driverStart >= 0 && driverEnd > driverStart, "The Daily At-a-Glance driver must exist.");
assert.match(
  driverSource,
  /selectDailyGlanceDriver\(moon\.longitude, natalSky\.positions, house\)/u,
  "Daily At-a-Glance must compare only supported natal positions."
);
assert.doesNotMatch(
  driverSource,
  /natalTransitTargets/u,
  "Ascendant and Descendant must not enter the Daily At-a-Glance contact race."
);
assert.match(
  appSource,
  /function friendDailyGlance\([\s\S]*?dailyGlanceDriver\(currentSky, natalSky\)[\s\S]*?renderDailyGlance/u,
  "Friends must use the same chart-specific daily driver and authored renderer as You."
);
assert.match(
  appSource,
  /author 2–3 approved variants per[\s\S]*?chart id \+ date \+ driver/u,
  "The approved deterministic copy-variant follow-up must remain recorded without changing today's driver."
);
assert.match(
  appSource,
  /"North Node": "South Node"[\s\S]*?"South Node": "North Node"/u,
  "Transit deduplication must treat the lunar nodes as a single axis."
);

console.log("daily At-a-Glance applying-selection checks passed");
