/** Reasoning facts for lunation and ingress articles.
 *
 * Contract: docs/writing/LUNATION-INGRESS-REASONING.md. This module computes
 * the facts that decide how a lunation or ingress article is argued: what sits
 * in the lunation, which planet governs the story, where the lights and their
 * rulers stand by traditional dignity, which receptions hold, which recent slow
 * conjunction seeded the story, and which ingresses fall in the same window.
 *
 * It computes facts only. It writes no reader prose. Traditional rulerships
 * only: outer bodies can sit in a lunation or seed a story, but never rule a
 * sign or govern the article.
 */
import { planetSignDignity } from "./planetSignDignity.mjs";

export const SKY_EVENT_REASONING_FACTS_VERSION = "sky-event-reasoning-facts-v1";

export const ZODIAC_SIGNS = Object.freeze([
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]);

export const TRADITIONAL_PLANETS = Object.freeze([
  "Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"
]);

export const DOMICILE_RULERS = Object.freeze({
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon",
  Leo: "Sun", Virgo: "Mercury", Libra: "Venus", Scorpio: "Mars",
  Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Saturn", Pisces: "Jupiter"
});

export const EXALTATION_RULERS = Object.freeze({
  Aries: "Sun", Taurus: "Moon", Cancer: "Jupiter", Virgo: "Mercury",
  Libra: "Saturn", Capricorn: "Mars", Pisces: "Venus"
});

export const DAY_RULERS = Object.freeze({
  Sunday: "Sun", Monday: "Moon", Tuesday: "Mars", Wednesday: "Mercury",
  Thursday: "Jupiter", Friday: "Venus", Saturday: "Saturn"
});

/** Slow-planet conjunctions, 1960-2060, grouped by cycle with every exact pass.
 * Computed with Swiss Ephemeris (swisseph-wasm 0.0.5, tropical, geocentric)
 * on 2026-09-27. Longitudes are ecliptic degrees 0-360. Dates are UTC.
 */
