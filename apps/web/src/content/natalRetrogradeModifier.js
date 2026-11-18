export const natalRetrogradeBodies = [
  'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
  'chiron', 'lilith', 'north-node', 'south-node'
];

export const NATAL_RETROGRADE_MODIFIER_PREFIX = 'fallback-hook/natal-retrograde-modifier/';

export function natalRetrogradeModifierKey(planet, house) {
  return natalRetrogradeBodies.includes(planet) && /^(?:[1-9]|1[0-2])$/u.test(String(house))
    ? `${NATAL_RETROGRADE_MODIFIER_PREFIX}${planet}/${house}`
    : null;
}

export function isNatalRetrogradeModifierKey(key) {
  if (!key.startsWith(NATAL_RETROGRADE_MODIFIER_PREFIX)) return false;
  const [planet, house, extra] = key.slice(NATAL_RETROGRADE_MODIFIER_PREFIX.length).split('/');
  return extra === undefined && natalRetrogradeModifierKey(planet, house) === key;
}
