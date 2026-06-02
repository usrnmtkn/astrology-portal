"use strict";

const ASPECT_ANGLES = Object.freeze({
  conjunction: 0,
  sextile: 60,
  square: 90,
  trine: 120,
  opposition: 180
});

const CANONICAL_PAIR_ORDER = Object.freeze([
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto"
]);

const SAME_MOMENT_IMPOSSIBLE = Object.freeze({
  sun_mercury: Object.freeze(["sextile", "square", "trine", "opposition"]),
  sun_venus: Object.freeze(["sextile", "square", "trine", "opposition"]),
  mercury_venus: Object.freeze(["square", "trine", "opposition"])
});

const ORB_PROFILES = Object.freeze({
  natal: Object.freeze({
    conjunction: 8,
    opposition: 8,
    trine: 7,
    square: 7,
    sextile: 5,
    luminaryModifier: 2
  }),
  transit: Object.freeze({
    conjunction: 3,
    opposition: 3,
    trine: 3,
    square: 3,
    sextile: 2,
    luminaryModifier: 0
  }),
  synastry: Object.freeze({
    conjunction: 8,
    opposition: 8,
    trine: 7,
    square: 7,
    sextile: 5,
    luminaryModifier: 2
  }),
  composite: Object.freeze({
    conjunction: 3,
    opposition: 3,
    trine: 3,
    square: 3,
    sextile: 2,
    luminaryModifier: 0
  })
});

function normalizeToken(value) {
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim().toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
}

function normalizeDegrees(degrees) {
  if (typeof degrees !== "number" || Number.isNaN(degrees)) {
    throw new TypeError("degrees must be a number");
  }

  return ((degrees % 360) + 360) % 360;
}

function shortestArc(degreesA, degreesB) {
  const diff = Math.abs(normalizeDegrees(degreesA) - normalizeDegrees(degreesB));
  return diff > 180 ? 360 - diff : diff;
}

function aspectSeparation(degreesA, degreesB, aspect) {
  const exactAngle = ASPECT_ANGLES[normalizeToken(aspect)];
  if (exactAngle === undefined) throw new RangeError(`Unknown aspect: ${aspect}`);
  return Math.abs(shortestArc(degreesA, degreesB) - exactAngle);
}

function effectiveOrb(aspect, profile = "transit", bodies = []) {
  const profileConfig = ORB_PROFILES[normalizeToken(profile)] || ORB_PROFILES.transit;
  const aspectName = normalizeToken(aspect);
  const baseOrb = profileConfig[aspectName];
  if (typeof baseOrb !== "number") throw new RangeError(`Unknown aspect: ${aspect}`);

  const hasLuminary = bodies.some((body) => {
    const normalized = normalizeToken(body);
    return normalized === "sun" || normalized === "moon";
  });

  return baseOrb + (hasLuminary ? profileConfig.luminaryModifier : 0);
}

function isAspectActive(input) {
  const orb = aspectSeparation(input.degreesA, input.degreesB, input.aspect);
  const cap = effectiveOrb(input.aspect, input.profile, input.bodies || []);
  return {
    active: orb <= cap,
    orb,
    effectiveOrb: cap
  };
}

function nearestMajorAspect(degreesA, degreesB, profile = "transit", bodies = []) {
  const candidates = Object.keys(ASPECT_ANGLES).map((aspect) => {
    const orb = aspectSeparation(degreesA, degreesB, aspect);
    return {
      aspect,
      orb,
      effectiveOrb: effectiveOrb(aspect, profile, bodies)
    };
  });

  candidates.sort((a, b) => a.orb - b.orb);
  const nearest = candidates[0];
  return {
    ...nearest,
    active: nearest.orb <= nearest.effectiveOrb
  };
}

function canonicalPair(bodyA, bodyB) {
  const first = normalizeToken(bodyA);
  const second = normalizeToken(bodyB);
  const firstIndex = CANONICAL_PAIR_ORDER.indexOf(first);
  const secondIndex = CANONICAL_PAIR_ORDER.indexOf(second);

  if (firstIndex === -1 || secondIndex === -1) {
    throw new RangeError(`Unknown body pair: ${bodyA}, ${bodyB}`);
  }

  return firstIndex <= secondIndex ? [first, second] : [second, first];
}

function sameMomentAspectKey(bodyA, bodyB, aspect) {
  const [first, second] = canonicalPair(bodyA, bodyB);
  const aspectName = normalizeToken(aspect);
  const key = `${first}_${second}`;
  const impossible = SAME_MOMENT_IMPOSSIBLE[key] || [];

  if (impossible.includes(aspectName)) {
    return null;
  }

  return `${first}_${second}_${aspectName}`;
}

function transitToNatalAspectKey(transiting, natal, aspect) {
  return `${normalizeToken(transiting)}_${normalizeToken(natal)}_${normalizeToken(aspect)}`;
}

module.exports = {
  ASPECT_ANGLES,
  CANONICAL_PAIR_ORDER,
  ORB_PROFILES,
  SAME_MOMENT_IMPOSSIBLE,
  aspectSeparation,
  canonicalPair,
  effectiveOrb,
  isAspectActive,
  nearestMajorAspect,
  normalizeDegrees,
  sameMomentAspectKey,
  shortestArc,
  transitToNatalAspectKey
};