export const SLOW_CONJUNCTIONS = Object.freeze([
  { pair: ["Jupiter", "Saturn"], passes: [["1961-02-19", 295.2]] },
  { pair: ["Uranus", "Pluto"], passes: [["1965-10-09", 167.17], ["1966-04-04", 166.46], ["1966-06-30", 166.1]] },
  { pair: ["Jupiter", "Pluto"], passes: [["1968-10-13", 173.66]] },
  { pair: ["Jupiter", "Uranus"], passes: [["1968-12-11", 183.65], ["1969-03-11", 182.45], ["1969-07-20", 180.67]] },
  { pair: ["Jupiter", "Neptune"], passes: [["1971-02-01", 242.78], ["1971-05-22", 241.74], ["1971-09-16", 240.62]] },
  { pair: ["Jupiter", "Saturn"], passes: [["1980-12-31", 189.5], ["1981-03-04", 188.11], ["1981-07-24", 184.93]] },
  { pair: ["Jupiter", "Pluto"], passes: [["1981-11-02", 204.89]] },
  { pair: ["Saturn", "Pluto"], passes: [["1982-11-08", 207.59]] },
  { pair: ["Jupiter", "Uranus"], passes: [["1983-02-18", 248.86], ["1983-05-14", 247.69], ["1983-09-25", 245.82]] },
  { pair: ["Jupiter", "Neptune"], passes: [["1984-01-19", 270.02]] },
  { pair: ["Saturn", "Uranus"], passes: [["1988-02-13", 269.92], ["1988-06-26", 268.79], ["1988-10-18", 267.82]] },
  { pair: ["Saturn", "Neptune"], passes: [["1989-03-03", 281.91], ["1989-06-24", 281.24], ["1989-11-13", 280.36]] },
  { pair: ["Uranus", "Neptune"], passes: [["1993-02-02", 289.56], ["1993-08-20", 288.8], ["1993-10-24", 288.54]] },
  { pair: ["Jupiter", "Pluto"], passes: [["1994-12-02", 238.44]] },
  { pair: ["Jupiter", "Neptune"], passes: [["1997-01-09", 297.14]] },
  { pair: ["Jupiter", "Uranus"], passes: [["1997-02-16", 305.93]] },
  { pair: ["Jupiter", "Saturn"], passes: [["2000-05-28", 52.72]] },
  { pair: ["Jupiter", "Pluto"], passes: [["2007-12-11", 268.4]] },
  { pair: ["Jupiter", "Neptune"], passes: [["2009-05-27", 326.48], ["2009-07-10", 326.03], ["2009-12-21", 324.29]] },
  { pair: ["Jupiter", "Uranus"], passes: [["2010-06-08", 0.29], ["2010-09-19", 358.71], ["2011-01-04", 357.04]] },
  { pair: ["Saturn", "Pluto"], passes: [["2020-01-12", 292.78]] },
  { pair: ["Jupiter", "Pluto"], passes: [["2020-04-05", 294.89], ["2020-06-30", 294.11], ["2020-11-12", 292.86]] },
  { pair: ["Jupiter", "Saturn"], passes: [["2020-12-21", 300.49]] },
  { pair: ["Jupiter", "Neptune"], passes: [["2022-04-12", 353.98]] },
  { pair: ["Jupiter", "Uranus"], passes: [["2024-04-21", 51.83]] },
  { pair: ["Saturn", "Neptune"], passes: [["2026-02-20", 0.75]] },
  { pair: ["Saturn", "Uranus"], passes: [["2032-06-28", 88.02]] },
  { pair: ["Jupiter", "Pluto"], passes: [["2033-02-04", 314.84]] },
  { pair: ["Jupiter", "Neptune"], passes: [["2035-03-24", 21.35]] },
  { pair: ["Jupiter", "Uranus"], passes: [["2037-09-08", 113.04], ["2038-02-19", 110.66], ["2038-03-30", 110.09]] },
  { pair: ["Jupiter", "Saturn"], passes: [["2040-10-31", 197.93]] },
  { pair: ["Jupiter", "Pluto"], passes: [["2045-04-12", 333.53]] },
  { pair: ["Jupiter", "Neptune"], passes: [["2047-07-22", 51.32], ["2047-11-16", 50.08], ["2048-02-24", 49.01]] },
  { pair: ["Jupiter", "Uranus"], passes: [["2051-11-09", 178.91], ["2052-05-10", 176.44], ["2052-05-26", 176.22]] },
  { pair: ["Saturn", "Pluto"], passes: [["2053-06-15", 344.5], ["2053-07-10", 344.37], ["2054-02-02", 343.22]] },
  { pair: ["Jupiter", "Pluto"], passes: [["2058-01-26", 347.91]] },
  { pair: ["Jupiter", "Saturn"], passes: [["2060-04-07", 60.77]] },
  { pair: ["Jupiter", "Neptune"], passes: [["2060-06-27", 79.0]] }
]);

const WHOLE_SIGN_ASPECTS = Object.freeze({
  0: "conjunction", 2: "sextile", 3: "square", 4: "trine", 6: "opposition",
  8: "trine", 9: "square", 10: "sextile"
});

const INGRESS_WINDOW_HOURS = 72;
const LUNATION_BODY_ORB = 10;
const SEED_ORB = 10;

const title = (value) => typeof value === "string"
  ? value.trim().toLowerCase().split(/[ -]+/u).filter(Boolean).map((word) => word[0].toUpperCase() + word.slice(1)).join(" ")
  : "";
const signIndex = (sign) => ZODIAC_SIGNS.indexOf(title(sign));
const round = (value, places = 2) => Number.isFinite(value) ? Number(value.toFixed(places)) : null;
const angularDistance = (a, b) => {
  const d = Math.abs((((a - b) % 360) + 360) % 360);
  return d > 180 ? 360 - d : d;
};
const formatDegree = (longitude) => {
  if (!Number.isFinite(longitude)) return null;
  const normalized = ((longitude % 360) + 360) % 360;
  const within = normalized % 30;
  let degree = Math.floor(within);
  let minute = Math.round((within - degree) * 60);
  if (minute === 60) { degree += 1; minute = 0; }
  return `${degree}°${String(minute).padStart(2, "0")}' ${ZODIAC_SIGNS[Math.floor(normalized / 30)]}`;
};

