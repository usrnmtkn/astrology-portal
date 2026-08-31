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

export function natalPlacementSignLabel(planet: NatalPlacementPlanet, sign: NatalPlacementSign) {
  return `${titleCase(planet)} in ${titleCase(sign)}`;
}

export function natalPlacementSourceGroups(
  planet: NatalPlacementPlanet,
  sign: NatalPlacementSign,
  house?: NatalPlacementHouse | ""
): NatalPlacementSourceGroup[] {
  const planetLabel = titleCase(planet);
  const signLabel = titleCase(sign);
  const signGroup: NatalPlacementSourceGroup = {
    key: "sign",
    label: `Sign baseline: ${planetLabel} in ${signLabel}`,
    description: "Layer 1. Complete birth-time-independent interpretation of how this planet or point operates through the sign. It must stand on its own before any house is known.",
    sources: [
      { key: `fallback-hook/planet-intro/${planet}`, label: `${planetLabel} introduction`, scope: `Used by every natal ${planetLabel} placement.` },
      { key: `fallback-vocab/planet-verb/${planet}`, label: `${planetLabel} action phrase`, scope: `Used by every natal ${planetLabel} sign placement.` },
      { key: `fallback-vocab/sign-adverb/${sign}`, label: `${signLabel} style phrase`, scope: `Used by every natal placement in ${signLabel}.` },
      { key: `fallback-vocab/sign-need/${sign}`, label: `${signLabel} need`, scope: `Used by every natal placement in ${signLabel}.` },
      { key: `fallback-hook/placement-sentence/${planet}/${sign}`, label: `${planetLabel} in ${signLabel} passage`, scope: `Used for ${planetLabel} in ${signLabel}, across every house.` },
      { key: `fallback-vocab/planet-excess/${planet}`, label: `${planetLabel} challenge`, scope: `Used by every natal ${planetLabel} placement.` },
      { key: `fallback-hook/planet-best/${planet}`, label: `${planetLabel} strength`, scope: `Used by every natal ${planetLabel} placement.` }
    ]
  };
  const signStructure: NatalPlacementSource = {
    key: `fallback-template/natal.planet-in-sign/${planet}`,
    label: `${planetLabel} sign template`,
    scope: `Controls the sentence order for every natal ${planetLabel} sign placement.`
  };
  const structureGroup = (includeHouse: boolean): NatalPlacementSourceGroup => ({
    key: "structure",
    label: "Sentence structure (advanced)",
    description: "Preview the assembled reader copy before editing its structure. Colored sections link to the exact facts, phrases, and hooks used for this placement.",
    sources: [
      signStructure,
      ...(includeHouse ? [{ key: "fallback-template/natal.house-context", label: "Natal house template", scope: "Controls the sentence order for all natal placement house paragraphs." }] : [])
    ]
  });

  if (!house) return [signGroup, structureGroup(false)];

  const houseLabel = ordinalHouse(house);
  return [
    {
      key: "exact",
      label: `Exact synthesis: ${planetLabel} in ${signLabel} in the ${houseLabel} house`,
      description: "Layer 3. Optional exact override. An approved full write-up must add what becomes distinctive when this sign expression operates through this house, rather than mechanically restating the two baselines. If no approved exact synthesis exists, the app uses the approved sign and planet-house baselines below.",
      sources: [
        {
          key: `fallback-hook/natal-you-placement-complete-final/${planet}/${sign}/${house}`,
          label: `Complete ${planetLabel} in ${signLabel} in the ${houseLabel} house write-up`,
          scope: `Optional full-copy override used only for ${planetLabel} in ${signLabel} in the ${houseLabel} house.`
        }
      ]
    },
    signGroup,
    {
      key: "house",
      label: `Planet-house baseline: ${planetLabel} in the ${houseLabel} house`,
      description: "Layer 2. Complete interpretation of how this specific planet or point operates in the selected natal house, across every zodiac sign. It must describe the planet functioning in that life area, not append a generic house definition.",
      sources: [
        { key: `fallback-hook/house-meaning/${house}`, label: `${houseLabel} house meaning`, scope: `Used by every natal placement in the ${houseLabel} house.` },
        { key: `fallback-hook/placement-house-sentence/${planet}/${house}`, label: `${planetLabel} in the ${houseLabel} house passage`, scope: `Used for ${planetLabel} in the ${houseLabel} house, across every zodiac sign.` }
      ]
    },
    structureGroup(true)
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
