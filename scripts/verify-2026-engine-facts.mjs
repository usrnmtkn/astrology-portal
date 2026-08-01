#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import SwissEph from "swisseph-wasm";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const slotOutput = path.join(repoRoot, "packages/astro-knowledge/review/engine-confirmed-2026-date-slots.json");
const aspectOutput = path.join(repoRoot, "docs/content-review/sky-aspects/2026-engine-confirmed-aspect-hits.json");
const flags = { write: process.argv.includes("--write") };

const swe = new SwissEph();
await swe.initSwissEph();

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
  "true-node": swe.SE_TRUE_NODE
};
const signs = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

function jd(date) {
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600 + date.getUTCMilliseconds() / 3_600_000;
  return swe.julday(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), hour);
}

function fromJd(value) {
  const { year, month, day, hour } = swe.revjul(value, swe.SE_GREG_CAL);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, Math.round(hour * 3_600_000)));
}

function calc(body, date) {
  const result = swe.calc_ut(jd(date), bodies[body], swe.SEFLG_SWIEPH | swe.SEFLG_SPEED);
  return { longitude: ((result[0] % 360) + 360) % 360, speed: result[3] };
}

function signAt(body, date) {
  return signs[Math.floor(calc(body, date).longitude / 30)];
}

function degreeAt(body, date) {
  return calc(body, date).longitude % 30;
}

function separation(first, second, date) {
  const raw = Math.abs(calc(first, date).longitude - calc(second, date).longitude) % 360;
  return Math.min(raw, 360 - raw);
}

function rounded(value, places = 2) {
  return Number(value.toFixed(places));
}

function eventRecord(date, extra = {}) {
  return {
    instantUtc: date.toISOString(),
    ...extra
  };
}

function minimize(startIso, endIso, objective, stepHours = 3) {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const step = stepHours * 3_600_000;
  let best = start;
  let bestValue = objective(new Date(start));
  for (let time = start + step; time <= end; time += step) {
    const value = objective(new Date(time));
    if (value < bestValue) {
      best = time;
      bestValue = value;
    }
  }
  let lower = Math.max(start, best - step);
  let upper = Math.min(end, best + step);
  for (let index = 0; index < 80; index += 1) {
    const third = (upper - lower) / 3;
    const left = lower + third;
    const right = upper - third;
    if (objective(new Date(left)) <= objective(new Date(right))) upper = right;
    else lower = left;
  }
  return new Date((lower + upper) / 2);
}

function findIngress(body, targetSign, startIso, endIso, stepHours = 6) {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const step = stepHours * 3_600_000;
  let previous = start;
  let previousSign = signAt(body, new Date(previous));
  for (let time = start + step; time <= end; time += step) {
    const currentSign = signAt(body, new Date(time));
    if (currentSign === targetSign && previousSign !== targetSign) {
      let lower = previous;
      let upper = time;
      for (let index = 0; index < 60; index += 1) {
        const midpoint = (lower + upper) / 2;
        if (signAt(body, new Date(midpoint)) === targetSign) upper = midpoint;
        else lower = midpoint;
      }
      return new Date(upper);
    }
    previous = time;
    previousSign = currentSign;
  }
  throw new Error(`No ${body} ingress into ${targetSign} found in ${startIso}..${endIso}`);
}

function findStation(body, direction, startIso, endIso, stepHours = 6) {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const step = stepHours * 3_600_000;
  let previous = start;
  let previousSpeed = calc(body, new Date(previous)).speed;
  for (let time = start + step; time <= end; time += step) {
    const speed = calc(body, new Date(time)).speed;
    const crossed = direction === "retrograde"
      ? previousSpeed >= 0 && speed < 0
      : previousSpeed < 0 && speed >= 0;
    if (crossed) {
      let lower = previous;
      let upper = time;
      for (let index = 0; index < 60; index += 1) {
        const midpoint = (lower + upper) / 2;
        const midpointSpeed = calc(body, new Date(midpoint)).speed;
        if ((direction === "retrograde" && midpointSpeed < 0) || (direction === "direct" && midpointSpeed >= 0)) upper = midpoint;
        else lower = midpoint;
      }
      return new Date((lower + upper) / 2);
    }
    previous = time;
    previousSpeed = speed;
  }
  throw new Error(`No ${body} ${direction} station found in ${startIso}..${endIso}`);
}

