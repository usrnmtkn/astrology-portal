import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import SwissEph from "swisseph-wasm";

import { canonicalNatalAspectsForSnapshot } from "../apps/web/src/services/natalAspectFacts.ts";
import {
  completeNatalAspectsForPlacement,
  uniqueDisplayableNatalAspects
} from "../apps/web/src/services/natalAspectDisplay.ts";
import {
  calculateNatalAspects,
  calculateSkyAspects,
  NATAL_ASPECT_DEFINITIONS
} from "../packages/astro-knowledge/engine/sky-aspects/browser.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { ORB_PROFILES } = require("../packages/astro-knowledge/engine/timing/aspects.js");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const zodiacSigns = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];
const position = (planet, longitude) => ({
  planet,
  glyph: "",
  longitude,
  sign: zodiacSigns[Math.floor(longitude / 30)],
  signGlyph: "♈",
  degree: longitude % 30,
  house: 1,
  motion: "direct"
});
const aspectKey = ({ from, type, to }) => `${from}|${type}|${to}`;

assert.deepEqual(
  Object.fromEntries(NATAL_ASPECT_DEFINITIONS
    .filter(({ type }) => type !== "quincunx")
    .map(({ type, maxOrb }) => [type, maxOrb])),
  Object.fromEntries(Object.entries(ORB_PROFILES.natal).filter(([key]) => !key.startsWith("luminaryModifier"))),
  "The reader natal matrix must stay aligned with the canonical timing-engine natal orb profile."
);
NATAL_ASPECT_DEFINITIONS.forEach((definition) => {
  const expectedModifier = ORB_PROFILES.natal.luminaryModifiers?.[definition.type]
    ?? (definition.type === "quincunx" ? 0 : ORB_PROFILES.natal.luminaryModifier);
  assert.equal(
    definition.luminaryModifier,
    expectedModifier,
    `The ${definition.type} natal reader matrix must stay aligned with the canonical luminary modifier.`
  );
});

const snapshot = {
  positions: [
    position("Sun", 0),
    position("Moon", 90),
    position("Mercury", 20),
    position("Saturn", 200),
    position("Chiron", 43),
    position("Transit Mercury", 110)
  ],
  aspects: [
    {
      id: "leaked-sky-mercury-sextile-chiron",
      from: "Mercury",
      to: "Chiron",
      type: "sextile",
      orb: 1,
      exactAt: "2026-08-12T00:00:00.000Z",
      timing: {
        group: "this-week",
        phase: "building",
        engagementStart: "2026-08-11T00:00:00.000Z",
        engagementEnd: "2026-08-13T00:00:00.000Z",
        passIndex: 0,
        exactPasses: []
      }
    },
    {
      id: "leaked-transit-mercury-square-saturn",
      from: "Transit Mercury",
      to: "Saturn",
      type: "square",
      orb: 0
    }
  ]
};

const actual = canonicalNatalAspectsForSnapshot(snapshot);
assert.deepEqual(
  actual,
  canonicalNatalAspectsForSnapshot({ ...snapshot, aspects: [] }),
  "Every incoming aspect record must be ignored at the natal reader boundary."
);
assert.deepEqual(
  actual,
  canonicalNatalAspectsForSnapshot({
    ...snapshot,
    positions: snapshot.positions.map(({ longitude: _longitude, ...savedPosition }) => savedPosition)
  }),
  "Legacy saved charts must reconstruct fixed natal longitudes from sign and degree."
);
assert.deepEqual(
  actual.map(({ from, type, to, orb }) => ({ from, type, to, orb })),
  [
    { from: "Sun", type: "square", to: "Moon", orb: 0 },
    { from: "Mercury", type: "opposition", to: "Saturn", orb: 0 }
  ],
  "Natal surfaces must derive aspects only from canonical natal point longitudes."
);
assert.equal(
  actual.some((aspect) => aspect.from === "Mercury" && aspect.type === "sextile" && aspect.to === "Chiron"),
  false,
  "A sky/transit Mercury-sextile-Chiron record must not enter a natal surface when natal geometry does not support it."
);
assert.equal(actual.some((aspect) => "exactAt" in aspect || "timing" in aspect || "series" in aspect), false);
assert.equal(actual.some((aspect) => aspect.from.startsWith("Transit ") || aspect.to.startsWith("Transit ")), false);

const marieMoonRegression = {
  positions: [
    position("Moon", 222.7888),
    position("Mercury", 337.0589),
    position("Venus", 284.9428),
    position("Mars", 322.7631),
    position("Jupiter", 120.9424),
    position("Saturn", 161.4219),
    position("Uranus", 230.9859),
    position("Chiron", 35.6203),
    position("Lilith", 155.9261),
    position("North Node", 167.5673)
  ],
  aspects: [{ from: "Moon", type: "sextile", to: "Neptune", orb: 1 }],
  ascendantLongitude: 71.0469,
  midheavenLongitude: 316.573
};
const marieMoonAspects = canonicalNatalAspectsForSnapshot(marieMoonRegression)
  .filter((aspect) => aspect.from === "Moon" || aspect.to === "Moon")
  .map(aspectKey);