function positionLongitude(position) {
  if (Number.isFinite(position?.longitude)) return ((position.longitude % 360) + 360) % 360;
  const index = signIndex(position?.sign);
  return index >= 0 && Number.isFinite(position?.degree) ? index * 30 + position.degree : null;
}

function normalizePositions(positions) {
  const seen = new Set();
  const rows = [];
  for (const position of Array.isArray(positions) ? positions : []) {
    const planet = title(position?.planet);
    const sign = title(position?.sign);
    if (!planet || signIndex(sign) < 0 || seen.has(planet)) continue;
    seen.add(planet);
    rows.push({
      planet,
      sign,
      longitude: positionLongitude({ ...position, sign }),
      motion: position?.motion === "retrograde" ? "retrograde" : "direct",
      transitStart: typeof position?.transitStart === "string" ? position.transitStart : null,
      transitEnd: typeof position?.transitEnd === "string" ? position.transitEnd : null
    });
  }
  return rows;
}

/** Whole-sign aspect between two signs, or "aversion" when they do not see each other. */
export function wholeSignAspect(signA, signB) {
  const a = signIndex(signA), b = signIndex(signB);
  if (a < 0 || b < 0) return null;
  return WHOLE_SIGN_ASPECTS[(b - a + 12) % 12] ?? "aversion";
}

/** Local weekday and its traditional day ruler. */
export function dayRulerFor(occursAt, timeZone = "America/New_York") {
  const date = new Date(occursAt);
  if (Number.isNaN(date.getTime())) return null;
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone }).format(date);
  return { weekday, ruler: DAY_RULERS[weekday] ?? null, timeZone };
}

function dignityRow(planet, sign) {
  const result = planetSignDignity(planet, sign);
  return result.status === "known" ? result.dignities : [];
}

function planetCondition(row) {
  if (!row) return null;
  return {
    planet: row.planet,
    sign: row.sign,
    degree: formatDegree(row.longitude),
    motion: row.motion,
    dignities: dignityRow(row.planet, row.sign),
    domicileRuler: DOMICILE_RULERS[row.sign] ?? null,
    exaltationRuler: EXALTATION_RULERS[row.sign] ?? null
  };
}

/** Follows domicile rulers until a planet sits in its own sign or the chain loops. */
export function dispositorChain(start, rows) {
  const bySign = new Map(rows.map((row) => [row.planet, row]));
  const chain = [];
  let current = title(start);
  while (current && bySign.has(current) && !chain.includes(current)) {
    chain.push(current);
    const ruler = DOMICILE_RULERS[bySign.get(current).sign];
    if (ruler === current) return { chain, ends: "domicile", endPlanet: current };
    current = ruler;
  }
  if (current && chain.includes(current)) {
    return { chain, ends: "loop", loop: chain.slice(chain.indexOf(current)) };
  }
  return { chain, ends: "missing", endPlanet: current || null };
}

