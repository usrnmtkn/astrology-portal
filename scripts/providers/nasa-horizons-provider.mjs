#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const PLANET_COMMANDS = {
  sun: "10",
  moon: "301",
  mercury: "199",
  venus: "299",
  mars: "499",
  jupiter: "599",
  saturn: "699",
  uranus: "799",
  neptune: "899",
  pluto: "999",
  chiron: "2060"
};

const SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces"
];

const ASPECTS = [
  ["conjunction", 0],
  ["sextile", 60],
  ["square", 90],
  ["trine", 120],
  ["opposition", 180]
];

const CACHE_PATH = process.env.TLDR_ASTRO_HORIZONS_CACHE
  ?? path.join("/private/tmp", "tldrastro-horizons-cache.json");

function readStdin() {
  return new Promise((resolve, reject) => {
    let body = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      body += chunk;
    });
    process.stdin.on("end", () => resolve(body));
    process.stdin.on("error", reject);
  });
}

function readCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
  } catch {
    return {};
  }
}

function writeCache(cache) {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

function normalizeDegrees(value) {
  return ((Number(value) % 360) + 360) % 360;
}

function signedDeltaDegrees(next, current) {
  let delta = normalizeDegrees(next) - normalizeDegrees(current);
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta;
}

function angularDistance(first, second) {
  const raw = Math.abs(normalizeDegrees(first) - normalizeDegrees(second));
  return raw > 180 ? 360 - raw : raw;
}

function signForLongitude(longitude) {
  return SIGNS[Math.floor(normalizeDegrees(longitude) / 30)];
}

function degreeInSign(longitude) {
  return Number((normalizeDegrees(longitude) % 30).toFixed(2));
}

function julianDate(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

function horizonsUrl(command, date) {
  const params = new URLSearchParams({
    format: "text",
    COMMAND: `'${command}'`,
    OBJ_DATA: "'NO'",
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'OBSERVER'",
    CENTER: "'500@399'",
    TLIST: String(julianDate(date)),
    TLIST_TYPE: "'JD'",
    TIME_TYPE: "'UT'",
    QUANTITIES: "'31'",
    CSV_FORMAT: "'YES'",
    ANG_FORMAT: "'DEG'",
    EXTRA_PREC: "'YES'"
  });

  return `https://ssd.jpl.nasa.gov/api/horizons.api?${params.toString()}`;
}

async function fetchHorizonsPosition(command, date, cache) {
  const key = `${command}:${date.toISOString()}`;
  if (cache[key]) return cache[key];

  const response = await fetch(horizonsUrl(command, date), {
    headers: { "user-agent": "tldrastro-integrity-harness/1.0" }
  });

  if (!response.ok) {
    throw new Error(`Horizons request failed for ${command}: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  const match = text.match(/\$\$SOE\s*([\s\S]*?)\s*\$\$EOE/);
  if (!match) {
    throw new Error(`Horizons response for ${command} did not include an ephemeris block.`);
  }

  const row = match[1].trim().split(/\r?\n/).find(Boolean);
  const columns = row.split(",").map((value) => value.trim()).filter((value) => value !== "");
  const longitude = Number(columns.at(-2));
  const latitude = Number(columns.at(-1));

  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    throw new Error(`Horizons response for ${command} did not include numeric ecliptic longitude/latitude.`);
  }

  cache[key] = {
    longitude: normalizeDegrees(longitude),
    latitude,
    raw: row
  };
  return cache[key];
}

function bestAspect(separation) {
  let best = null;
  for (const [type, exact] of ASPECTS) {
    const orb = Math.abs(separation - exact);
    if (!best || orb < best.orb) {
      best = { type, exact, orb };
    }
  }
  return best;
}

async function main() {
  const fixture = JSON.parse(await readStdin());
  const date = new Date(fixture.date);
  const later = new Date(date.getTime() + 6 * 60 * 60 * 1000);
  const cache = readCache();
  const positions = {};
  const laterPositions = {};
  const facts = [];
  const gaps = [
    {
      category: "nodes",
      reason: "NASA/JPL Horizons does not return the app's true lunar node as a target body through this adapter."
    },
    {
      category: "angles",
      reason: "NASA/JPL Horizons verifies solar-system apparent positions, not astrological Asc/Desc/MC/IC calculations."
    },
    {
      category: "cusps",
      reason: "NASA/JPL Horizons does not compute astrological house cusps."
    },
    {
      category: "stations",
      reason: "Station timestamp bisection against Horizons is not implemented in this adapter yet."
    },
    {
      category: "shadow-boundaries",
      reason: "Retrograde shadow ingress/egress bisection against Horizons is not implemented in this adapter yet."
    },
    {
      category: "exact-hits",
      reason: "Transit exact-hit bisection against Horizons is not implemented in this adapter yet."
    }
  ];

  for (const [pointId, command] of Object.entries(PLANET_COMMANDS)) {
    try {
      const current = await fetchHorizonsPosition(command, date, cache);
      const future = await fetchHorizonsPosition(command, later, cache);
      const motionDelta = signedDeltaDegrees(future.longitude, current.longitude);
      positions[pointId] = current;
      laterPositions[pointId] = future;
      facts.push({
        id: `horizons.position.${pointId}.${date.toISOString()}`,
        kind: "position",
        planetOrPointId: pointId,
        targetType: pointId === "chiron" ? "other-point" : "planet",
        longitude: Number(current.longitude.toFixed(6)),
        latitude: Number(current.latitude.toFixed(6)),
        normalizedSign: signForLongitude(current.longitude),
        normalizedDegree: degreeInSign(current.longitude),
        directRetrograde: motionDelta < -0.0001 ? "retrograde" : "direct",
        providerMotionDeltaSixHours: Number(motionDelta.toFixed(8)),
        role: "current-sky"
      });
    } catch (error) {
      gaps.push({
        category: "planetary-position",
        pointId,
        reason: error instanceof Error ? error.message : String(error)
      });
    }
  }

  const ids = Object.keys(positions);
  for (let index = 0; index < ids.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < ids.length; nextIndex += 1) {
      const first = ids[index];
      const second = ids[nextIndex];
      const separation = angularDistance(positions[first].longitude, positions[second].longitude);
      const nextSeparation = angularDistance(laterPositions[first].longitude, laterPositions[second].longitude);
      const aspect = bestAspect(separation);

      if (!aspect || aspect.orb > 5) continue;

      const nextOrb = Math.abs(nextSeparation - aspect.exact);

      facts.push({
        id: `horizons.aspect.${first}.${aspect.type}.${second}.${date.toISOString()}`,
        kind: "aspect",
        planetOrPointId: first,
        targetId: second,
        targetType: second === "chiron" ? "other-point" : "planet",
        aspectType: aspect.type,
        exactAngularSeparation: Number(separation.toFixed(6)),
        orb: Number(aspect.orb.toFixed(6)),
        applyingSeparating: nextOrb < aspect.orb ? "applying" : nextOrb > aspect.orb ? "separating" : "exact",
        role: "current-sky",
        targetRole: "current-sky"
      });
    }
  }

  writeCache(cache);

  console.log(JSON.stringify({
    provider: {
      id: "nasa-jpl-horizons",
      label: "NASA/JPL Horizons API",
      source: "DE441 apparent geocentric observer ecliptic-of-date longitudes",
      independentOfPrimary: true,
      url: "https://ssd.jpl.nasa.gov/api/horizons.api"
    },
    capabilities: {
      planetaryLongitudes: true,
      planetaryLatitudes: true,
      directRetrogradeByFiniteDifference: true,
      moon: true,
      chiron: Boolean(positions.chiron),
      nodes: false,
      angles: false,
      houseCusps: false,
      aspectsFromSupportedBodies: true,
      applyingSeparatingFromSixHourFiniteDifference: true,
      stations: false,
      shadowBoundaries: false,
      exactHits: false
    },
    gaps,
    facts
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
