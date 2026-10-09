/** Browser-safe lunar editor identity; editorial rules remain server-side. */
export const LUNATION_PROFILE_KEY = 'studio-writing-profile/calendar/lunations';
export const LUNATION_WORKSPACE_PREFIX = 'studio-writing-profile/calendar/lunation/';
export const LUNATION_PROFILE_FIELDS = ['voiceGuidance', 'phaseContext', 'scopeGuidance', 'factsAndLinks'];
export const LUNATION_ARGUMENT_FIELDS = ['thesis','phase_context','sign_meaning','recognition','intention_or_reflection','journal_focus','scope_guard'];
export const LUNATION_SIGNS = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
export const LUNATION_PHASES = ['new-moon','full-moon'];
export function lunationContentKey(phase,sign) {
  if (!LUNATION_PHASES.includes(phase) || !LUNATION_SIGNS.includes(sign)) throw new Error('Choose a New or Full Moon and a zodiac sign.');
  return `authored/sky-lunation-macro/${phase}/${sign}`;
}
