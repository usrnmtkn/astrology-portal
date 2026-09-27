/** Traditional rulers shared by the existing lunation facts and Sun summaries. */
export const traditionalSignRulers: Record<string, string> = {
  aries: "mars", taurus: "venus", gemini: "mercury", cancer: "moon", leo: "sun",
  virgo: "mercury", libra: "venus", scorpio: "mars", sagittarius: "jupiter",
  capricorn: "saturn", aquarius: "saturn", pisces: "jupiter"
};
export function sunSeasonRuler(sign: string) { return traditionalSignRulers[sign.toLowerCase()]; }
export function sunSeasonHasRetrograde(sign: string) {
  const ruler = sunSeasonRuler(sign);
  return Boolean(ruler && ruler !== "sun" && ruler !== "moon");
}
export function sunSeasonKey(sign: string, retrograde = false) {
  return `cms/sky-daily-summary/sun/${sign.toLowerCase()}${retrograde ? "/ruler-retrograde" : ""}`;
}
export function sunSeasonRetrograde(sign: string, planets: readonly string[] = []) {
  return sunSeasonHasRetrograde(sign) && planets.some(planet => planet.toLowerCase() === sunSeasonRuler(sign));
}
export function sunSeasonSourceKeys(sign: string, planets: readonly string[] = []) {
  return [sunSeasonKey(sign), ...(sunSeasonRetrograde(sign, planets) ? [sunSeasonKey(sign, true)] : [])];
}
