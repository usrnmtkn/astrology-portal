"use strict";

const PERSONAL_CALLOUT_TARGETS = Object.freeze([
  "sun",
  "moon",
  "ascendant",
  "venus",
  "mars",
  "mc"
]);

function normalizeToken(value) {
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim().toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
}

function shouldDisplayModernPoint(input = {}) {
  if (input.userEnabled === true) {
    return {
      display: true,
      reason: "user_enabled"
    };
  }

  const target = normalizeToken(input.contactTarget || input.natalTarget || input.target);
  const orb = typeof input.orbDegrees === "number" ? Math.abs(input.orbDegrees) : Infinity;
  const isPersonalCallout = PERSONAL_CALLOUT_TARGETS.includes(target) && orb <= 3;

  return {
    display: isPersonalCallout && input.allowCallout === true,
    reason: isPersonalCallout ? "tight_personal_callout" : "hidden_by_default"
  };
}

module.exports = {
  PERSONAL_CALLOUT_TARGETS,
  shouldDisplayModernPoint
};
