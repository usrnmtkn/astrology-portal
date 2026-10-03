import { createHash } from "node:crypto";
import { validateHoroscopeProfile, horoscopeEditorialPrompt } from "./horoscopeWritingProfiles.mjs";
import { validateLunationProfile, lunationEditorialPrompt } from './lunationWritingProfile.mjs';
import { lunationDigest } from './lunationWritingFacts.mjs';

/** Validate an exact saved Studio export; this grants no evidence or prose approval. */
export function studioWritingProfileReceipt(value, {allowStarter = false} = {}) {
  const lunar = value?.profile?.schema === 'calendar-lunation-writing-profile/v1';
  const validate = lunar ? validateLunationProfile : validateHoroscopeProfile;
  if (allowStarter && value?.id == null) {
    const profile=validateHoroscopeProfile(value.profile);
    const sha256=createHash('sha256').update(JSON.stringify(profile)).digest('hex');
    if(value.sha256 && value.sha256!==sha256)throw new Error('The starter writing instructions changed after preparation.');
    return {id:null,period:profile.period,updatedAt:null,revision:0,sha256,source:'edition-starter-snapshot'};
  }
  if (!value || typeof value !== "object" || typeof value.id !== "string" || !value.id
    || typeof value.updatedAt !== "string" || !Number.isFinite(Date.parse(value.updatedAt))
    || !Number.isInteger(value.revision) || value.revision < 1) throw new Error("Use a saved AI Writing profile exported from Content Studio.");
  const profile = validate(value.profile);
  const sha256 = lunar ? lunationDigest(profile) : createHash("sha256").update(JSON.stringify(profile)).digest("hex");
  if (sha256 !== value.sha256) throw new Error("The writing profile changed after export. Save and export it again in Content Studio.");
  return { id: value.id, period: profile.period, updatedAt: value.updatedAt, revision: value.revision, sha256 };
}

export function resolveStudioWritingProfile(value, {allowStarter = false, runVariables} = {}) {
  const receipt = studioWritingProfileReceipt(value, {allowStarter});
  const prompt = value.profile.schema === 'calendar-lunation-writing-profile/v1'
    ? lunationEditorialPrompt(value.profile) : horoscopeEditorialPrompt(value.profile, runVariables);
  return {prompt, receipt};
}