assert.deepEqual(
  marieMoonAspects,
  [
    "Moon|sextile|Saturn",
    "Moon|quincunx|Ascendant",
    "Moon|sextile|Venus",
    "Moon|square|Midheaven",
    "Moon|sextile|North Node",
    "Moon|trine|Mercury",
    "Moon|sextile|Lilith",
    "Moon|opposition|Chiron",
    "Moon|conjunction|Uranus",
    "Moon|square|Mars",
    "Moon|square|Jupiter"
  ],
  "Marie Moon regression: the actual birth-chart geometry must retain every canonical Moon contact."
);
assert.equal(
  calculateSkyAspects(marieMoonRegression.positions).some((aspect) => (
    aspectKey(aspect) === "Moon|square|Jupiter" || aspectKey(aspect) === "Moon|conjunction|Uranus"
  )),
  false,
  "The sky/transit matrix must stay narrow; natal surfaces must not reuse it."
);

const boundaryCases = calculateNatalAspects([
  position("Sun", 0),
  position("Moon", 99),
  position("Mercury", 109),
  position("Venus", 206),
  position("Mars", 198.1),
  position("Jupiter", 252.1),
  position("Saturn", 67.1)
]);
assert.equal(boundaryCases.some((aspect) => aspectKey(aspect) === "Sun|square|Moon"), true, "A 9-degree luminary square must be retained.");
assert.equal(boundaryCases.some((aspect) => aspectKey(aspect) === "Moon|conjunction|Mercury"), true, "A 10-degree luminary conjunction must be retained.");
assert.equal(boundaryCases.some((aspect) => aspectKey(aspect) === "Mercury|square|Venus"), true, "A 7-degree non-luminary square must be retained.");
assert.equal(boundaryCases.some((aspect) => aspectKey(aspect) === "Moon|trine|Mars"), false, "A luminary trine beyond 9 degrees must fail closed.");
assert.equal(boundaryCases.some((aspect) => aspectKey(aspect) === "Moon|quincunx|Jupiter"), false, "Quincunx must not receive a luminary orb expansion.");
assert.equal(boundaryCases.some((aspect) => aspectKey(aspect) === "Sun|sextile|Saturn"), false, "A luminary sextile beyond 7 degrees must fail closed.");

assert.equal(
  calculateNatalAspects([position("Moon", 0), position("Mars", 102)])
    .some((aspect) => aspectKey(aspect) === "Moon|square|Mars"),
  true,
  "A 12-degree luminary square is included at the canonical boundary."
);
assert.equal(
  calculateNatalAspects([position("Moon", 0), position("Mars", 102.1)])
    .some((aspect) => aspectKey(aspect) === "Moon|square|Mars"),
  false,
  "A luminary square beyond 12 degrees must fail closed."
);

const angleAspects = canonicalNatalAspectsForSnapshot({
  positions: [position("Moon", 220)],
  aspects: [],
  ascendantLongitude: 310,
  midheavenLongitude: 40
}).map(aspectKey);
assert.deepEqual(
  angleAspects,
  ["Moon|square|Ascendant", "Moon|opposition|Midheaven"],
  "Natal Ascendant and Midheaven contacts must be calculated from fixed angle longitudes."
);

function normalizeDegrees(degrees) {
  return ((degrees % 360) + 360) % 360;
}

function separation(first, second) {
  const difference = Math.abs(normalizeDegrees(first - second));
  return difference > 180 ? 360 - difference : difference;
}

function referenceNatalMatrix(positions) {
  const pointOrder = [
    "Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn",
    "Uranus", "Neptune", "Pluto", "Chiron", "Lilith", "North Node",
    "South Node", "Ascendant", "Midheaven"
  ];
  const ordered = [...positions].sort((first, second) => pointOrder.indexOf(first.planet) - pointOrder.indexOf(second.planet));
  const aspects = [];

  ordered.forEach((from, fromIndex) => {
    ordered.slice(fromIndex + 1).forEach((to) => {
      if ([from.planet, to.planet].every((planet) => planet === "Ascendant" || planet === "Midheaven")) return;
      const distance = separation(from.longitude, to.longitude);
      const hasLuminary = [from.planet, to.planet].some((planet) => planet === "Sun" || planet === "Moon");
      const match = NATAL_ASPECT_DEFINITIONS
        .map((definition) => ({
          ...definition,
          orb: Math.abs(distance - definition.exactAngle),
          effectiveMaxOrb: definition.maxOrb + (hasLuminary ? definition.luminaryModifier ?? 0 : 0)
        }))
        .filter(({ orb, effectiveMaxOrb }) => orb <= effectiveMaxOrb)
        .sort((first, second) => first.orb - second.orb)[0];

      if (match) aspects.push({ key: `${from.planet}|${match.type}|${to.planet}`, orb: Number(match.orb.toFixed(1)) });
    });
  });

  return aspects.sort((first, second) => first.key.localeCompare(second.key));
}

