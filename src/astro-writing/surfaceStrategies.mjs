import { assertValidationProfile } from "./validationProfiles.mjs";

const STRATEGIES = Object.freeze({
  "sky-placement": Object.freeze({
    id: "sky-placement",
    evidenceSurface: "sky",
    planner: "placement-meaning-plan",
    voiceEvidenceRoles: Object.freeze(["owner-approved-example"]),
    validationProfile: "sky-placement",
    readerJudge: Object.freeze({ authority: "advisory-only", mayBlock: false, mayRewrite: false })
  }),
  "friends-transit": Object.freeze({
    id: "friends-transit",
    evidenceSurface: "friends-transit",
    planner: "friends-transit-card",
    voiceEvidenceRoles: Object.freeze(["owner-approved-example", "available-line", "available-component"]),
    validationProfile: "friends-transit",
    readerJudge: Object.freeze({ authority: "advisory-only", mayBlock: false, mayRewrite: false })
  }),
  daily: Object.freeze({
    id: "daily",
    evidenceSurface: "sky",
    planner: "daily-glance",
    voiceEvidenceRoles: Object.freeze(["owner-approved-example"]),
    validationProfile: "daily",
    readerJudge: Object.freeze({ authority: "advisory-only", mayBlock: false, mayRewrite: false })
  }),
  synastry: Object.freeze({
    id: "synastry",
    evidenceSurface: "synastry",
    planner: "synastry",
    voiceEvidenceRoles: Object.freeze(["owner-approved-example"]),
    validationProfile: "synastry",
    readerJudge: Object.freeze({ authority: "advisory-only", mayBlock: false, mayRewrite: false })
  }),
  article: Object.freeze({
    id: "article",
    evidenceSurface: "article",
    planner: "long-form-article",
    voiceEvidenceRoles: Object.freeze(["owner-approved-example"]),
    validationProfile: "article",
    readerJudge: Object.freeze({ authority: "advisory-only", mayBlock: false, mayRewrite: false })
  }),
  generic: Object.freeze({
    id: "generic",
    evidenceSurface: null,
    planner: "surface-owned",
    voiceEvidenceRoles: Object.freeze(["owner-approved-example"]),
    validationProfile: "shared-only",
    readerJudge: Object.freeze({ authority: "advisory-only", mayBlock: false, mayRewrite: false })
  })
});

export function resolveSurfaceStrategy({ family = "sky-placement", surface = "card", explicitStrategy = null } = {}) {
  if (explicitStrategy != null) {
    const selected = STRATEGIES[explicitStrategy];
    if (!selected) throw new Error(`WRITING_SURFACE_STRATEGY_UNKNOWN: ${explicitStrategy}`);
    return selected;
  }
  if (family === "friends-transit") return STRATEGIES["friends-transit"];
  if (family === "sky-placement") return STRATEGIES["sky-placement"];
  if (family === "daily" || surface === "daily") return STRATEGIES.daily;
  if (family === "synastry" || surface === "synastry") return STRATEGIES.synastry;
  if (surface === "article" || family.includes("article")) return STRATEGIES.article;
  return STRATEGIES.generic;
}

export function assertSurfaceStrategy(strategy) {
  if (!strategy?.id || !Array.isArray(strategy.voiceEvidenceRoles) || !strategy.validationProfile) {
    throw new Error("WRITING_SURFACE_STRATEGY_INVALID");
  }
  if (strategy.readerJudge?.authority !== "advisory-only"
    || strategy.readerJudge?.mayBlock !== false
    || strategy.readerJudge?.mayRewrite !== false) {
    throw new Error(`READER_JUDGE_AUTHORITY_INVALID: ${strategy.id}`);
  }
  assertValidationProfile(strategy.validationProfile);
  return strategy;
}

export const SURFACE_STRATEGIES = STRATEGIES;
