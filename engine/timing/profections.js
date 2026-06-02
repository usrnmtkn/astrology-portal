"use strict";

const {
  HOUSE_TOPICS,
  SIGNS,
  TRADITIONAL_RULERS
} = require("./constants");

function normalizeToken(value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${fieldName} must be a non-empty string`);
  }

  return value.trim().toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
}

function normalizeSign(sign) {
  const normalized = normalizeToken(sign, "sign");
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

function parseDateParts(input, fieldName) {
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) throw new RangeError(`${fieldName} is invalid`);
    return {
      year: input.getUTCFullYear(),
      month: input.getUTCMonth() + 1,
      day: input.getUTCDate()
    };
  }

  if (typeof input === "string") {
    const match = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) throw new TypeError(`${fieldName} must be a Date or YYYY-MM-DD string`);
    return {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3])
    };
  }

  throw new TypeError(`${fieldName} must be a Date or YYYY-MM-DD string`);
}

function calculateCompletedAge(birthDate, currentDate) {
  const birth = parseDateParts(birthDate, "birthDate");
  const current = parseDateParts(currentDate, "currentDate");
  let age = current.year - birth.year;

  const birthdayHasPassed =
    current.month > birth.month ||
    (current.month === birth.month && current.day >= birth.day);

  if (!birthdayHasPassed) age -= 1;
  if (age < 0) throw new RangeError("currentDate must be on or after birthDate");

  return age;
}

function activeNatalPlanetsInSign(natalPlanets, sign) {
  if (!Array.isArray(natalPlanets)) return [];

  const targetSign = normalizeSign(sign);
  return natalPlanets
    .filter((placement) => placement && placement.planet && placement.sign)
    .filter((placement) => normalizeSign(placement.sign) === targetSign)
    .map((placement) => normalizeToken(placement.planet, "planet"));
}

function buildAnnualTimingContext(input) {
  const ageYears = Number.isInteger(input.ageYears)
    ? input.ageYears
    : calculateCompletedAge(input.birthDate, input.currentDate);

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

module.exports = {
  activeNatalPlanetsInSign,
  buildAnnualTimingContext,
  calculateCompletedAge,
  getLordOfYear,
  getProfectedHouse,
  getProfectedSign,
  normalizeSign
};