function utcHour(date) {
  return date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
}

const swe = new SwissEph();
await swe.initSwissEph();
const directBodies = [
  ["Sun", swe.SE_SUN], ["Moon", swe.SE_MOON], ["Mercury", swe.SE_MERCURY],
  ["Venus", swe.SE_VENUS], ["Mars", swe.SE_MARS], ["Jupiter", swe.SE_JUPITER],
  ["Saturn", swe.SE_SATURN], ["Uranus", swe.SE_URANUS], ["Neptune", swe.SE_NEPTUNE],
  ["Pluto", swe.SE_PLUTO], ["Chiron", 15], ["Lilith", 13], ["North Node", swe.SE_TRUE_NODE]
];

for (const date of [
  new Date("1978-11-15T14:30:00.000Z"),
  new Date("1979-02-18T16:20:00.000Z"),
  new Date("1990-01-01T12:00:00.000Z")
]) {
  const julianDay = swe.julday(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), utcHour(date));
  const flags = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED;
  const positions = directBodies.map(([planet, id]) => {
    const result = swe.calc_ut(julianDay, id, flags);
    return { planet, longitude: normalizeDegrees(result[0]), speed: result[3] };
  });
  const northNode = positions.find(({ planet }) => planet === "North Node");
  positions.push({ planet: "South Node", longitude: normalizeDegrees(northNode.longitude + 180), speed: northNode.speed });
  const houses = swe.houses(julianDay, 40.7128, -74.006, "W");
  positions.push({ planet: "Ascendant", longitude: normalizeDegrees(houses.ascmc[0]) });
  positions.push({ planet: "Midheaven", longitude: normalizeDegrees(houses.ascmc[1]) });

  const directActual = calculateNatalAspects(positions)
    .map((aspect) => ({ key: aspectKey(aspect), orb: aspect.orb }))
    .sort((first, second) => first.key.localeCompare(second.key));
  assert.deepEqual(
    directActual,
    referenceNatalMatrix(positions),
    `Natal aspect matrix must match direct Swiss Ephemeris positions at ${date.toISOString()}.`
  );

  const displayable = uniqueDisplayableNatalAspects(calculateNatalAspects(positions));
  positions.forEach(({ planet }) => {
    const expectedKeys = displayable
      .filter((aspect) => aspect.from === planet || aspect.to === planet)
      .map(aspectKey)
      .sort();
    const displayedKeys = completeNatalAspectsForPlacement(displayable, planet)
      .map(aspectKey)
      .sort();

    assert.deepEqual(
      displayedKeys,
      expectedKeys,
      `${planet} placement detail must retain every displayable natal aspect at ${date.toISOString()}.`
    );
  });
}

const app = read("apps/web/src/App.tsx");
const youPage = read("apps/web/src/features/you/YouPage.tsx");
const friendPanel = read("apps/web/src/features/friends/ManualChartsPanel.tsx");
const friendRail = read("apps/web/src/features/friends/FriendProfileChartRail.tsx");
const natalFacts = read("apps/web/src/services/natalAspectFacts.ts");

assert.match(natalFacts, /calculateNatalAspects\(canonicalNatalPositions\(snapshot\)\)/u, "The natal boundary must use the natal-orb matrix.");
assert.doesNotMatch(natalFacts, /calculateSkyAspects/u, "The natal boundary must never reuse the sky/transit-orb matrix.");
assert.match(app, /aspects: canonicalNatalAspectsForSnapshot\(natalSky\)/u, "You placement details must use the natal-only boundary.");
assert.match(app, /uniqueNatalAspectRows\(canonicalNatalAspectsForSnapshot\(natalSky\)\)/u, "You natal aspect lists must use the natal-only boundary.");
assert.match(youPage, /aspects=\{natalOnlyAspects\}/u, "The You natal wheel must use canonical natal-only aspects.");
assert.doesNotMatch(youPage, /aspects=\{natalSky\.aspects\}/u, "The You natal wheel must not trust the snapshot aspect list.");
assert.match(friendPanel, /groupFriendNatalAspects\(canonicalNatalAspectsForSnapshot\(selectedChart\.natalChart\)\)/u, "Friend natal lists must use the natal-only boundary.");
assert.match(friendPanel, /natalPlacementDetailArticle\(position, natalSky,/u, "Friend placement details must use the shared natal-only article boundary.");
assert.match(friendRail, /aspects=\{canonicalNatalAspectsForSnapshot\(natalSky\)\}/u, "The Friend natal wheel must use the natal-only boundary.");
assert.doesNotMatch(friendRail, /aspects=\{natalSky\.aspects\}/u, "The Friend natal wheel must not trust the snapshot aspect list.");

console.log("natal aspect fact boundary: ok (natal orbs, Marie Moon regression, angles, three direct ephemeris instants, complete placement inventories, and every You/Friend consumer)");
