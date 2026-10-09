import { LUNATION_ARGUMENT_GUIDANCE, LUNATION_REQUIRED_VOCABULARY } from './lunationEditorialConstraints.mjs';
/** Editor guidance, never reader copy or evidence of approval. */
import {LUNATION_PROFILE_KEY,LUNATION_WORKSPACE_PREFIX,LUNATION_PROFILE_FIELDS,LUNATION_ARGUMENT_FIELDS,LUNATION_SIGNS,LUNATION_PHASES,lunationContentKey} from './lunationWritingIdentity.mjs';
export {LUNATION_PROFILE_KEY,LUNATION_WORKSPACE_PREFIX,LUNATION_PROFILE_FIELDS,LUNATION_ARGUMENT_FIELDS,LUNATION_SIGNS,LUNATION_PHASES,lunationContentKey};
export function defaultLunationProfile() {
  return {schema:'calendar-lunation-writing-profile/v1',
    voiceGuidance: `Use complete, eligible owner passages for vocabulary, sentence movement and tone. ${LUNATION_ARGUMENT_GUIDANCE} Name the subject of an intention or reflection clearly. Do not impose a scene quota, standalone pull-quote, sequence of commands or closing slogan. ${LUNATION_REQUIRED_VOCABULARY} Other voice and structure judgments remain with the owner.`,
    phaseContext: 'After naming the date and lunar event, establish the phase and sign meaning before asking the reader to reflect. For a New Moon, explain the Sun–Moon conjunction in the sign and the traditional ruler, then develop the possible beginning from that astrology. An intention is a direction the reader chooses to develop; do not substitute terms, deals or contracts for intention-setting. For a Full Moon, explain the Sun–Moon opposition, both signs and their traditional rulers, then develop what the reader could notice or reconsider. Neither sign is automatically the problem or solution. Do not make every Full Moon about release. Apply New Moon logic to a verified solar eclipse and Full Moon logic to a verified lunar eclipse. Reusable readings use the phase and sign without date-specific ruler placements or contacts. Identify any relevant earlier New Moon only from supplied calculated facts, without assuming the reader set an intention or remembers that date. Do not promise that an intention produces a result by the Full Moon or six months later.',
    scopeGuidance: 'The sign describes this lunar event, not the reader’s identity or biography. A New Moon beginning does not require another person. Relationship examples are possibilities, not requirements. The reading must make sense without a partner, prior ritual or natal chart. The journal question must follow from the reading and invite an intention or reflection with enough context to answer it. Do not add a compulsory Do/Don’t or practical-guidance list. Do not attribute sleepiness, brain fog, anger or medical effects to a transit as an established fact.',
    factsAndLinks: 'Use the calculated event, sign, date, exact time and selected time zone. Dated lunar articles open their body with the full calculated local date, including the year, followed by the event and sign. Format the date in bold with the spelled-out month and ordinal day. The date belongs in the body even when it also appears in the header. Never use a historical example date or invent an end date or duration for a lunation. Reusable sign readings remain date-free in storage; the app supplies each occurrence date. On a transition day distinguish the starting placement from the change at its exact time; do not label the whole day as the new placement. Historical owner articles supply voice, not current ephemeris facts. The app supplies the event link and journal/check-in action. Subscription excerpts should link to the exact event. Reader body and journalPrompt contain finished prose only; instructions, source notes and approval records remain editor-only.'};
}
export function validateLunationProfile(value) {
  if (!value || value.schema !== 'calendar-lunation-writing-profile/v1' || Object.keys(value).some(k=>!['schema',...LUNATION_PROFILE_FIELDS].includes(k))) throw new Error('Send a complete lunar writing profile.');
  for (const field of LUNATION_PROFILE_FIELDS) if (typeof value[field] !== 'string' || !value[field].trim() || value[field].length > 12000) throw new Error(`${field} must contain 1–12000 characters.`);
  return {schema:value.schema,...Object.fromEntries(LUNATION_PROFILE_FIELDS.map(k=>[k,value[k]]))};
}
export function lunationEditorialPrompt(value) {
  const profile=validateLunationProfile(value);
  return LUNATION_PROFILE_FIELDS.map(field=>`${field}\n${profile[field]}`).join('\n\n');
}
export function emptyLunationWorkspace(phase,sign) {
  return {contentKey:lunationContentKey(phase,sign),phase,sign,referenceDate:'',timeZone:'America/New_York',
    argumentInput:{...Object.fromEntries(LUNATION_ARGUMENT_FIELDS.map(k=>[k,''])),scope_breadth:{broad_mechanism:'',chosen_expression:'',other_valid_expressions:['','','']}},
    body:'',journalPrompt:''};
}
