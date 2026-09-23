import { createHash } from "node:crypto";
import { validateHoroscopeProfile, horoscopeEditorialPrompt } from "./horoscopeWritingProfiles.mjs";

/** Validate an exact saved Studio export; this grants no evidence or prose approval. */
export function resolveStudioWritingProfile(value) {
  if (!value || typeof value !== "object" || typeof value.id !== "string" || !value.id
    || typeof value.updatedAt !== "string" || !Number.isFinite(Date.parse(value.updatedAt))
    || !Number.isInteger(value.revision) || value.revision < 1) throw new Error("Use a saved AI Writing profile exported from Content Studio.");
  const profile = validateHoroscopeProfile(value.profile);
  const sha256 = createHash("sha256").update(JSON.stringify(profile)).digest("hex");
  if (sha256 !== value.sha256) throw new Error("The writing profile changed after export. Save and export it again in Content Studio.");
  return {
    prompt: horoscopeEditorialPrompt(profile),
    receipt: { id: value.id, period: profile.period, updatedAt: value.updatedAt, revision: value.revision, sha256 }
  };
}
