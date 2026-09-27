/** Editor guidance, never reader copy or evidence of approval. */
export const LUNATION_PROFILE_KEY = 'studio-writing-profile/calendar/lunations';
export const LUNATION_WORKSPACE_PREFIX = 'studio-writing-profile/calendar/lunation/';
export const LUNATION_PROFILE_FIELDS = ['voiceGuidance', 'phaseContext', 'scopeGuidance', 'factsAndLinks'];
export const LUNATION_ARGUMENT_FIELDS = ['thesis','phase_context','sign_meaning','recognition','intention_or_reflection','journal_focus','scope_guard'];
export const LUNATION_SIGNS = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
export const LUNATION_PHASES = ['new-moon','full-moon'];
export function defaultLunationProfile() {
  return {schema:'calendar-lunation-writing-profile/v1',
    voiceGuidance: 'Use complete, eligible owner passages for vocabulary, sentence movement and tone. Explain one connected thought in plain language. Name the subject of an intention or reflection instead of an unexplained “it,” “what you started,” or “what became clear.” Length and paragraph order follow the thought. Structure and vocabulary findings are advisory for owner review, not automatic prose verdicts.',
    phaseContext: 'Explain what this New Moon or Full Moon means before asking the reader to reflect. For a New Moon, an intention is a direction the reader chooses to develop; do not substitute terms, deals or contracts for intention-setting. For a Full Moon, explain what the reader could notice or reconsider. Identify any relevant earlier New Moon from calculated facts, without assuming the reader set an intention or remembers that date. Do not promise that an intention produces a result by the Full Moon or six months later.',
    scopeGuidance: 'The sign describes this lunar event, not the reader’s identity or biography. A New Moon beginning does not require another person. Relationship examples are possibilities, not requirements. The reading must make sense without a partner, prior ritual or natal chart. The journal question must follow from the reading and invite an intention or reflection with enough context to answer it. Do not add a compulsory Do/Don’t or practical-guidance list. Do not attribute sleepiness, brain fog, anger or medical effects to a transit as an established fact.',
    factsAndLinks: 'Use the calculated event, sign, date, exact time and selected time zone. On a transition day distinguish the starting placement from the change at its exact time; do not label the whole day as the new placement. Historical owner articles supply voice, not current ephemeris facts. Dates belong in calculated fields or supported template variables, never invented prose. The app supplies the event link and journal/check-in action. Subscription excerpts should link to the exact event. Reader body and journalPrompt contain finished prose only; instructions, source notes and approval records remain editor-only.'};
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
export function lunationContentKey(phase,sign) {
  if (!LUNATION_PHASES.includes(phase) || !LUNATION_SIGNS.includes(sign)) throw new Error('Choose a New or Full Moon and a zodiac sign.');
  return `authored/sky-lunation-macro/${phase}/${sign}`;
}
export function emptyLunationWorkspace(phase,sign) {
  return {contentKey:lunationContentKey(phase,sign),phase,sign,referenceDate:'',timeZone:'America/New_York',
    argumentInput:{...Object.fromEntries(LUNATION_ARGUMENT_FIELDS.map(k=>[k,''])),scope_breadth:{broad_mechanism:'',chosen_expression:'',other_valid_expressions:['','','']}},
    body:'',journalPrompt:''};
}