function aspectHit(first, aspect, second, startIso, endIso) {
  const angles = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 };
  const angle = angles[aspect];
  const date = minimize(startIso, endIso, (candidate) => Math.abs(separation(first, second, candidate) - angle));
  return eventRecord(date, {
    first,
    aspect,
    second,
    firstSign: signAt(first, date),
    firstDegree: rounded(degreeAt(first, date)),
    secondSign: signAt(second, date),
    secondDegree: rounded(degreeAt(second, date)),
    residualOrbDegrees: rounded(Math.abs(separation(first, second, date) - angle), 5)
  });
}

function aspectSnapshot(first, aspect, second, instantIso) {
  const angles = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 };
  const date = new Date(instantIso);
  return eventRecord(date, {
    first,
    aspect,
    second,
    firstSign: signAt(first, date),
    firstDegree: rounded(degreeAt(first, date)),
    secondSign: signAt(second, date),
    secondDegree: rounded(degreeAt(second, date)),
    orbDegrees: rounded(Math.abs(separation(first, second, date) - angles[aspect]))
  });
}

function lunation(kind, startIso, endIso) {
  const angle = kind === "new-moon" ? 0 : 180;
  const date = minimize(startIso, endIso, (candidate) => Math.abs(separation("sun", "moon", candidate) - angle), 1);
  const body = kind === "new-moon" ? "sun" : "moon";
  return eventRecord(date, {
    kind,
    sign: signAt(body, date),
    degree: rounded(degreeAt(body, date)),
    residualOrbDegrees: rounded(Math.abs(separation("sun", "moon", date) - angle), 5)
  });
}

function eclipseCall(functionName, startDate, typeMask) {
  const resultPtr = swe.SweModule._malloc(10 * Float64Array.BYTES_PER_ELEMENT);
  const errorPtr = swe.SweModule._malloc(256);
  const returnFlag = swe.SweModule.ccall(
    functionName,
    "number",
    ["number", "number", "number", "pointer", "number", "pointer"],
    [jd(startDate), swe.SEFLG_SWIEPH, typeMask, resultPtr, 0, errorPtr]
  );
  const values = Array.from(new Float64Array(swe.SweModule.HEAPF64.buffer, resultPtr, 10));
  const error = swe.SweModule.UTF8ToString(errorPtr);
  swe.SweModule._free(resultPtr);
  swe.SweModule._free(errorPtr);
  if (returnFlag < 0) throw new Error(`${functionName} failed with ${returnFlag}: ${error}`);
  const type = returnFlag & swe.SE_ECL_TOTAL ? "total"
    : returnFlag & swe.SE_ECL_ANNULAR_TOTAL ? "hybrid"
      : returnFlag & swe.SE_ECL_ANNULAR ? "annular"
        : returnFlag & swe.SE_ECL_PARTIAL ? "partial"
          : returnFlag & swe.SE_ECL_PENUMBRAL ? "penumbral"
            : "unknown";
  return { date: fromJd(values[0]), type, returnFlag };
}

function eclipseRecord(kind, startIso) {
  const solar = kind === "solar";
  const result = eclipseCall(
    solar ? "swe_sol_eclipse_when_glob" : "swe_lun_eclipse_when",
    new Date(startIso),
    solar ? swe.SE_ECL_ALLTYPES_SOLAR : swe.SE_ECL_ALLTYPES_LUNAR
  );
  const body = solar ? "sun" : "moon";
  return eventRecord(result.date, {
    kind: `${result.type}-${kind}-eclipse`,
    sign: signAt(body, result.date),
    degree: rounded(degreeAt(body, result.date)),
    swissEphReturnFlag: result.returnFlag
  });
}