/** Mutual receptions among the seven traditional planets, by domicile and exaltation. */
export function mutualReceptions(rows) {
  const traditional = rows.filter((row) => TRADITIONAL_PLANETS.includes(row.planet));
  const found = [];
  for (let i = 0; i < traditional.length; i += 1) {
    for (let j = i + 1; j < traditional.length; j += 1) {
      const a = traditional[i], b = traditional[j];
      const aHostsB = { domicile: DOMICILE_RULERS[b.sign] === a.planet, exaltation: EXALTATION_RULERS[b.sign] === a.planet };
      const bHostsA = { domicile: DOMICILE_RULERS[a.sign] === b.planet, exaltation: EXALTATION_RULERS[a.sign] === b.planet };
      for (const aBy of ["domicile", "exaltation"]) {
        for (const bBy of ["domicile", "exaltation"]) {
          if (!aHostsB[aBy] || !bHostsA[bBy]) continue;
          found.push({
            planets: [a.planet, b.planet],
            by: aBy === bBy ? aBy : "mixed",
            detail: `${a.planet} in ${a.sign} (${b.planet}'s ${bBy}), ${b.planet} in ${b.sign} (${a.planet}'s ${aBy})`,
            dignities: { [a.planet]: dignityRow(a.planet, a.sign), [b.planet]: dignityRow(b.planet, b.sign) },
            wholeSignAspect: wholeSignAspect(a.sign, b.sign)
          });
        }
      }
    }
  }
  return found;
}

/** Planets exalted in one axis sign and fallen in the other, and whether they sit on the axis now. */
export function axisDignityPattern(signA, signB, rows) {
  const a = title(signA), b = title(signB);
  const bySign = new Map(rows.map((row) => [row.planet, row.sign]));
  const entries = TRADITIONAL_PLANETS.flatMap((planet) => {
    const inA = dignityRow(planet, a), inB = dignityRow(planet, b);
    if (!inA.length && !inB.length) return [];
    return [{ planet, [a]: inA, [b]: inB, currentSign: bySign.get(planet) ?? null, onAxisNow: [a, b].includes(bySign.get(planet)) }];
  });
  const exaltedFallen = entries.filter((row) =>
    (row[a].includes("exaltation") && row[b].includes("fall")) ||
    (row[b].includes("exaltation") && row[a].includes("fall"))
  );
  const swap = exaltedFallen.length === 2
    ? {
        planets: exaltedFallen.map((row) => row.planet),
        bothOnAxisNow: exaltedFallen.every((row) => row.onAxisNow),
        detail: exaltedFallen.map((row) => `${row.planet} exalted in ${row[a].includes("exaltation") ? a : b}, fallen in ${row[a].includes("fall") ? a : b}`).join("; ")
      }
    : null;
  return { signs: [a, b], planets: entries, exaltationFallSwap: swap };
}

/** The most recent slow conjunction that seeded the ground this event stands on. */
export function seedConjunctions({ occursAt, focusLongitude, focusSign, rows }) {
  const at = new Date(occursAt).getTime();
  if (!Number.isFinite(at)) return [];
  const bySign = new Map(rows.map((row) => [row.planet, row.sign]));
  const latestByPair = new Map();
  for (const cycle of SLOW_CONJUNCTIONS) {
    const pastPasses = cycle.passes.filter(([date]) => new Date(`${date}T00:00:00Z`).getTime() <= at);
    if (!pastPasses.length) continue;
    const key = cycle.pair.join("-");
    const previous = latestByPair.get(key);
    const lastDate = pastPasses[pastPasses.length - 1][0];
    if (!previous || previous.lastDate < lastDate) latestByPair.set(key, { cycle, pastPasses, lastDate });
  }
  const seeds = [];
  for (const { cycle, pastPasses } of latestByPair.values()) {
    // Seeded ground: an exact pass in the event's sign within orb, or a pair
    // whose two planets are both still in the event's sign.
    const planetsInFocusSign = cycle.pair.filter((planet) => bySign.get(planet) === focusSign);
    const closest = cycle.passes.reduce((best, pass) => {
      const inSign = ZODIAC_SIGNS[Math.floor(pass[1] / 30)] === focusSign;
      const distance = Number.isFinite(focusLongitude) && inSign ? angularDistance(pass[1], focusLongitude) : Infinity;
      return distance < best.distance ? { pass, distance } : best;
    }, { pass: cycle.passes[0], distance: Infinity });
    if (planetsInFocusSign.length < 2 && closest.distance > SEED_ORB) continue;
    const first = pastPasses[0];
    seeds.push({
      pair: [...cycle.pair],
      passes: cycle.passes.map(([date, longitude]) => ({ date, degree: formatDegree(longitude), past: pastPasses.some((pass) => pass[0] === date) })),
      seedDate: first[0],
      seedDegree: formatDegree(first[1]),
      distanceFromEvent: round(closest.distance, 1),
      planetsStillInEventSign: planetsInFocusSign,
      currentMotion: Object.fromEntries(cycle.pair.map((planet) => [planet, rows.find((row) => row.planet === planet)?.motion ?? null]))
    });
  }
  return seeds.sort((x, y) => (x.distanceFromEvent ?? Infinity) - (y.distanceFromEvent ?? Infinity));
}

