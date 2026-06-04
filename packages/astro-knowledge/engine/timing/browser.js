const SIGNS = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces"
];

const TRADITIONAL_RULERS = {
  aries: "mars",
  taurus: "venus",
  gemini: "mercury",
  cancer: "moon",
  leo: "sun",
  virgo: "mercury",
  libra: "venus",
  scorpio: "mars",
  sagittarius: "jupiter",
  capricorn: "saturn",
  aquarius: "saturn",
  pisces: "jupiter"
};

const HOUSE_TOPICS = {
  1: "self, body, vitality, and the year's overall direction",
  2: "money, resources, livelihood, and movable goods",
  3: "siblings, neighbors, short trips, daily communication, and learning",
  4: "home, family, parents, foundations, property, and endings",
  5: "children, creativity, pleasure, romance, and speculation",
  6: "work, routine, health, illness, subordinates, and daily grind",
  7: "marriage, partners, clients, open opponents, and one-to-one dealings",
  8: "shared resources, debt, other people's money, crisis, and major transition",
  9: "travel, foreigners, higher learning, religion, philosophy, and publishing",
  10: "career, action, reputation, public standing, and authority",
  11: "friends, allies, groups, patrons, hopes, goals, and gains",
  12: "seclusion, loss, hidden things, self-undoing, hidden opponents, and retreat"
};

const TRANSIT_WEIGHTS = {
  transitingBody: {
    pluto: 10,
    neptune: 9,
    uranus: 9,
    saturn: 8,
    jupiter: 6,
    mars: 4,
    sun: 3,
    venus: 3,
    mercury: 2,
    moon: 1
  },
  aspect: {
    conjunction: 10,
    opposition: 8,
    square: 8,
    trine: 5,
    sextile: 4
  },
  target: {
    sun: 10,
    moon: 10,
    ascendant: 9,
    mc: 9,
    descendant: 9,
    ic: 9,
    mercury: 6,
    venus: 6,
    mars: 6,
    nodes: 5,
    north_node: 5,
    south_node: 5,
    jupiter: 4,
    saturn: 4,
    chiron: 4,
    uranus: 3,
    neptune: 3,
    pluto: 3
  }
};

const SIGNIFICANCE_LABELS = [
  { min: 80, label: "major theme" },
  { min: 50, label: "active theme" },
  { min: 25, label: "background influence" },
  { min: 0, label: "low priority" }
];

function normalizeToken(value) {
  if (typeof value !== "string" || value.trim() === "") return null;

  return value.trim().toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
}