const ingresses = {
  neptuneAries: eventRecord(findIngress("neptune", "Aries", "2026-01-01T00:00:00Z", "2026-02-15T00:00:00Z"), { body: "neptune", toSign: "Aries" }),
  uranusGemini: eventRecord(findIngress("uranus", "Gemini", "2026-04-01T00:00:00Z", "2026-05-15T00:00:00Z"), { body: "uranus", toSign: "Gemini" }),
  uranusCancerExit: eventRecord(findIngress("uranus", "Cancer", "2033-01-01T00:00:00Z", "2034-12-31T00:00:00Z"), { body: "uranus", toSign: "Cancer", passage: "final" }),
  jupiterLeo: eventRecord(findIngress("jupiter", "Leo", "2026-06-01T00:00:00Z", "2026-07-15T00:00:00Z"), { body: "jupiter", toSign: "Leo" }),
  jupiterVirgoExit: eventRecord(findIngress("jupiter", "Virgo", "2027-07-01T00:00:00Z", "2027-08-15T00:00:00Z"), { body: "jupiter", toSign: "Virgo" }),
  trueNodeAquarius: eventRecord(findIngress("true-node", "Aquarius", "2026-07-01T00:00:00Z", "2026-08-15T00:00:00Z"), { body: "true-node", toSign: "Aquarius", southNodeSign: "Leo" }),
  trueNodeCapricornExit: eventRecord(findIngress("true-node", "Capricorn", "2028-02-01T00:00:00Z", "2028-05-01T00:00:00Z"), { body: "true-node", toSign: "Capricorn", southNodeSign: "Cancer" })
};

const stations = {
  mercuryPiscesRetrograde: eventRecord(findStation("mercury", "retrograde", "2026-02-15T00:00:00Z", "2026-03-05T00:00:00Z"), { body: "mercury", direction: "retrograde" }),
  mercuryPiscesDirect: eventRecord(findStation("mercury", "direct", "2026-03-10T00:00:00Z", "2026-03-28T00:00:00Z"), { body: "mercury", direction: "direct" }),
  mercuryCancerRetrograde: eventRecord(findStation("mercury", "retrograde", "2026-06-20T00:00:00Z", "2026-07-07T00:00:00Z"), { body: "mercury", direction: "retrograde" }),
  mercuryCancerDirect: eventRecord(findStation("mercury", "direct", "2026-07-15T00:00:00Z", "2026-07-31T00:00:00Z"), { body: "mercury", direction: "direct" }),
  jupiterCancerDirect: eventRecord(findStation("jupiter", "direct", "2026-03-01T00:00:00Z", "2026-03-20T00:00:00Z"), { body: "jupiter", direction: "direct" }),
  plutoAquariusRetrograde: eventRecord(findStation("pluto", "retrograde", "2026-04-20T00:00:00Z", "2026-05-20T00:00:00Z"), { body: "pluto", direction: "retrograde" }),
  plutoAquariusDirect: eventRecord(findStation("pluto", "direct", "2026-09-20T00:00:00Z", "2026-11-01T00:00:00Z"), { body: "pluto", direction: "direct" }),
  venusScorpioRetrograde: eventRecord(findStation("venus", "retrograde", "2026-09-20T00:00:00Z", "2026-10-15T00:00:00Z"), { body: "venus", direction: "retrograde" }),
  venusLibraDirect: eventRecord(findStation("venus", "direct", "2026-11-01T00:00:00Z", "2026-11-25T00:00:00Z"), { body: "venus", direction: "direct" }),
  mercuryScorpioRetrograde: eventRecord(findStation("mercury", "retrograde", "2026-10-15T00:00:00Z", "2026-11-02T00:00:00Z"), { body: "mercury", direction: "retrograde" }),
  mercuryScorpioDirect: eventRecord(findStation("mercury", "direct", "2026-11-05T00:00:00Z", "2026-11-22T00:00:00Z"), { body: "mercury", direction: "direct" })
};
for (const station of Object.values(stations)) {
  station.sign = signAt(station.body, new Date(station.instantUtc));
  station.degree = rounded(degreeAt(station.body, new Date(station.instantUtc)));
}

const venusDirectLongitude = calc("venus", new Date(stations.venusLibraDirect.instantUtc)).longitude;
const venusShadowStartDate = minimize(
  "2026-08-20T00:00:00Z",
  "2026-09-10T00:00:00Z",
  (date) => Math.abs(calc("venus", date).longitude - venusDirectLongitude),
  2
);
const venusShadowStart = eventRecord(venusShadowStartDate, {
  body: "venus",
  phase: "pre-shadow",
  sign: signAt("venus", venusShadowStartDate),
  degree: rounded(degreeAt("venus", venusShadowStartDate))
});