function nextSign(sign, motion) {
  const index = signIndex(sign);
  if (index < 0) return null;
  return ZODIAC_SIGNS[(index + (motion === "retrograde" ? 11 : 1)) % 12];
}

/** Sign changes within the window around the event, each read through its new sign's ruler. */
export function ingressesNear({ occursAt, rows, windowHours = INGRESS_WINDOW_HOURS }) {
  const at = new Date(occursAt).getTime();
  if (!Number.isFinite(at)) return [];
  const windowMs = windowHours * 3_600_000;
  const within = (iso) => {
    const t = new Date(iso ?? "").getTime();
    return Number.isFinite(t) && Math.abs(t - at) <= windowMs ? t : null;
  };
  const found = [];
  for (const row of rows) {
    if (["Moon", "North Node", "South Node"].includes(row.planet)) continue;
    const startedAt = within(row.transitStart);
    if (startedAt !== null) found.push({ planet: row.planet, sign: row.sign, at: row.transitStart, hoursFromEvent: round((startedAt - at) / 3_600_000, 1) });
    const endsAt = within(row.transitEnd);
    if (endsAt !== null) {
      const sign = nextSign(row.sign, row.motion);
      if (sign) found.push({ planet: row.planet, sign, at: row.transitEnd, hoursFromEvent: round((endsAt - at) / 3_600_000, 1) });
    }
  }
  return found
    .sort((x, y) => x.hoursFromEvent - y.hoursFromEvent)
    .map((ingress) => ({ ...ingress, reading: ingressRulerReading(ingress.planet, ingress.sign, rows) }));
}

/** The core ingress rule: read the entered sign through its ruler and that ruler's condition. */
export function ingressRulerReading(planet, sign, rows) {
  const entered = title(sign);
  const rulerName = DOMICILE_RULERS[entered] ?? null;
  const ruler = rows.find((row) => row.planet === rulerName) ?? null;
  const planetName = title(planet);
  const receivedBy = [];
  if (DOMICILE_RULERS[entered] && DOMICILE_RULERS[entered] !== planetName) receivedBy.push({ planet: DOMICILE_RULERS[entered], by: "domicile" });
  if (EXALTATION_RULERS[entered] && EXALTATION_RULERS[entered] !== planetName) receivedBy.push({ planet: EXALTATION_RULERS[entered], by: "exaltation" });
  const rulerSign = ruler?.sign ?? null;
  const mutual = Boolean(rulerSign && TRADITIONAL_PLANETS.includes(planetName) &&
    (DOMICILE_RULERS[rulerSign] === planetName || EXALTATION_RULERS[rulerSign] === planetName));
  return {
    planet: planetName,
    sign: entered,
    planetDignityInSign: dignityRow(planetName, entered),
    ruler: rulerName,
    rulerIsSelf: rulerName === planetName,
    rulerCondition: planetCondition(ruler),
    rulerSeesSign: rulerSign ? wholeSignAspect(entered, rulerSign) : null,
    receivedBy,
    mutualReceptionWithRuler: mutual
  };
}

