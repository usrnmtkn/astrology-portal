/** Empty-house authoring follows the owner-approved traditional ruler chain. */
export const emptyHouseRulers: Record<string, string> = {
  aries: "mars",
  taurus: "venus",
  gemini: "mercury",
  cancer: "moon",
  leo: "sun",
  virgo: "mercury",
  libra: "venus",
  scorpio: "mars",
  sagittarius: "jupiter",
  capricorn: "saturn",
  aquarius: "saturn",
  pisces: "jupiter"
};

export function emptyHouseSourceKeys(house: number, sign: string, rulerHouse: number) {
  const ruler = emptyHouseRulers[sign];
  if (!ruler || house === rulerHouse || house < 1 || house > 12 || rulerHouse < 1 || rulerHouse > 12) return [];
  return [
    `fallback-hook/empty-house/base/${house}`,
    `fallback-hook/empty-house/sign/${house}/${sign}`,
    house === 1 ? `fallback-hook/empty-house/rising-ruler/${sign}/${ruler}/${rulerHouse}` : `fallback-hook/empty-house/ruler-planet/${house}/${ruler}/${rulerHouse}`,
    ...(house === 1 ? [] : [`fallback-hook/empty-house/ruler-house/${house}/${rulerHouse}`]),
    `fallback-hook/empty-house/bridge-template/${house === 1 ? "house-1" : "standard"}`,
    `fallback-vocab/empty-house-ruler-jurisdiction/${rulerHouse}`,
    ...(house === 1 ? [] : [`fallback-vocab/empty-house-bridge-topic-short/${house}`]),
    "fallback-template/natal.empty-house-v14"
  ];
}
