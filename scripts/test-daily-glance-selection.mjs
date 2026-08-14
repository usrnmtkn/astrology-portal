#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import {
  selectDailyGlanceCivilDayDriver,
  selectDailyGlanceDriver
} from "../apps/web/src/services/chartMath.ts";

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

assert.deepEqual(
  selectDailyGlanceCivilDayDriver(7, 14, [
    { planet: "Mercury", longitude: 314 },
    { planet: "Mars", longitude: 327 }
  ], 11),
  {
    kind: "aspect",
    natal: "Mercury",
    aspect: "sextile",
    orb: 0,
    selectionScope: "civil-day-exact",
    exactOffsetDays: 0.5
  },
  "A future exact contact inside the civil day must replace a repeated house fallback."
);

assert.deepEqual(
  selectDailyGlanceCivilDayDriver(20, 14, [
    { planet: "Mercury", longitude: 314 },
    { planet: "Mars", longitude: 327 }
  ], 11),
  {
    kind: "aspect",
    natal: "Mars",
    aspect: "sextile",
    orb: 0,
    selectionScope: "civil-day-exact",
    exactOffsetDays: 0.5
  },
  "Consecutive dates may resolve to different exact Moon contacts instead of repeating the house card."
);

assert.deepEqual(
  selectDailyGlanceCivilDayDriver(20, 14, [
    { planet: "Mercury", longitude: 312 }
  ], 11),
  { kind: "house", house: 11 },
  "A contact exact before local midnight must not be carried into the selected day."
);

assert.deepEqual(
  selectDailyGlanceCivilDayDriver(30, null, natalTarget, 9),
  { kind: "house", house: 9 },
  "Missing ephemeris speed must preserve the fail-closed noon selector."
);

