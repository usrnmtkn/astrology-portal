import assert from "node:assert/strict";
import SwissEph from "swisseph-wasm";
import { calculateSkyAspects } from "../packages/astro-knowledge/engine/sky-aspects/browser.mjs";

const definitions = [
  ["conjunction", 0, 5],
  ["sextile", 60, 5],
  ["square", 90, 5],
  ["trine", 120, 5],
  ["quincunx", 150, 3],
  ["opposition", 180, 5]
];

function normalizeDegrees(degrees) {
  return ((degrees % 360) + 360) % 360;
}

function separation(first, second) {
  const difference = Math.abs(normalizeDegrees(first - second));
  return difference > 180 ? 360 - difference : difference;
}

function referenceMatrix(positions) {
  const aspects = [];
  const pointOrder = [
    "Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn",
    "Uranus", "Neptune", "Pluto", "Chiron", "Lilith", "North Node", "South Node"
  ];
  const orderedPositions = [...positions].sort((first, second) => (
    pointOrder.indexOf(first.planet) - pointOrder.indexOf(second.planet)
  ));

  orderedPositions.forEach((from, fromIndex) => {
    orderedPositions.slice(fromIndex + 1).forEach((to) => {
      const distance = separation(from.longitude, to.longitude);
      const match = definitions
        .map(([type, exactAngle, maxOrb]) => ({
          type,
          exactAngle,
          orb: Math.abs(distance - exactAngle),
          maxOrb
        }))
        .filter(({ orb, maxOrb }) => orb <= maxOrb)
        .sort((first, second) => first.orb - second.orb)[0];

      if (match) {
        aspects.push({
          key: `${from.planet}|${match.type}|${to.planet}`,
          orb: Number(match.orb.toFixed(1))
        });
      }
    });
  });

  return aspects.sort((first, second) => first.key.localeCompare(second.key));
}

function utcHour(date) {
  return date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
}

const swe = new SwissEph();
await swe.initSwissEph();

const bodies = [
  ["Sun", swe.SE_SUN],
  ["Moon", swe.SE_MOON],
  ["Mercury", swe.SE_MERCURY],
  ["Venus", swe.SE_VENUS],
  ["Mars", swe.SE_MARS],
  ["Jupiter", swe.SE_JUPITER],
  ["Saturn", swe.SE_SATURN],
  ["Uranus", swe.SE_URANUS],
  ["Neptune", swe.SE_NEPTUNE],
  ["Pluto", swe.SE_PLUTO],
  ["Chiron", 15],
  ["Lilith", 13],
  ["North Node", swe.SE_TRUE_NODE]
];

let sawQuincunx = false;
let sawSouthNode = false;

for (const date of [
  new Date("2026-07-31T16:00:00.000Z"),
  new Date("2026-08-15T02:30:00.000Z")
]) {
  const julianDay = swe.julday(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    utcHour(date)
  );
  const flags = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED;
  const positions = bodies.map(([planet, id]) => {
    const result = swe.calc_ut(julianDay, id, flags);
    return {
      planet,
      longitude: normalizeDegrees(result[0]),
      speed: result[3]
    };
  });
  const northNode = positions.find(({ planet }) => planet === "North Node");
  positions.push({
    planet: "South Node",
    longitude: normalizeDegrees(northNode.longitude + 180),
    speed: northNode.speed
  });

  const actual = calculateSkyAspects(positions)
    .map((aspect) => ({ key: `${aspect.from}|${aspect.type}|${aspect.to}`, orb: aspect.orb }))
    .sort((first, second) => first.key.localeCompare(second.key));
  const expected = referenceMatrix(positions);

  assert.deepEqual(actual, expected, `Shared matrix must match direct Swiss Ephemeris positions at ${date.toISOString()}.`);
  sawQuincunx ||= actual.some(({ key }) => key.includes("|quincunx|"));
  sawSouthNode ||= actual.some(({ key }) => key.includes("South Node"));
}

assert.equal(sawQuincunx, true, "Direct multi-date coverage must exercise quincunx policy.");
assert.equal(sawSouthNode, true, "Direct multi-date coverage must exercise the derived South Node.");

console.log("Sky aspect matrix parity passed for two direct Swiss Ephemeris instants.");
