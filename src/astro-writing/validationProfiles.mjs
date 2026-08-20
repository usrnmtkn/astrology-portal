const SHARED_BASE_RULES = Object.freeze([
  "corpus-grammar",
  "ascii-only",
  "dash-ban",
  "internal-guard-leaks",
  "banned-language",
  "stock-tropes",
  "register-consistency",
  "required-fields",
  "placeholder-integrity",
  "owner-line-integrity",
  "owner-corrections"
]);

const PROFILES = Object.freeze({
  "shared-only": Object.freeze({
    id: "shared-only",
    baseRules: SHARED_BASE_RULES,
    surfaceRules: Object.freeze([])
  }),
  "sky-placement": Object.freeze({
    id: "sky-placement",
    baseRules: SHARED_BASE_RULES,
    surfaceRules: Object.freeze(["sign-house-separation", "placement-prediction-ceiling"])
  }),
  "friends-transit": Object.freeze({
    id: "friends-transit",
    baseRules: SHARED_BASE_RULES,
    surfaceRules: Object.freeze(["temporary-transit-register", "friends-variant-direction", "disconnected-stock-coaching"])
  }),
  daily: Object.freeze({
    id: "daily",
    baseRules: SHARED_BASE_RULES,
    surfaceRules: Object.freeze(["daily-engine-hidden", "daily-outcome-ceiling"])
  }),
  synastry: Object.freeze({
    id: "synastry",
    baseRules: SHARED_BASE_RULES,
    surfaceRules: Object.freeze(["synastry-outcome-ceiling", "synastry-fate-ban"])
  }),
  article: Object.freeze({
    id: "article",
    baseRules: SHARED_BASE_RULES,
    surfaceRules: Object.freeze(["article-meta-scaffolding-ban"])
  })
});

export function assertValidationProfile(profileId) {
  if (typeof profileId !== "string" || !PROFILES[profileId]) {
    throw new Error(`WRITING_VALIDATION_PROFILE_UNKNOWN: ${String(profileId)}. Validation may not degrade to shared-only.`);
  }
  const profile = PROFILES[profileId];
  if (!profile.baseRules.length || !Array.isArray(profile.surfaceRules)) {
    throw new Error(`WRITING_VALIDATION_PROFILE_INVALID: ${profileId}`);
  }
  return profile;
}

export const VALIDATION_PROFILES = PROFILES;