function normalizeSign(sign) {
  const normalized = normalizeToken(sign);
  if (!SIGNS.includes(normalized)) {
    throw new RangeError(`Unknown zodiac sign: ${sign}`);
  }

  return normalized;
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function getProfectedHouse(ageYears) {
  if (!Number.isInteger(ageYears) || ageYears < 0) {
    throw new RangeError("ageYears must be a non-negative integer");
  }

  return positiveModulo(ageYears, 12) + 1;
}

function getProfectedSign(ascendantSign, ageYears) {
  const ascendant = normalizeSign(ascendantSign);
  const startIndex = SIGNS.indexOf(ascendant);

  return SIGNS[positiveModulo(startIndex + ageYears, SIGNS.length)];
}

function getLordOfYear(profectedSign) {
  return TRADITIONAL_RULERS[normalizeSign(profectedSign)];
}

function activeNatalPlanetsInSign(natalPlanets, sign) {
  if (!Array.isArray(natalPlanets)) return [];

  const targetSign = normalizeSign(sign);

  return natalPlanets
    .filter((placement) => placement && placement.planet && placement.sign)
    .filter((placement) => normalizeSign(placement.sign) === targetSign)
    .map((placement) => normalizeToken(placement.planet));
}

export function buildAnnualTimingContext(input) {
  const ageYears = input.ageYears;
  const profectedHouse = getProfectedHouse(ageYears);
  const profectedSign = getProfectedSign(input.ascendantSign, ageYears);
  const lordOfYear = getLordOfYear(profectedSign);

  return {
    ageYears,
    profectedHouse,
    profectedSign,
    lordOfYear,
    houseTopic: HOUSE_TOPICS[profectedHouse],
    activeNatalPlanetsInProfectedSign: activeNatalPlanetsInSign(
      input.natalPlanets || [],
      profectedSign
    )
  };
}

function tightnessFactor(orbDegrees) {
  if (typeof orbDegrees !== "number" || Number.isNaN(orbDegrees)) return 0.7;
  const orb = Math.abs(orbDegrees);
  if (orb <= 1) return 1;
  if (orb <= 3) return 0.7;
  if (orb <= 5) return 0.4;
  return 0;
}

function applyingFactor(phase) {
  const normalized = normalizeToken(phase);
  if (normalized === "applying") return 1.2;
  if (normalized === "separating") return 0.9;
  return 1;
}

function significanceLabel(score) {
  const found = SIGNIFICANCE_LABELS.find((entry) => score >= entry.min);

  return found ? found.label : "low priority";
}

function hasActiveNatalTarget(transit, timingContext) {
  const target = normalizeToken(transit.natalTarget || transit.target);
  if (!target || !Array.isArray(timingContext.activeNatalPlanetsInProfectedSign)) {
    return false;
  }

  return timingContext.activeNatalPlanetsInProfectedSign.includes(target);
}

function scoreTransit(transit, timingContext = {}, options = {}) {
  const weights = options.weights || TRANSIT_WEIGHTS;
  const transitingPlanet = normalizeToken(transit.transitingPlanet || transit.transiting);
  const natalTarget = normalizeToken(transit.natalTarget || transit.target);
  const aspect = normalizeToken(transit.aspect);
  const transitSign = normalizeToken(transit.sign);

  const bodyWeight = weights.transitingBody[transitingPlanet] || 1;
  const aspectWeight = weights.aspect[aspect] || 1;
  const targetWeight = weights.target[natalTarget] || 1;
  const baseScore =
    bodyWeight *
    aspectWeight *
    targetWeight *
    tightnessFactor(transit.orbDegrees) *
    applyingFactor(transit.phase);

  const bonuses = [];
  let bonusScore = 0;

  if (natalTarget && natalTarget === normalizeToken(timingContext.lordOfYear)) {
    bonusScore += 30;
    bonuses.push("hits_lord_of_year");
  }

  if (natalTarget && natalTarget === normalizeToken(timingContext.chartRuler)) {
    bonusScore += 30;
    bonuses.push("hits_chart_ruler");
  }

  if (transitingPlanet && transitingPlanet === normalizeToken(timingContext.lordOfYear)) {
    bonusScore += 20;
    bonuses.push("made_by_lord_of_year");
  }

  if (Number(transit.house) === Number(timingContext.profectedHouse)) {
    bonusScore += 25;
    bonuses.push("moves_through_profected_house");
  }

  if (transitSign && transitSign === normalizeToken(timingContext.profectedSign)) {
    bonusScore += 20;
    bonuses.push("moves_through_profected_sign");
  }

  if (hasActiveNatalTarget(transit, timingContext)) {
    bonusScore += 15;
    bonuses.push("hits_planet_in_profected_sign");
  }

  if (transit.touchesAngle) {
    bonusScore += 20;
    bonuses.push("touches_angle");
  }

  if (transit.repeatsNatalPromise) {
    bonusScore += 20;
    bonuses.push("repeats_natal_promise");
  }

  if (transit.repeatsReturnTheme) {
    bonusScore += 15;
    bonuses.push("repeats_return_theme");
  }

  if (transit.isStationary) {
    bonusScore += 10;
    bonuses.push("stationary_or_slow");
  }

  if (typeof transit.conditionScore === "number") {
    bonusScore += transit.conditionScore;
    bonuses.push("planet_condition_score");
  }

  if (typeof transit.bonificationMaltreatmentScore === "number") {
    bonusScore += transit.bonificationMaltreatmentScore;
    bonuses.push("benefic_malefic_testimony");
  }

  const score = Math.round(baseScore + bonusScore);

  return {
    ...transit,
    score,
    label: significanceLabel(score),
    factors: {
      baseScore: Math.round(baseScore),
      bonusScore,
      bonuses
    }
  };
}

export function rankTransits(transits, timingContext = {}, options = {}) {
  if (!Array.isArray(transits)) {
    throw new TypeError("transits must be an array");
  }

  return transits
    .map((transit) => scoreTransit(transit, timingContext, options))
    .sort((a, b) => b.score - a.score);
}
