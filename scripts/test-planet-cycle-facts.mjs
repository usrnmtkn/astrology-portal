#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import SwissEph from "swisseph-wasm";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const factsPath = path.join(repoRoot, "packages", "astro-knowledge", "data", "modifiers", "planet-cycle-facts.json");
const facts = JSON.parse(fs.readFileSync(factsPath, "utf8"));
const swe = new SwissEph();
await swe.initSwissEph();

assert.equal(facts.status, "REVIEWED");
assert.match(facts.note, /Owner reviewed/u);

const bodies = {
  sun: swe.SE_SUN,
  moon: swe.SE_MOON,
  mercury: swe.SE_MERCURY,
  venus: swe.SE_VENUS,
  mars: swe.SE_MARS,
  jupiter: swe.SE_JUPITER,
  saturn: swe.SE_SATURN,
  uranus: swe.SE_URANUS,
  neptune: swe.SE_NEPTUNE,
  pluto: swe.SE_PLUTO,
  chiron: 15,
  "north-node": swe.SE_TRUE_NODE
};

const circuitChecks = {
  sun: { days: 365.2425, maxSeparation: 1 },
  moon: { days: 27.3217, maxSeparation: 2 },
  mercury: { days: 365.25, maxSeparation: 20 },
  venus: { days: 365.25, maxSeparation: 100 },
  mars: { days: 686.98, maxSeparation: 20 },
  jupiter: { days: 4332.59, maxSeparation: 15 },
  saturn: { days: 10759.22, maxSeparation: 15 },
  uranus: { days: 30688.5, maxSeparation: 5 },
  neptune: { days: 60182, maxSeparation: 5 },
  pluto: { days: 90560, maxSeparation: 8 },
  chiron: { days: 18262, maxSeparation: 10 },
  "north-node": { days: 6798.4, maxSeparation: 5 }
};

const residencyChecks = {
  sun: { start: "2020-01-01", end: "2040-01-01", stepDays: 1, minDays: 27, maxDays: 33 },
  moon: { start: "2025-01-01", end: "2026-01-01", stepDays: 0.25, minDays: 2, maxDays: 3 },
  mercury: { start: "2020-01-01", end: "2040-01-01", stepDays: 1, minDays: 14, maxDays: 62 },
  venus: { start: "2020-01-01", end: "2040-01-01", stepDays: 1, minDays: 21, maxDays: 124 },
  mars: { start: "2020-01-01", end: "2040-01-01", stepDays: 1, minDays: 42, maxDays: 49 },
  jupiter: { start: "1900-01-01", end: "2100-01-01", stepDays: 3, minDays: 330, maxDays: 400 },
  saturn: { start: "1900-01-01", end: "2100-01-01", stepDays: 3, minDays: 820, maxDays: 1100 },
  uranus: { start: "1800-01-01", end: "2200-01-01", stepDays: 10, minDays: 2370, maxDays: 2740 },
  neptune: { start: "1800-01-01", end: "2200-01-01", stepDays: 10, minDays: 4740, maxDays: 5480 },
  pluto: { start: "1800-01-01", end: "2200-01-01", stepDays: 10, minDays: 4380, maxDays: 11330 },
  chiron: { start: "1800-01-01", end: "2200-01-01", stepDays: 10, minDays: 1460, maxDays: 2985 },
  "north-node": { start: "1900-01-01", end: "2100-01-01", stepDays: 3, minDays: 500, maxDays: 600 }
};

function julianDay(iso) {
  const date = new Date(`${iso}T00:00:00Z`);
  return swe.julday(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), 0);
}

function longitude(body, jd) {
  const value = swe.calc_ut(jd, bodies[body], swe.SEFLG_SWIEPH)[0];
  return ((value % 360) + 360) % 360;
}

function separation(first, second) {
  return Math.abs((((first - second + 540) % 360) - 180));
}

function signAt(body, jd) {
  return Math.floor(longitude(body, jd) / 30);
}

function residencySegments(body, check) {
  const start = julianDay(check.start);
  const end = julianDay(check.end);
  let previousSign = signAt(body, start);
  let segmentStart = start;
  const segments = [];
  for (let jd = start + check.stepDays; jd <= end; jd += check.stepDays) {
    const currentSign = signAt(body, jd);
    if (currentSign === previousSign) continue;
    segments.push(jd - segmentStart);
    segmentStart = jd;
    previousSign = currentSign;
  }
  return segments.slice(1, -1);
}

const startJd = julianDay("2000-01-01");
for (const [body, check] of Object.entries(circuitChecks)) {
  const delta = separation(longitude(body, startJd), longitude(body, startJd + check.days));
  assert.ok(delta <= check.maxSeparation, `${body} circuit differs by ${delta.toFixed(2)}°, over the ${check.maxSeparation}° tolerance`);
}

for (const [body, check] of Object.entries(residencyChecks)) {
  const segments = residencySegments(body, check);
  assert.ok(
    segments.some((days) => days >= check.minDays && days <= check.maxDays),
    `${body} has no Swiss Ephemeris sign residency inside ${check.minDays}-${check.maxDays} days`
  );
}

assert.deepEqual(facts.planets["south-node"], facts.planets["north-node"]);
assert.match(facts.planets.moon.variabilityNote, /permanently excluded/u);
assert.match(facts.planets.pluto.variabilityNote, /engine-computed range/u);
assert.equal(facts.planets.chiron.typicalSignStay, "roughly 4 to 9 years per sign");

console.log("Planet cycle facts: 12 Swiss Ephemeris circuit checks and 12 representative sign-residency checks passed; facts are REVIEWED.");
