export type EmptyHouseRulerSystem = "traditional" | "modern";

export function isTraditionalEmptyHouseGapKey(key: string): boolean {
  const match = /^fallback-hook\/empty-house\/rising-ruler\/(scorpio|aquarius|pisces)\/(mars|saturn|jupiter)\/(\d+)$/u.exec(key);
  if (!match || !/^(?:[2-9]|1[0-2])$/u.test(match[3])) return false;
  return ({ scorpio: "mars", aquarius: "saturn", pisces: "jupiter" } as Record<string, string>)[match[1]] === match[2];
}

export const emptyHouseRulersBySystem: Record<EmptyHouseRulerSystem, Readonly<Record<string, string>>> = {
  traditional: Object.freeze({
    aries: "mars", taurus: "venus", gemini: "mercury", cancer: "moon", leo: "sun", virgo: "mercury",
    libra: "venus", scorpio: "mars", sagittarius: "jupiter", capricorn: "saturn", aquarius: "saturn", pisces: "jupiter"
  }),
  modern: Object.freeze({
    aries: "mars", taurus: "venus", gemini: "mercury", cancer: "moon", leo: "sun", virgo: "mercury",
    libra: "venus", scorpio: "pluto", sagittarius: "jupiter", capricorn: "saturn", aquarius: "uranus", pisces: "neptune"
  })
};

export const emptyHouseRulerSystemLabel: Record<EmptyHouseRulerSystem, string> = {
  traditional: "Hellenistic",
  modern: "Modern"
};

export function emptyHouseRulerSystems(sign: string): EmptyHouseRulerSystem[] {
  const key = sign.toLowerCase();
  const ruler = emptyHouseRulersBySystem.traditional[key];
  if (!ruler) return [];
  return ruler === emptyHouseRulersBySystem.modern[key] ? ["traditional"] : ["traditional", "modern"];
}

export function emptyHouseRulerName(sign: string, system: EmptyHouseRulerSystem = "traditional") {
  const ruler = emptyHouseRulersBySystem[system][sign.toLowerCase()] ?? "";
  return ruler ? ruler[0].toUpperCase() + ruler.slice(1) : "";
}

export function emptyHouseCmsKeys(kind: "card" | "detail", voice: "you" | "they", house: number, sign: string, system?: EmptyHouseRulerSystem) {
  const signKey = sign.trim().toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "") || "unknown";
  const prefix = `cms/natal-empty-house/${kind}/${voice}`;
  return [
    ...(system ? [`${prefix}/${system}/${house}/${signKey}`, `${prefix}/${system}/${house}`, `${prefix}/${system}/template`] : []),
    // Unscoped overrides were authored while the reader used modern rulers.
    ...(!system || system === "modern" || emptyHouseRulerSystems(signKey).length === 1
      ? [`${prefix}/${house}/${signKey}`, `${prefix}/${house}`, `${prefix}/template`] : [])
  ];
}