const appSource = [
  fs.readFileSync(new URL("../apps/web/src/App.tsx", import.meta.url), "utf8"),
  fs.readFileSync(new URL("../apps/web/src/features/friends/ManualChartsPanel.tsx", import.meta.url), "utf8")
].join("\n");
const driverStart = appSource.indexOf("function dailyGlanceDriver(");
const driverEnd = appSource.indexOf("\nfunction dailyGlanceGeneratedContent(", driverStart);
const driverSource = appSource.slice(driverStart, driverEnd);
const skyDateTimeStart = appSource.indexOf("function skyDateTimeFromInput(");
const skyDateTimeEnd = appSource.indexOf("\nfunction skyFactValidation(", skyDateTimeStart);
const skyDateTimeSource = appSource.slice(skyDateTimeStart, skyDateTimeEnd);
assert.ok(driverStart >= 0 && driverEnd > driverStart, "The Daily At-a-Glance driver must exist.");
assert.ok(
  skyDateTimeStart >= 0 && skyDateTimeEnd > skyDateTimeStart,
  "The selected-date sky timestamp helper must exist."
);
assert.match(
  skyDateTimeSource,
  /withTimeZone\(location\)[\s\S]*?zonedDateTimeToUtc\(value, "12:00 PM", resolvedLocation\.timeZone\)/u,
  "The Moon scan anchor must be noon in the reader's selected location timezone, not UTC noon."
);
assert.match(
  driverSource,
  /selectDailyGlanceCivilDayDriver\([\s\S]*?moon\.longitude,[\s\S]*?moon\.speed,[\s\S]*?natalSky\.positions,[\s\S]*?house/u,
  "Daily At-a-Glance must compare supported natal positions across the Moon's ephemeris-derived civil-day arc."
);
assert.match(
  driverSource,
  /const house = !birthTimeUnknown && natalSky\.ascendant[\s\S]*?wholeSignHouseForSign\(moon\.sign, natalSky\.ascendant\)/u,
  "Daily At-a-Glance house fallback must be calculated from the subject chart's reliable Ascendant."
);
assert.doesNotMatch(
  driverSource,
  /typeof moon\.house/u,
  "Daily At-a-Glance must not reuse a Moon house calculated for another chart."
);
assert.doesNotMatch(
  driverSource,
  /natalTransitTargets/u,
  "Ascendant and Descendant must not enter the Daily At-a-Glance contact race."
);
assert.match(
  appSource,
  /function friendDailyGlance\([\s\S]*?dailyGlanceDriver\(currentSky, natalSky, birthTimeUnknown\)[\s\S]*?renderDailyGlance/u,
  "Friends must use the same chart-specific daily driver and authored renderer as You."
);
assert.match(
  appSource,
  /const moonHouse = !birthTimeUnknown && natalSky\.ascendant[\s\S]*?wholeSignHouseForSign\(moon\.sign, natalSky\.ascendant\)[\s\S]*?moonContext/u,
  "Friends daily must derive the Moon's house from the friend's reliable Ascendant independently of the prose driver."
);
assert.match(
  appSource,
  /return \{[\s\S]*?headline: rendered\.headline[\s\S]*?body: rendered\.body[\s\S]*?moonContext/u,
  "Aspect-driven and house-fallback Friends daily copy must retain the computed Moon context."
);
assert.match(
  appSource,
  /dailyMoonDriver\.selectionScope === "civil-day-exact"[\s\S]*?\? "Today"/u,
  "A civil-day exact Moon driver must keep the Behind-this-forecast label scoped to today."
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

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vite = await createServer({
  root: repoRoot,
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
  logLevel: "error"
});

try {
  const { defaultLocation, getAstrodienstSky } = await vite.ssrLoadModule("/apps/web/src/services/ephemeris.ts");
  const { zonedDateTimeToUtc } = await vite.ssrLoadModule("/apps/web/src/services/timezones.ts");
  const ephemerisCases = [
    {
      noon: "2026-08-30T16:00:00.000Z",
      lateEvening: "2026-08-31T03:00:00.000Z"
    },
    {
      noon: "2026-08-31T16:00:00.000Z",
      lateEvening: "2026-09-01T03:00:00.000Z"
    }
  ];

  for (const fixture of ephemerisCases) {
    const [noonSky, lateEveningSky] = await Promise.all([
      getAstrodienstSky(defaultLocation, new Date(fixture.noon)),
      getAstrodienstSky(defaultLocation, new Date(fixture.lateEvening))
    ]);
    const noonMoon = noonSky.positions.find((position) => position.planet === "Moon");
    const lateEveningMoon = lateEveningSky.positions.find((position) => position.planet === "Moon");
    assert.equal(typeof noonMoon?.longitude, "number");
    assert.equal(typeof noonMoon?.speed, "number");
    assert.equal(typeof lateEveningMoon?.longitude, "number");

    const natalLongitude = ((lateEveningMoon.longitude - 60) % 360 + 360) % 360;
    const selected = selectDailyGlanceCivilDayDriver(
      noonMoon.longitude,
      noonMoon.speed,
      [{ planet: "Mercury", longitude: natalLongitude }],
      11
    );

    assert.equal(selected?.kind, "aspect");
    assert.equal(selected?.selectionScope, "civil-day-exact");
    assert.equal(selected?.natal, "Mercury");
    assert.equal(selected?.aspect, "sextile");
  }

  const utcMinusEightZone = "Etc/GMT+8";
  const utcMinusEightLocation = {
    ...defaultLocation,
    timeZone: utcMinusEightZone
  };
  const localDate = "2026-01-15";
  const localNoon = zonedDateTimeToUtc(localDate, "12:00 PM", utcMinusEightZone);
  const sameLocalDayAfterUtcMidnight = zonedDateTimeToUtc(localDate, "11:00 PM", utcMinusEightZone);
  const priorLocalDayAfterUtcMidnight = zonedDateTimeToUtc("2026-01-14", "11:00 PM", utcMinusEightZone);

  assert.equal(localNoon.toISOString(), "2026-01-15T20:00:00.000Z");
  assert.equal(sameLocalDayAfterUtcMidnight.toISOString(), "2026-01-16T07:00:00.000Z");
  assert.equal(priorLocalDayAfterUtcMidnight.toISOString(), "2026-01-15T07:00:00.000Z");

  const [localNoonSky, sameLocalDaySky, priorLocalDaySky] = await Promise.all([
    getAstrodienstSky(utcMinusEightLocation, localNoon),
    getAstrodienstSky(utcMinusEightLocation, sameLocalDayAfterUtcMidnight),
    getAstrodienstSky(utcMinusEightLocation, priorLocalDayAfterUtcMidnight)
  ]);
  const localNoonMoon = localNoonSky.positions.find((position) => position.planet === "Moon");
  const sameLocalDayMoon = sameLocalDaySky.positions.find((position) => position.planet === "Moon");
  const priorLocalDayMoon = priorLocalDaySky.positions.find((position) => position.planet === "Moon");
  assert.equal(typeof localNoonMoon?.longitude, "number");
  assert.equal(typeof localNoonMoon?.speed, "number");
  assert.equal(typeof sameLocalDayMoon?.longitude, "number");
  assert.equal(typeof priorLocalDayMoon?.longitude, "number");

  const sameLocalDayNatalLongitude = ((sameLocalDayMoon.longitude - 60) % 360 + 360) % 360;
  const priorLocalDayNatalLongitude = ((priorLocalDayMoon.longitude - 60) % 360 + 360) % 360;
  const sameLocalDaySelection = selectDailyGlanceCivilDayDriver(
    localNoonMoon.longitude,
    localNoonMoon.speed,
    [{ planet: "Mercury", longitude: sameLocalDayNatalLongitude }],
    11
  );
  const priorLocalDaySelection = selectDailyGlanceCivilDayDriver(
    localNoonMoon.longitude,
    localNoonMoon.speed,
    [{ planet: "Mercury", longitude: priorLocalDayNatalLongitude }],
    11
  );

  assert.equal(
    sameLocalDaySelection?.selectionScope,
    "civil-day-exact",
    "At UTC-8, a contact after UTC midnight but before local midnight must remain on the selected local date."
  );
  assert.deepEqual(
    priorLocalDaySelection,
    { kind: "house", house: 11 },
    "At UTC-8, a contact after UTC midnight on the prior local evening must not leak into the selected local date."
  );
} finally {
  await vite.close();
}

console.log("daily At-a-Glance applying-selection checks passed");
