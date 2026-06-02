"use strict";

const { normalizeDegrees, shortestArc } = require("./aspects");
const { TRADITIONAL_RULERS } = require("./constants");

const DIGNITY = Object.freeze({
  exaltation: Object.freeze({
    sun: "aries",
    moon: "taurus",
    mercury: "virgo",
    venus: "pisces",
    mars: "capricorn",
    jupiter: "cancer",
    saturn: "libra"
  }),
  detriment: Object.freeze({
    sun: ["aquarius"],
    moon: ["capricorn"],
    mercury: ["sagittarius", "pisces"],
    venus: ["aries", "scorpio"],
    mars: ["taurus", "libra"],
    jupiter: ["gemini", "virgo"],
    saturn: ["cancer", "leo"]
  }),
  fall: Object.freeze({
    sun: "libra",
    moon: "scorpio",
    mercury: "pisces",
    venus: "virgo",
    mars: "cancer",
    jupiter: "capricorn",
    saturn: "aries"
  })
});

const ANGULARITY_BY_HOUSE = Object.freeze({
  1: "angular",
  4: "angular",
  7: "angular",
  10: "angular",
  2: "succedent",
  5: "succedent",
  8: "succedent",
  11: "succedent",
  3: "cadent",
  6: "cadent",
  9: "cadent",
  12: "cadent"
});

const ANGULARITY_SCORE = Object.freeze({
  angular: 20,
  succedent: 10,
  cadent: -5
});

const BENEFICS = Object.freeze(["jupiter", "venus"]);
const MALEFICS = Object.freeze(["mars", "saturn"]);
const HARD_ASPECTS = Object.freeze(["conjunction", "square", "opposition"]);
const SUPPORTIVE_ASPECTS = Object.freeze(["conjunction", "sextile", "trine"]);

function normalizeToken(value) {
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim().toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
}

function dignityScore(planet, sign) {
  const body = normalizeToken(planet);
  const zodiacSign = normalizeToken(sign);
  let score = 0;
  const reasons = [];

  if (TRADITIONAL_RULERS[zodiacSign] === body) {
    score += 5;
    reasons.push("domicile");
  }

  if (DIGNITY.exaltation[body] === zodiacSign) {
    score += 4;
    reasons.push("exaltation");
  }

  if ((DIGNITY.detriment[body] || []).includes(zodiacSign)) {
    score -= 5;
    reasons.push("detriment");
  }

  if (DIGNITY.fall[body] === zodiacSign) {
    score -= 4;
    reasons.push("fall");
  }

  return { score, reasons };
}

function angularity(house) {
  const normalizedHouse = Number(house);
  const type = ANGULARITY_BY_HOUSE[normalizedHouse];
  if (!type) throw new RangeError(`Unknown house: ${house}`);

  return {
    type,
    score: ANGULARITY_SCORE[type]
  };
}

function sectStatus(planet, chartSect) {
  const body = normalizeToken(planet);
  const sect = normalizeToken(chartSect);
  if (body === "mercury") return "variable";
  if (body === "sun" || body === "jupiter" || body === "saturn") {
    return sect === "diurnal" || sect === "day" ? "in_sect" : "out_of_sect";
  }
  if (body === "moon" || body === "venus" || body === "mars") {
    return sect === "nocturnal" || sect === "night" ? "in_sect" : "out_of_sect";
  }
  return "not_applicable";
}

function solarCondition(planetDegrees, sunDegrees) {
  const distance = shortestArc(normalizeDegrees(planetDegrees), normalizeDegrees(sunDegrees));
  if (distance <= 17 / 60) return { condition: "cazimi", score: 15, distance };
  if (distance <= 8) return { condition: "combust", score: -15, distance };
  if (distance <= 15) return { condition: "under_beams", score: -8, distance };
  return { condition: "free_of_beams", score: 0, distance };
}

function conditionScore(input) {
  const dignity = dignityScore(input.planet, input.sign);
  const house = input.house ? angularity(input.house) : { type: null, score: 0 };
  const solar = typeof input.sunDegrees === "number" && typeof input.planetDegrees === "number"
    ? solarCondition(input.planetDegrees, input.sunDegrees)
    : { condition: null, score: 0 };
  const sect = input.chartSect ? sectStatus(input.planet, input.chartSect) : null;
  const sectScore = sect === "in_sect" ? 8 : sect === "out_of_sect" ? -8 : 0;

  return {
    score: dignity.score + house.score + solar.score + sectScore,
    dignity,
    angularity: house,
    solarCondition: solar,
    sectStatus: sect,
    sectScore
  };
}

function bonificationMaltreatment(contact, chartSect) {
  const planet = normalizeToken(contact.planet || contact.transitingPlanet || contact.body);
  const aspect = normalizeToken(contact.aspect);
  const sect = chartSect ? sectStatus(planet, chartSect) : null;
  let score = 0;
  const flags = [];

  if (BENEFICS.includes(planet) && SUPPORTIVE_ASPECTS.includes(aspect)) {
    score += sect === "in_sect" ? 18 : 12;
    flags.push("bonification");
  }

  if (MALEFICS.includes(planet) && HARD_ASPECTS.includes(aspect)) {
    score -= sect === "out_of_sect" ? 18 : 10;
    flags.push("maltreatment");
  }

  if (contact.dignifiedMalefic && MALEFICS.includes(planet)) {
    score += 5;
    flags.push("dignified_malefic_mitigation");
  }

  return {
    score,
    flags,
    sectStatus: sect
  };
}

module.exports = {
  ANGULARITY_BY_HOUSE,
  ANGULARITY_SCORE,
  BENEFICS,
  HARD_ASPECTS,
  MALEFICS,
  SUPPORTIVE_ASPECTS,
  angularity,
  bonificationMaltreatment,
  conditionScore,
  dignityScore,
  sectStatus,
  solarCondition
};
