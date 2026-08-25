const PROFILES = Object.freeze({
  "shared-only": Object.freeze({ id: "shared-only", effectiveSurface: "generic" }),
  "sky-placement": Object.freeze({ id: "sky-placement", effectiveSurface: "card" }),
  "friends-transit": Object.freeze({ id: "friends-transit", effectiveSurface: "friends-transit" }),
  daily: Object.freeze({ id: "daily", effectiveSurface: "daily" }),
  synastry: Object.freeze({ id: "synastry", effectiveSurface: "synastry" }),
  article: Object.freeze({ id: "article", effectiveSurface: "article" })
});

export function assertValidationProfile(profileId) {
  if (typeof profileId !== "string" || !PROFILES[profileId]) {
    throw new Error(`WRITING_VALIDATION_PROFILE_UNKNOWN: ${String(profileId)}. Validation may not degrade to shared-only.`);
  }
  const profile = PROFILES[profileId];
  if (!profile.id || !profile.effectiveSurface) throw new Error(`WRITING_VALIDATION_PROFILE_INVALID: ${profileId}`);
  return profile;
}

export const VALIDATION_PROFILES = PROFILES;
