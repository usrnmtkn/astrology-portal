import { natalRetrogradeModifierKey } from './natalRetrogradeModifier.js';

export const natalPlacementAngles = ["ascendant", "descendant", "midheaven", "imum-coeli"] as const;
export const natalPlacementSigns = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces"
] as const;

/** Shared by the reader and Studio; keep in sync with the natal resolvers. */
export function natalPlacementSourceKeys(planet: string, sign: string, house?: string, motion = 'direct') {
  if ((natalPlacementAngles as readonly string[]).includes(planet)) {
    return [`fallback-hook/angle-intro/${planet}`, `fallback-hook/angle-sign/${planet}/${sign}`, 'fallback-template/natal.angle-in-sign'];
  }
  const keys = new Set([
    `fallback-hook/natal-you-placement-sign-final/${planet}/${sign}`,
    `fallback-hook/placement-sign-lived/${planet}/${sign}`, `fallback-hook/sign-lived/${sign}`,
    `fallback-hook/natal/planet-intro/${planet}`, `fallback-hook/planet-best/${planet}`,
    `fallback-hook/placement-sentence/${planet}/${sign}`,
    ...['planet-topic', 'planet-excess', 'planet-productive', 'planet-core', 'planet-verb'].map(key => `fallback-vocab/${key}/${planet}`),
    `fallback-vocab/sign-style/${sign}`, `fallback-vocab/sign-need/${sign}`, `fallback-vocab/sign-adverb/${sign}`,
    `fallback-template/natal.planet-in-sign/${planet}`,
    ['north-node', 'south-node'].includes(planet) ? 'fallback-template/natal.node-in-sign' : 'fallback-template/natal.planet-in-sign'
  ]);
  for (let index = 0; index < 8; index++) keys.add(`fallback-vocab/placement-gerund/${planet}/${sign}/${index}`);
  if (['north-node', 'south-node'].includes(planet)) {
    keys.add(`fallback-hook/node-journey/${planet}`);
    keys.add(`fallback-vocab/node-direction/${natalPlacementSigns[((natalPlacementSigns as readonly string[]).indexOf(sign) + 6) % 12]}`);
  }
  const modifier = motion === 'retrograde' ? natalRetrogradeModifierKey(planet, house) : null;
  if (modifier) keys.add(modifier);
  if (house) {
    keys.add(`fallback-hook/natal-you-placement-complete-final/${planet}/${sign}/${house}${motion === 'retrograde' ? '/retrograde' : ''}`);
    for (const family of ['natal-you-placement-house-final', 'placement-house-lived', 'placement-house-sentence']) keys.add(`fallback-hook/${family}/${planet}/${house}`);
    keys.add(`fallback-hook/house-lived/${house}`);
    keys.add(`fallback-hook/house-meaning/${house}`);
    keys.add('fallback-template/natal.house-context');
  }
  return [...keys];
}