function bodiesAround(focusLongitude, focusSign, rows, exclude) {
  const inSign = rows
    .filter((row) => row.sign === focusSign && !exclude.includes(row.planet) && Number.isFinite(row.longitude))
    .map((row) => {
      const signed = ((row.longitude - focusLongitude + 540) % 360) - 180;
      return {
        planet: row.planet,
        degree: formatDegree(row.longitude),
        motion: row.motion,
        traditional: TRADITIONAL_PLANETS.includes(row.planet),
        orb: round(Math.abs(signed), 1),
        side: signed < 0 ? "behind" : "ahead"
      };
    })
    .sort((x, y) => x.orb - y.orb);
  const behind = inSign.filter((row) => row.side === "behind")[0] ?? null;
  const ahead = inSign.filter((row) => row.side === "ahead")[0] ?? null;
  return {
    inSign,
    withinOrb: inSign.filter((row) => row.orb <= LUNATION_BODY_ORB),
    between: behind && ahead && behind.orb <= LUNATION_BODY_ORB && ahead.orb <= LUNATION_BODY_ORB
      ? [behind.planet, ahead.planet]
      : null
  };
}

function lunationKind(name, eclipseType) {
  const label = String(name ?? "").toLowerCase();
  if (eclipseType || label.includes("eclipse")) return label.includes("solar") || label.includes("new") ? "solar-eclipse" : "lunar-eclipse";
  if (label.includes("full")) return "full-moon";
  if (label.includes("new")) return "new-moon";
  return null;
}

/** Scores the traditional planets by how many threads of the event run through them. */
function governingPlanet(evidence) {
  const scores = new Map(TRADITIONAL_PLANETS.map((planet) => [planet, []]));
  const add = (planet, reason) => { if (scores.has(planet)) scores.get(planet).push(reason); };
  add(evidence.moonRuler, "rules the Moon's sign");
  if (evidence.sunRuler !== evidence.moonRuler) add(evidence.sunRuler, "rules the Sun's sign");
  add(evidence.dayRuler, "rules the day of the event");
  for (const body of evidence.lunationBodies) if (body.traditional) add(body.planet, "sits in the lunation");
  for (const planet of evidence.swapPlanets) add(planet, "exalted on one side of the axis and fallen on the other");
  for (const seed of evidence.seeds) for (const planet of seed.pair) add(planet, `part of the ${seed.pair.join("-")} seed conjunction`);
  for (const ingress of evidence.ingresses) {
    add(ingress.planet, `changes sign (${ingress.sign})`);
    if (ingress.reading.ruler && ingress.reading.ruler !== ingress.planet) add(ingress.reading.ruler, `rules ${ingress.sign}, where ${ingress.planet} is entering`);
  }
  for (const reception of evidence.receptions) {
    if (reception.planets.includes("Sun") || reception.planets.includes("Moon")) {
      for (const planet of reception.planets) if (planet !== "Sun" && planet !== "Moon") add(planet, `in mutual reception with the ${reception.planets.find((p) => p === "Sun" || p === "Moon")}`);
    }
  }
  return [...scores.entries()]
    .filter(([, reasons]) => reasons.length)
    .map(([planet, reasons]) => ({ planet, score: reasons.length, reasons }))
    .sort((x, y) => y.score - x.score);
}

