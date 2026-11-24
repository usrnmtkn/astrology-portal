import {createHash} from 'node:crypto';
import {HOROSCOPE_SOURCE_LED_COMPOSITION} from './horoscopeVoiceStandard.mjs';

export const COMPACT_VOICE_INSTRUCTIONS='COMPACT VOICE INSTRUCTIONS V1';
export const COMPACT_VOICE_COMPOSITION_CHECK=HOROSCOPE_SOURCE_LED_COMPOSITION;
const enabledLine=/^COMPACT VOICE INSTRUCTIONS V1\r?$/mu;
const archiveHeading=/^RETAINED SAVED-GUIDE SOURCE EXAMPLES\r?$/mu;

/** Voice is an editorial instruction field for both compact app writers.
 * The former private-test marker is accepted, but never required. */
export function compactVoiceInInstructions(profile) {
  return ['daily','weekly'].includes(profile?.period);
}

/** Backward compatibility for previously prepared profiles and exports. */
export function enableCompactVoiceInstructions(prompt) {
  if(enabledLine.test(prompt))return prompt;
  const prefix=prompt.match(/^WEEKLY PROMPT V2\r?\n/u)?.[0]??'';
  return prefix+COMPACT_VOICE_INSTRUCTIONS+'\n'+prompt.slice(prefix.length);
}

export function compactVoiceParts(profile) {
  const text=profile.voiceGuidance,at=text.search(archiveHeading);
  return at<0?{editorial:text,archive:''}:{editorial:text.slice(0,at),archive:text.slice(at)};
}

export const compactVoiceMaterialReference=profile=>`The saved ${profile.period==='daily'?'Daily':'Weekly'} editorial Voice text is delivered verbatim in Writing instructions under SAVED VOICE. Any explicitly archived examples from that field remain complete source data in the material below.`;

export function compactVoiceArchiveMaterial(profile) {
  const {archive}=compactVoiceParts(profile);if(!archive)return '';
  return `ARCHIVED VOICE FIELD MATERIAL — SOURCE DATA ONLY\n${JSON.stringify({sha256:createHash('sha256').update(archive).digest('hex'),source:'saved Voice field, explicit retained-example boundary',use:'Preserved complete source data. Original approval and authorship restrictions remain; this is not another instruction brief.'})}\n${archive}`;
}

export const withoutLegacyVoiceMarker=prompt=>prompt.replace(/^COMPACT VOICE INSTRUCTIONS V1\r?(?:\n|$)/mu,'');

/** Only the named editorial Voice field becomes an instruction.
 * Source guidance, examples, corrections and calculated facts never enter here. */
export function withCompactVoiceInstructions(instructions,profile) {
  if(!compactVoiceInInstructions(profile))return instructions;
  const {editorial}=compactVoiceParts(profile);
  return `${instructions}${editorial?`\n\nSAVED VOICE\n${editorial}`:''}\n\n${COMPACT_VOICE_COMPOSITION_CHECK}\n\nApply this editorial Voice field with the current scoped owner corrections and the factual and output boundaries above. Historical passages and rejected writing remain source data, not instructions or approval.`;
}
