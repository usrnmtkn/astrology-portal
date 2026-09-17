/** Sign-level traditional dignity only. This table is the existing chart table,
 * shared with article selection. It does not calculate peregrine, triplicity,
 * bounds, face, or a planet's position. Planet and sign come from the caller.
 */
export const DIGNITY_FRAMEWORK = "traditional-seven-planet-sign";
export const DIGNITY_VARIANTS = Object.freeze([
  "domicile", "exaltation", "detriment", "fall",
  "domicile_exaltation", "detriment_fall", "none"
]);
export const DIGNITY_SIGNS = Object.freeze([
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]);
export const TRADITIONAL_DIGNITY_PLANETS = Object.freeze([
  "Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"
]);
const DEBILITY_DIGNITIES = Object.freeze(["detriment", "fall"]);
const planetDignities = {
  Sun: {
    Leo: "domicile",
    Aries: "exaltation",
    Aquarius: "detriment",
    Libra: "fall"
  },
  Moon: {
    Cancer: "domicile",
    Taurus: "exaltation",
    Capricorn: "detriment",
    Scorpio: "fall"
  },
  Mercury: {
    Gemini: "domicile",
    Virgo: ["domicile", "exaltation"],
    Sagittarius: "detriment",
    Pisces: ["detriment", "fall"]
  },
  Venus: {
    Taurus: "domicile",
    Libra: "domicile",
    Pisces: "exaltation",
    Aries: "detriment",
    Scorpio: "detriment",
    Virgo: "fall"
  },
  Mars: {
    Aries: "domicile",
    Scorpio: "domicile",
    Capricorn: "exaltation",
    Taurus: "detriment",
    Libra: "detriment",
    Cancer: "fall"
  },
  Jupiter: {
    Sagittarius: "domicile",
    Pisces: "domicile",
    Cancer: "exaltation",
    Gemini: "detriment",
    Virgo: "detriment",
    Capricorn: "fall"
  },
  Saturn: {
    Capricorn: "domicile",
    Aquarius: "domicile",
    Libra: "exaltation",
    Cancer: "detriment",
    Leo: "detriment",
    Aries: "fall"
  }
};
for (const signs of Object.values(planetDignities)) {
  for (const value of Object.values(signs)) if (Array.isArray(value)) Object.freeze(value);
  Object.freeze(signs);
}
Object.freeze(planetDignities);
const outsideFramework = new Set([
  "Uranus", "Neptune", "Pluto", "Chiron", "Lilith", "North Node", "South Node",
  "Ascendant", "Descendant", "Midheaven", "Ic", "Part Of Fortune"
]);
const title = value => typeof value === "string" ? value.trim().toLowerCase().split(/[ -]+/u).filter(Boolean).map(word => word[0].toUpperCase() + word.slice(1)).join(" ") : "";

/** Full result distinguishes a valid empty lookup, a known unsupported body,
 * and an invalid/missing identity. Never reduce combined conditions to one.
 */
export function planetSignDignity(planet, sign) {
  const p = title(planet), s = title(sign);
  const base = { framework: DIGNITY_FRAMEWORK, planet: p, sign: s, dignities: [], variant: null };
  if (!DIGNITY_SIGNS.includes(s) || (!Object.hasOwn(planetDignities, p) && !outsideFramework.has(p)))
    return { ...base, status: "invalid", reason: "A valid planet and zodiac sign are required for dignity selection." };
  if (outsideFramework.has(p)) return { ...base, status: "not_applicable", reason: "This body is outside the traditional seven-planet dignity framework." };
  const value = planetDignities[p][s];
  const dignities = value ? (Array.isArray(value) ? [...value] : [value]) : [];
  const variant = dignities.length ? dignities.join("_") : "none";
  return { ...base, status: "known", dignities, variant, reason: "" };
}

export function planetSignDebilities(planet, sign) {
  const result = planetSignDignity(planet, sign);
  return result.dignities.filter(value => DEBILITY_DIGNITIES.includes(value));
}

/** Sign-level Hellenistic debility only: detriment (exile) and fall.
 * A planet with both is counted once. Outer bodies stay outside the seven.
 */
export function traditionalSkyDebilities(positions) {
  const known = new Map();
  for (const position of Array.isArray(positions) ? positions : []) {
    const result = planetSignDignity(position?.planet, position?.sign);
    if (result.status !== "known" || known.has(result.planet)) continue;
    known.set(result.planet, {
      planet: result.planet,
      sign: result.sign,
      dignities: planetSignDebilities(result.planet, result.sign)
    });
  }
  const debilitated = TRADITIONAL_DIGNITY_PLANETS.flatMap(planet => {
    const row = known.get(planet);
    return row?.dignities.length ? [row] : [];
  });
  return {
    framework: DIGNITY_FRAMEWORK,
    traditionalCount: TRADITIONAL_DIGNITY_PLANETS.length,
    knownCount: known.size,
    count: debilitated.length,
    planets: debilitated
  };
}