/** Reasoning facts for a New Moon, Full Moon, or eclipse. Positions must be for the exact lunation. */
export function lunationReasoningFacts({ positions, moonEvent, occursAt, timeZone = "America/New_York" }) {
  const rows = normalizePositions(positions);
  const moon = rows.find((row) => row.planet === "Moon");
  const sun = rows.find((row) => row.planet === "Sun");
  const at = occursAt ?? moonEvent?.occursAt;
  const kind = lunationKind(moonEvent?.name, moonEvent?.eclipseType);
  if (!moon || !sun || !kind || !at) {
    return { version: SKY_EVENT_REASONING_FACTS_VERSION, status: "incomplete", reason: "Moon, Sun, event type, and exact time are required." };
  }
  const day = dayRulerFor(at, timeZone);
  const lunation = bodiesAround(moon.longitude, moon.sign, rows, ["Moon", "Sun"]);
  const receptions = mutualReceptions(rows);
  const axis = kind === "full-moon" || kind === "lunar-eclipse" ? axisDignityPattern(moon.sign, sun.sign, rows) : null;
  const seeds = seedConjunctions({ occursAt: at, focusLongitude: moon.longitude, focusSign: moon.sign, rows });
  const ingresses = ingressesNear({ occursAt: at, rows });
  const moonRuler = DOMICILE_RULERS[moon.sign];
  const sunRuler = DOMICILE_RULERS[sun.sign];
  const moonRulerRow = rows.find((row) => row.planet === moonRuler);
  const sunRulerRow = rows.find((row) => row.planet === sunRuler);
  const ranking = governingPlanet({
    moonRuler,
    sunRuler,
    dayRuler: day?.ruler,
    lunationBodies: lunation.withinOrb,
    swapPlanets: axis?.exaltationFallSwap?.bothOnAxisNow ? axis.exaltationFallSwap.planets : [],
    seeds,
    ingresses,
    receptions
  });
  return {
    version: SKY_EVENT_REASONING_FACTS_VERSION,
    status: "complete",
    event: {
      kind,
      occursAt: at,
      moon: formatDegree(moon.longitude),
      sun: formatDegree(sun.longitude),
      weekday: day?.weekday ?? null,
      dayRuler: day?.ruler ?? null,
      timeZone
    },
    skyAnchor: {
      bodiesInLunation: lunation.withinOrb,
      moonBetween: lunation.between,
      otherBodiesInMoonSign: lunation.inSign.filter((row) => row.orb > LUNATION_BODY_ORB)
    },
    cycleAnchor: { seedConjunctions: seeds },
    lights: {
      moon: planetCondition(moon),
      sun: planetCondition(sun),
      moonRuler: { ...planetCondition(moonRulerRow), seesMoon: moonRulerRow ? wholeSignAspect(moon.sign, moonRulerRow.sign) : null },
      sunRuler: { ...planetCondition(sunRulerRow), seesSun: sunRulerRow ? wholeSignAspect(sun.sign, sunRulerRow.sign) : null },
      moonDispositorChain: dispositorChain("Moon", rows),
      sunDispositorChain: dispositorChain("Sun", rows)
    },
    axis,
    receptions,
    ingressesInWindow: ingresses,
    governingPlanet: ranking[0] ?? null,
    governingPlanetRanking: ranking.slice(0, 4)
  };
}

/** Reasoning facts for one ingress. Positions must be for the ingress moment or its day. */
export function ingressReasoningFacts({ positions, planet, sign, occursAt, timeZone = "America/New_York" }) {
  const rows = normalizePositions(positions);
  const reading = ingressRulerReading(planet, sign, rows);
  const day = occursAt ? dayRulerFor(occursAt, timeZone) : null;
  const ingressing = rows.find((row) => row.planet === reading.planet);
  return {
    version: SKY_EVENT_REASONING_FACTS_VERSION,
    status: reading.ruler ? "complete" : "incomplete",
    event: {
      kind: "ingress",
      occursAt: occursAt ?? null,
      planet: reading.planet,
      sign: reading.sign,
      motion: ingressing?.motion ?? null,
      weekday: day?.weekday ?? null,
      dayRuler: day?.ruler ?? null,
      timeZone
    },
    rulerReading: reading,
    rulerDispositorChain: reading.ruler ? dispositorChain(reading.ruler, rows) : null,
    receptions: mutualReceptions(rows).filter((reception) => reception.planets.includes(reading.planet) || reception.planets.includes(reading.ruler)),
    seedConjunctions: occursAt ? seedConjunctions({ occursAt, focusLongitude: signIndex(reading.sign) * 30, focusSign: reading.sign, rows }) : [],
    otherIngressesInWindow: occursAt ? ingressesNear({ occursAt, rows }).filter((row) => !(row.planet === reading.planet && row.sign === reading.sign)) : []
  };
}
