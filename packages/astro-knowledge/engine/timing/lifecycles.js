"use strict";

const { isAspectActive, normalizeDegrees } = require("./aspects");
const { moonPhaseFromSeparation } = require("./moon");

const SATURN_MILESTONES = Object.freeze([
  { id: "first_waxing_square", aspect: "square", ageRange: [6, 8] },
  { id: "first_opposition", aspect: "opposition", ageRange: [13, 15] },
  { id: "first_waning_square", aspect: "square", ageRange: [20, 22] },
  { id: "first_return", aspect: "conjunction", ageRange: [29, 30] },
  { id: "second_waxing_square", aspect: "square", ageRange: [36, 37] },
  { id: "second_opposition", aspect: "opposition", ageRange: [43, 45] },
  { id: "second_waning_square", aspect: "square", ageRange: [50, 52] },
  { id: "second_return", aspect: "conjunction", ageRange: [58, 60] },
  { id: "third_return", aspect: "conjunction", ageRange: [87, 89] }
]);

const URANUS_MILESTONES = Object.freeze([
  { id: "waxing_square", aspect: "square", ageRange: [20, 22] },
  { id: "opposition", aspect: "opposition", ageRange: [40, 44] },
  { id: "waning_square", aspect: "square", ageRange: [61, 65] },
  { id: "return", aspect: "conjunction", ageRange: [82, 86] }
]);

const NODAL_MILESTONES = Object.freeze([
  { id: "nodal_reversal", aspect: "opposition", ageRange: [9, 10] },
  { id: "nodal_return", aspect: "conjunction", ageRange: [18, 19] },
  { id: "nodal_reversal_2", aspect: "opposition", ageRange: [27, 28] },
  { id: "nodal_return_2", aspect: "conjunction", ageRange: [37, 38] },
  { id: "nodal_reversal_3", aspect: "opposition", ageRange: [46, 47] },
  { id: "nodal_return_3", aspect: "conjunction", ageRange: [55, 56] }
]);

const JUPITER_MILESTONES = Object.freeze([
  { id: "waxing_square", aspect: "square", ageModulo: 3 },
  { id: "opposition", aspect: "opposition", ageModulo: 6 },
  { id: "waning_square", aspect: "square", ageModulo: 9 },
  { id: "return", aspect: "conjunction", ageModulo: 0 }
]);

const CHIRON_MILESTONES = Object.freeze([
  { id: "first_sextile", aspect: "sextile", ageRange: [3, 16] },
  { id: "first_square", aspect: "square", ageRange: [5, 23] },
  { id: "first_trine", aspect: "trine", ageRange: [8, 29] },
  { id: "opposition", aspect: "opposition", ageRange: [13, 37] },
  { id: "second_trine", aspect: "trine", ageRange: [21, 42] },
  { id: "second_square", aspect: "square", ageRange: [27, 44] },
  { id: "return", aspect: "conjunction", ageRange: [50, 51] }
]);

function ageWindow(ageYears, milestones) {
  return milestones.filter((milestone) => {
    const [min, max] = milestone.ageRange;
    return ageYears >= min && ageYears <= max;
  });
}

function exactLifecycleContact(transitingDegrees, natalDegrees, aspect, orb = 2) {
  const active = isAspectActive({
    degreesA: transitingDegrees,
    degreesB: natalDegrees,
    aspect,
    profile: "transit"
  });

  return {
    active: active.orb <= orb,
    orb: active.orb,
    aspect
  };
}

function saturnLifecycle(ageYears, transitingSaturnDegrees, natalSaturnDegrees) {
  const ageCandidates = ageWindow(ageYears, SATURN_MILESTONES);
  const exactCandidates = ageCandidates
    .map((milestone) => ({
      ...milestone,
      contact: exactLifecycleContact(transitingSaturnDegrees, natalSaturnDegrees, milestone.aspect)
    }))
    .filter((milestone) => milestone.contact.active);

  return { ageCandidates, exactCandidates };
}

function uranusLifecycle(ageYears, transitingUranusDegrees, natalUranusDegrees) {
  const ageCandidates = ageWindow(ageYears, URANUS_MILESTONES);
  const exactCandidates = ageCandidates
    .map((milestone) => ({
      ...milestone,
      contact: exactLifecycleContact(transitingUranusDegrees, natalUranusDegrees, milestone.aspect, 3)
    }))
    .filter((milestone) => milestone.contact.active);

  return { ageCandidates, exactCandidates };
}

function nodalLifecycle(ageYears, transitingNodeDegrees, natalNodeDegrees) {
  const ageCandidates = ageWindow(ageYears, NODAL_MILESTONES);
  const exactCandidates = ageCandidates
    .map((milestone) => ({
      ...milestone,
      contact: exactLifecycleContact(transitingNodeDegrees, natalNodeDegrees, milestone.aspect, 3)
    }))
    .filter((milestone) => milestone.contact.active);

  return { ageCandidates, exactCandidates };
}

function jupiterLifecycle(ageYears, transitingJupiterDegrees, natalJupiterDegrees) {
  const ageModulo = ageYears % 12;
  const ageCandidates = JUPITER_MILESTONES.filter((milestone) => milestone.ageModulo === ageModulo);
  const exactCandidates = ageCandidates
    .map((milestone) => ({
      ...milestone,
      contact: exactLifecycleContact(transitingJupiterDegrees, natalJupiterDegrees, milestone.aspect, 3)
    }))
    .filter((milestone) => milestone.contact.active);

  return { ageCandidates, exactCandidates };
}

function chironLifecycle(ageYears, transitingChironDegrees, natalChironDegrees) {
  const ageCandidates = ageWindow(ageYears, CHIRON_MILESTONES);
  const exactCandidates = ageCandidates
    .map((milestone) => ({
      ...milestone,
      contact: exactLifecycleContact(transitingChironDegrees, natalChironDegrees, milestone.aspect, 3)
    }))
    .filter((milestone) => milestone.contact.active);

  return { ageCandidates, exactCandidates };
}

function progressedLunationPhase(progressedMoonDegrees, progressedSunDegrees) {
  const separation = normalizeDegrees(progressedMoonDegrees - progressedSunDegrees);
  const phase = moonPhaseFromSeparation(separation);
  const boundaryDistance = Math.min(
    ...[0, 45, 90, 135, 180, 225, 270, 315, 360].map((boundary) =>
      Math.abs(separation - boundary)
    )
  );

  return {
    phase,
    separation,
    nearPhaseBoundary: boundaryDistance <= 2,
    boundaryDistance
  };
}

module.exports = {
  CHIRON_MILESTONES,
  JUPITER_MILESTONES,
  NODAL_MILESTONES,
  SATURN_MILESTONES,
  URANUS_MILESTONES,
  ageWindow,
  chironLifecycle,
  jupiterLifecycle,
  nodalLifecycle,
  progressedLunationPhase,
  saturnLifecycle,
  uranusLifecycle
};
