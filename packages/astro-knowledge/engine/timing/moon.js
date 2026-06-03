"use strict";

const { normalizeDegrees, shortestArc } = require("./aspects");

const PHASES = Object.freeze([
  { id: "new", min: 0, max: 44.999 },
  { id: "crescent", min: 45, max: 89.999 },
  { id: "first_quarter", min: 90, max: 134.999 },
  { id: "gibbous", min: 135, max: 179.999 },
  { id: "full", min: 180, max: 224.999 },
  { id: "disseminating", min: 225, max: 269.999 },
  { id: "last_quarter", min: 270, max: 314.999 },
  { id: "balsamic", min: 315, max: 359.999 }
]);

function moonSunSeparation(moonDegrees, sunDegrees) {
  return normalizeDegrees(moonDegrees - sunDegrees);
}

function moonPhaseFromSeparation(separationDegrees) {
  const separation = normalizeDegrees(separationDegrees);
  return PHASES.find((phase) => separation >= phase.min && separation <= phase.max).id;
}

function moonPhase(moonDegrees, sunDegrees) {
  const separation = moonSunSeparation(moonDegrees, sunDegrees);
  const phase = moonPhaseFromSeparation(separation);
  return {
    phase,
    separation,
    waxing: separation > 0 && separation < 180,
    waning: separation > 180 && separation < 360,
    exactnessFromNewOrFull: Math.min(shortestArc(separation, 0), shortestArc(separation, 180))
  };
}

function ritualWindow(input) {
  const phase = input.phase;
  const hoursAfterExact = input.hoursAfterExact;

  if (input.isEclipse) {
    return {
      mode: "witness",
      allowed: false,
      reason: "eclipse_exception"
    };
  }

  if (phase === "new") {
    return {
      mode: "intention",
      allowed: hoursAfterExact >= 0 && hoursAfterExact <= 60,
      strongest: hoursAfterExact >= 0 && hoursAfterExact <= 8
    };
  }

  if (phase === "full") {
    return {
      mode: "release",
      allowed: hoursAfterExact >= 0,
      strongest: hoursAfterExact >= 0 && hoursAfterExact <= 24
    };
  }

  return {
    mode: "ordinary",
    allowed: false,
    strongest: false
  };
}

function detectDoubleNewMoon(previousNewMoon, currentNewMoon) {
  if (!previousNewMoon || !currentNewMoon) return { doubleNewMoon: false };
  const sameSign = previousNewMoon.sign === currentNewMoon.sign;
  const earlyThenLate = previousNewMoon.degree <= 3 && currentNewMoon.degree >= 27;

  return {
    doubleNewMoon: sameSign && earlyThenLate,
    sign: sameSign && earlyThenLate ? currentNewMoon.sign : null
  };
}

module.exports = {
  PHASES,
  detectDoubleNewMoon,
  moonPhase,
  moonPhaseFromSeparation,
  moonSunSeparation,
  ritualWindow
};
