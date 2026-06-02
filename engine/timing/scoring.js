"use strict";

const {
  SIGNIFICANCE_LABELS,
  TRANSIT_WEIGHTS
} = require("./constants");

function normalizeToken(value) {
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim().toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
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

function rankTransits(transits, timingContext = {}, options = {}) {
  if (!Array.isArray(transits)) {
    throw new TypeError("transits must be an array");
  }

  return transits
    .map((transit) => scoreTransit(transit, timingContext, options))
    .sort((a, b) => b.score - a.score);
}

module.exports = {
  applyingFactor,
  rankTransits,
  scoreTransit,
  significanceLabel,
  tightnessFactor
};