const uranus2025RetrogradeStation = findStation("uranus", "retrograde", "2025-08-15T00:00:00Z", "2025-10-15T00:00:00Z");
const uranusShadowLongitude = calc("uranus", uranus2025RetrogradeStation).longitude;
const uranusShadowClearDate = minimize(
  "2026-05-10T00:00:00Z",
  "2026-06-05T00:00:00Z",
  (date) => Math.abs(calc("uranus", date).longitude - uranusShadowLongitude),
  3
);
const uranusShadowClear = eventRecord(uranusShadowClearDate, {
  body: "uranus",
  phase: "post-shadow-clear",
  sign: signAt("uranus", uranusShadowClearDate),
  degree: rounded(degreeAt("uranus", uranusShadowClearDate))
});

const eclipses = {
  aquariusSolar: eclipseRecord("solar", "2026-01-01T00:00:00Z"),
  virgoLunar2026: eclipseRecord("lunar", "2026-01-01T00:00:00Z"),
  leoSolar: eclipseRecord("solar", "2026-03-01T00:00:00Z"),
  piscesLunar2026: eclipseRecord("lunar", "2026-03-04T00:00:00Z"),
  virgoLunar2027: eclipseRecord("lunar", "2026-08-29T00:00:00Z")
};

const lunations = {
  scorpioFullMoon: lunation("full-moon", "2026-04-29T00:00:00Z", "2026-05-03T00:00:00Z"),
  geminiNewMoon: lunation("new-moon", "2026-06-12T00:00:00Z", "2026-06-16T00:00:00Z"),
  capricornFullMoon: lunation("full-moon", "2026-06-27T00:00:00Z", "2026-07-01T00:00:00Z"),
  cancerNewMoon: lunation("new-moon", "2026-07-12T00:00:00Z", "2026-07-16T00:00:00Z")
};

const cazimis = {
  mercuryPisces: aspectHit("mercury", "conjunction", "sun", "2026-03-05T00:00:00Z", "2026-03-10T00:00:00Z"),
  neptuneAries: aspectHit("neptune", "conjunction", "sun", "2026-03-19T00:00:00Z", "2026-03-25T00:00:00Z"),
  saturnAries: aspectHit("saturn", "conjunction", "sun", "2026-03-22T00:00:00Z", "2026-03-29T00:00:00Z"),
  jupiterLeo: aspectHit("jupiter", "conjunction", "sun", "2026-07-20T00:00:00Z", "2026-08-15T00:00:00Z")
};

const aspectHits = {
  saturnNeptune: aspectHit("saturn", "conjunction", "neptune", "2026-02-17T00:00:00Z", "2026-02-24T00:00:00Z"),
  venusJupiter: aspectHit("venus", "conjunction", "jupiter", "2026-06-06T00:00:00Z", "2026-06-12T00:00:00Z"),
  jupiterPlutoJuly: aspectHit("jupiter", "opposition", "pluto", "2026-07-17T00:00:00Z", "2026-07-24T00:00:00Z"),
  jupiterNeptuneJuly: aspectHit("jupiter", "trine", "neptune", "2026-07-17T00:00:00Z", "2026-07-24T00:00:00Z"),
  uranusPlutoJuly: aspectHit("uranus", "trine", "pluto", "2026-07-17T00:00:00Z", "2026-07-24T00:00:00Z"),
  neptunePlutoSeptember: aspectHit("neptune", "sextile", "pluto", "2026-09-10T00:00:00Z", "2026-09-22T00:00:00Z"),
  uranusPlutoNovember: aspectHit("uranus", "trine", "pluto", "2026-11-20T00:00:00Z", "2026-12-08T00:00:00Z")
};

