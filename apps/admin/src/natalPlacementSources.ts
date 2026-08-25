export const natalPlacementPlanets = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
  "chiron",
  "lilith",
  "north-node",
  "south-node"
] as const;

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

export const natalPlacementHouses = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] as const;

export type NatalPlacementPlanet = typeof natalPlacementPlanets[number];
export type NatalPlacementSign = typeof natalPlacementSigns[number];
export type NatalPlacementHouse = typeof natalPlacementHouses[number];

export type NatalPlacementSource = {
  key: string;
  label: string;
  scope: string;
};

export type NatalPlacementSourceGroup = {
  key: "exact" | "sign" | "house" | "structure";
  label: string;
  description: string;
  sources: NatalPlacementSource[];
};

function titleCase(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function ordinalHouse(house: NatalPlacementHouse) {
  if (house === "1") return "1st";
  if (house === "2") return "2nd";
  if (house === "3") return "3rd";
  return `${house}th`;
}

export function natalPlacementLabel(planet: NatalPlacementPlanet, sign: NatalPlacementSign, house: NatalPlacementHouse) {
  return `${titleCase(planet)} in ${titleCase(sign)} in the ${ordinalHouse(house)} house`;
}

export function natalPlacementSourceGroups(
  planet: NatalPlacementPlanet,
  sign: NatalPlacementSign,
  house: NatalPlacementHouse
): NatalPlacementSourceGroup[] {
  const planetLabel = titleCase(planet);
  const signLabel = titleCase(sign);
  const houseLabel = ordinalHouse(house);

  return [
    {
      key: "exact",
      label: `${planetLabel} in ${signLabel} in the ${houseLabel} house`,
      description: "An approved full write-up for this exact planet, sign, and house replaces the composed sources below on the You page.",
      sources: [
        {
          key: `fallback-hook/natal-you-placement-complete-final/${planet}/${sign}/${house}`,
          label: `Complete ${planetLabel} in ${signLabel} in the ${houseLabel} house write-up`,
          scope: `Used only for ${planetLabel} in ${signLabel} in the ${houseLabel} house.`
        }
      ]
    },
    {
      key: "sign",
      label: `${planetLabel} in ${signLabel}`,
      description: "These rows build the first paragraph about the planet or point in its zodiac sign.",
      sources: [
        { key: `fallback-hook/planet-intro/${planet}`, label: `${planetLabel} introduction`, scope: `Used by every natal ${planetLabel} placement.` },
        { key: `fallback-vocab/planet-verb/${planet}`, label: `${planetLabel} action phrase`, scope: `Used by every natal ${planetLabel} sign placement.` },
        { key: `fallback-vocab/sign-adverb/${sign}`, label: `${signLabel} style phrase`, scope: `Used by every natal placement in ${signLabel}.` },
        { key: `fallback-vocab/sign-need/${sign}`, label: `${signLabel} need`, scope: `Used by every natal placement in ${signLabel}.` },
        { key: `fallback-hook/placement-sentence/${planet}/${sign}`, label: `${planetLabel} in ${signLabel} passage`, scope: `Used for ${planetLabel} in ${signLabel}, across every house.` },
        { key: `fallback-vocab/planet-excess/${planet}`, label: `${planetLabel} challenge`, scope: `Used by every natal ${planetLabel} placement.` },
        { key: `fallback-hook/planet-best/${planet}`, label: `${planetLabel} strength`, scope: `Used by every natal ${planetLabel} placement.` }
      ]
    },
    {
      key: "house",
      label: `${planetLabel} in the ${houseLabel} house`,
      description: "These rows build the second paragraph about how this placement works in the selected house.",
      sources: [
        { key: `fallback-hook/house-meaning/${house}`, label: `${houseLabel} house meaning`, scope: `Used by every natal placement in the ${houseLabel} house.` },
        { key: `fallback-hook/placement-house-sentence/${planet}/${house}`, label: `${planetLabel} in the ${houseLabel} house passage`, scope: `Used for ${planetLabel} in the ${houseLabel} house, across every zodiac sign.` }
      ]
    },
    {
      key: "structure",
      label: "Sentence structure (advanced)",
      description: "These templates arrange the source writing above. Edit them only when you want to change many natal pages at once.",
      sources: [
        { key: `fallback-template/natal.planet-in-sign/${planet}`, label: `${planetLabel} sign template`, scope: `Controls the sentence order for every natal ${planetLabel} sign placement.` },
        { key: "fallback-template/natal.house-context", label: "Natal house template", scope: "Controls the sentence order for all natal placement house paragraphs." }
      ]
    }
  ];
}

export function natalPlacementSelectionFromText(text: string): {
  planet?: NatalPlacementPlanet;
  sign?: NatalPlacementSign;
  house?: NatalPlacementHouse;
} {
  const normalized = text.toLowerCase().replace(/[_/.]+/g, " ").replace(/-/g, "-");
  const planet = natalPlacementPlanets.find((value) => new RegExp(`\\b${value.replace("-", "[- ]")}\\b`).test(normalized));
  const sign = natalPlacementSigns.find((value) => new RegExp(`\\b${value}\\b`).test(normalized));
  const houseMatch = normalized.match(/(?:house\s*[-:]?\s*|\b)(1[0-2]|[1-9])(?:st|nd|rd|th)?(?:\s+house)?\b/);
  const house = houseMatch && natalPlacementHouses.includes(houseMatch[1] as NatalPlacementHouse)
    ? houseMatch[1] as NatalPlacementHouse
    : undefined;
  return {
    ...(planet ? { planet } : {}),
    ...(sign ? { sign } : {}),
    ...(house ? { house } : {})
  };
}