const julyBasketMatrix = {
  evaluatedAt: "2026-07-20T16:00:00.000Z",
  aspects: {
    jupiterPluto: aspectSnapshot("jupiter", "opposition", "pluto", "2026-07-20T16:00:00.000Z"),
    jupiterNeptune: aspectSnapshot("jupiter", "trine", "neptune", "2026-07-20T16:00:00.000Z"),
    neptunePluto: aspectSnapshot("neptune", "sextile", "pluto", "2026-07-20T16:00:00.000Z"),
    uranusPluto: aspectSnapshot("uranus", "trine", "pluto", "2026-07-20T16:00:00.000Z")
  }
};

const verifiedFacts = {
  neptuneAriesIngress: ingresses.neptuneAries,
  saturnNeptuneConjunction: aspectHits.saturnNeptune,
  uranusGeminiPassage: {
    entry: ingresses.uranusGemini,
    shadowClear: uranusShadowClear,
    finalExit: ingresses.uranusCancerExit
  },
  jupiterLeoPassage: { entry: ingresses.jupiterLeo, finalExit: ingresses.jupiterVirgoExit },
  trueNodeAquariusLeoPassage: { entry: ingresses.trueNodeAquarius, finalExit: ingresses.trueNodeCapricornExit },
  leoTotalSolarEclipse: eclipses.leoSolar,
  virgoTotalLunarEclipse: eclipses.virgoLunar2026,
  aquariusSolarEclipse: eclipses.aquariusSolar,
  geminiNewMoon: lunations.geminiNewMoon,
  cancerNewMoon: lunations.cancerNewMoon,
  capricornFullMoon: lunations.capricornFullMoon,
  scorpioFullMoon: lunations.scorpioFullMoon,
  mercuryPiscesRetrograde: { start: stations.mercuryPiscesRetrograde, end: stations.mercuryPiscesDirect },
  mercuryCancerRetrograde: { start: stations.mercuryCancerRetrograde, end: stations.mercuryCancerDirect },
  jupiterCancerDirectStation: stations.jupiterCancerDirect,
  plutoAquariusRetrograde: { start: stations.plutoAquariusRetrograde, end: stations.plutoAquariusDirect },
  venusRetrograde: { shadowStart: venusShadowStart, start: stations.venusScorpioRetrograde, end: stations.venusLibraDirect },
  mercuryScorpioRetrograde: { start: stations.mercuryScorpioRetrograde, end: stations.mercuryScorpioDirect },
  mercuryPiscesCazimi: cazimis.mercuryPisces,
  neptuneAriesCazimi: cazimis.neptuneAries,
  saturnAriesCazimi: cazimis.saturnAries,
  jupiterLeoCazimi: cazimis.jupiterLeo,
  julyOuterPlanetConfiguration: {
    evaluationMatrix: julyBasketMatrix,
    exactHits: aspectHits,
    assessment: "Exact instants are retained in exactHits and must be rendered in the user's timezone. Jupiter-Pluto and Jupiter-Neptune perfect during the July window. Uranus-Pluto perfects immediately before it and again in November. Neptune-Pluto is active in the July basket but perfects later. The full four-aspect basket does not repeat at the later Uranus-Pluto hit."
  },
  venusJupiterConjunction: aspectHits.venusJupiter
};

const slots = {
  schema: "tldrastro-engine-confirmed-date-slots-v1",
  generatedBy: "scripts/verify-2026-engine-facts.mjs",
  calculationAuthority: {
    engine: "Swiss Ephemeris via swisseph-wasm",
    independentPositionVerification: "NASA/JPL Horizons via the repository ephemeris integrity harness",
    sourceRegistry: "scripts/fixtures/ephemeris-source-registry.json",
    limitations: "NASA/JPL Horizons independently checks supported planetary positions. The app's Swiss Ephemeris remains authoritative for true node, eclipses, stations, retrograde shadows, and exact astrological event detection not supplied by the Horizons adapter."
  },
  timePolicy: {
    authority: "instantUtc",
    displayTimeZone: "user-location",
    note: "Engine facts retain exact UTC instants. Reader-facing dates and times must be derived at render time using the user's resolved IANA timezone; no source or canonical display timezone is persisted."
  },
  dateSlots: {
    neptuneAries: { entryDate: ingresses.neptuneAries },
    saturnAries: { aspectHits: [aspectHits.saturnNeptune] },
    uranusGemini: { entryDate: ingresses.uranusGemini, shadowClearDate: uranusShadowClear, exitDate: ingresses.uranusCancerExit },
    jupiterLeo: { entryDate: ingresses.jupiterLeo, exitDate: ingresses.jupiterVirgoExit, cazimi: cazimis.jupiterLeo },
    nodesAquariusLeo: {
      entryDate: ingresses.trueNodeAquarius,
      exitDate: ingresses.trueNodeCapricornExit,
      firstEclipseDate: eclipses.leoSolar,
      oldAxisEclipses: [eclipses.piscesLunar2026, eclipses.virgoLunar2027],
      conflictResolution: "There is no event conflict: the total Virgo lunar eclipse before the Aquarius/Leo node-axis entry and the later penumbral Virgo lunar eclipse are distinct UTC instants. The later event belongs in oldAxisEclipses; render both dates in the user's timezone."
    },
    mercuryRetrogrades: [
      { sign: "Pisces", start: stations.mercuryPiscesRetrograde, end: stations.mercuryPiscesDirect, cazimi: cazimis.mercuryPisces },
      { sign: "Cancer", start: stations.mercuryCancerRetrograde, end: stations.mercuryCancerDirect },
      { sign: "Scorpio", start: stations.mercuryScorpioRetrograde, end: stations.mercuryScorpioDirect }
    ],
    venusRetrograde: { shadowStart: venusShadowStart, start: stations.venusScorpioRetrograde, end: stations.venusLibraDirect },
    lunations,
    eclipses,
    stations,
    cazimis
  },
  verifiedFacts
};

const aspectMatrixBackfill = {
  schema: "canonical-sky-aspect-2026-confirmed-hits-v1",
  profile: "canonical-sky-aspect-v1",
  generatedBy: "scripts/verify-2026-engine-facts.mjs",
  evaluationPolicy: "Exact hits are UTC ephemeris instants. Reader-facing dates and times are derived in the user's resolved IANA timezone.",
  hits: aspectHits,
  julyBasketMatrix,
  excluded: {
    historicalFirstSince1922: "Not established by this 2026 calculation and therefore not confirmed."
  }
};

assert.equal(eclipses.leoSolar.kind, "total-solar-eclipse");
assert.equal(eclipses.leoSolar.sign, "Leo");
assert.equal(eclipses.virgoLunar2026.kind, "total-lunar-eclipse");
assert.equal(eclipses.virgoLunar2026.sign, "Virgo");
assert.equal(eclipses.virgoLunar2027.sign, "Virgo");
assert.equal(ingresses.trueNodeAquarius.body, "true-node");
assert.ok(cazimis.mercuryPisces.residualOrbDegrees < 0.001);
assert.ok(aspectHits.saturnNeptune.residualOrbDegrees < 0.001);
assert.doesNotMatch(
  JSON.stringify({ slots, aspectMatrixBackfill }),
  /America\/(?:Los_Angeles|New_York)|sourcePacificDate|canonicalDate|canonicalNoonUtc/u,
  "Engine review fixtures must retain UTC instants and defer display dates to the user's timezone."
);

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

if (flags.write) {
  fs.mkdirSync(path.dirname(slotOutput), { recursive: true });
  fs.mkdirSync(path.dirname(aspectOutput), { recursive: true });
  fs.writeFileSync(slotOutput, stableJson(slots));
  fs.writeFileSync(aspectOutput, stableJson(aspectMatrixBackfill));
  console.log(`wrote ${path.relative(repoRoot, slotOutput)}`);
  console.log(`wrote ${path.relative(repoRoot, aspectOutput)}`);
} else {
  assert.deepEqual(JSON.parse(fs.readFileSync(slotOutput, "utf8")), slots, "Engine-confirmed date-slot fixture is stale; run with --write after reviewing calculated changes.");
  assert.deepEqual(JSON.parse(fs.readFileSync(aspectOutput, "utf8")), aspectMatrixBackfill, "Canonical aspect-hit fixture is stale; run with --write after reviewing calculated changes.");
  console.log(`2026 engine facts verified: ${Object.keys(verifiedFacts).length} fact groups, ${Object.keys(aspectHits).length} exact aspect hits.`);
}

swe.close();
