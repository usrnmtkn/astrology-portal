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
export const natalPlacementMotions = ["direct", "retrograde"] as const;
export const natalPlacementDirectOnlyPlanets = new Set<NatalPlacementPlanet>(["sun", "moon", "north-node", "south-node"]);

export type NatalPlacementPlanet = typeof natalPlacementPlanets[number];
export type NatalPlacementSign = typeof natalPlacementSigns[number];
export type NatalPlacementHouse = typeof natalPlacementHouses[number];
export type NatalPlacementMotion = typeof natalPlacementMotions[number];

export type NatalPlacementSource = {
  key: string;
  label: string;
  scope: string;
};

export type NatalPlacementSourceGroup = {
  key: "exact" | "sign" | "house" | "motion" | "structure";
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

export function natalPlacementSupportsRetrograde(planet: NatalPlacementPlanet | "") {
  return Boolean(planet && !natalPlacementDirectOnlyPlanets.has(planet));
}

export function natalPlacementLabel(planet: NatalPlacementPlanet, sign: NatalPlacementSign, house: NatalPlacementHouse, isRetrograde = false) {
  return `${titleCase(planet)}${isRetrograde ? " Rx" : ""} in ${titleCase(sign)} in the ${ordinalHouse(house)} house`;
}

export function natalPlacementSignLabel(planet: NatalPlacementPlanet, sign: NatalPlacementSign, isRetrograde = false) {
  return `${titleCase(planet)}${isRetrograde ? " Rx" : ""} in ${titleCase(sign)}`;
}

export function natalPlacementSourceGroups(
  planet: NatalPlacementPlanet,
  sign: NatalPlacementSign,
  house?: NatalPlacementHouse | "",
  isRetrograde = false
): NatalPlacementSourceGroup[] {
  const planetLabel = titleCase(planet);
  const signLabel = titleCase(sign);
  const signGroup: NatalPlacementSourceGroup = {
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
  };
  const signStructure: NatalPlacementSource = {
    key: `fallback-template/natal.planet-in-sign/${planet}`,
    label: `${planetLabel} sign template`,
    scope: `Controls the sentence order for every natal ${planetLabel} sign placement.`
  };
  const motionGroup: NatalPlacementSourceGroup = {
    key: "motion",
    label: `${planetLabel} retrograde layer`,
    description: `This shared sentence is added when ${planetLabel} is retrograde in the birth chart. Direct placements do not use it.`,
    sources: [{
      key: "fallback-template/natal.modifier.retrograde",
      label: "Natal retrograde modifier",
      scope: "Appended to eligible natal placement write-ups when the selected birth-chart body is retrograde."
    }]
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

  if (!house) return [signGroup, ...(isRetrograde ? [motionGroup] : []), structureGroup(false)];

  const houseLabel = ordinalHouse(house);
  return [
    ...(!isRetrograde ? [{
      key: "exact",
      label: `${planetLabel} in ${signLabel} in the ${houseLabel} house`,
      description: "Optional exact override. If an approved full write-up exists, it replaces the composed sources below on the You page. Otherwise the app assembles the reader preview from the atomic sources shown here.",
      sources: [
        {
          key: `fallback-hook/natal-you-placement-complete-final/${planet}/${sign}/${house}`,
          label: `Complete ${planetLabel} in ${signLabel} in the ${houseLabel} house write-up`,
          scope: `Optional full-copy override used only for ${planetLabel} in ${signLabel} in the ${houseLabel} house.`
        }
      ]
    } satisfies NatalPlacementSourceGroup] : []),
    signGroup,
    ...(isRetrograde ? [motionGroup] : []),
    {
      key: "house",
      label: `${planetLabel} in the ${houseLabel} house`,
      description: "These rows build the second paragraph about how this placement works in the selected house.",
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
  motion?: NatalPlacementMotion;
} {
  const normalized = text.toLowerCase().replace(/[_/.]+/g, " ").replace(/-/g, "-");
  const planet = natalPlacementPlanets.find((value) => new RegExp(`\\b${value.replace("-", "[- ]")}\\b`).test(normalized));
  const sign = natalPlacementSigns.find((value) => new RegExp(`\\b${value}\\b`).test(normalized));
  const houseMatch = normalized.match(/(?:house\s*[-:]?\s*|\b)(1[0-2]|[1-9])(?:st|nd|rd|th)?(?:\s+house)?\b/);
  const house = houseMatch && natalPlacementHouses.includes(houseMatch[1] as NatalPlacementHouse)
    ? houseMatch[1] as NatalPlacementHouse
    : undefined;
  const motion = /\b(?:retrograde|rx)\b/u.test(normalized) ? "retrograde" : undefined;
  return {
    ...(planet ? { planet } : {}),
    ...(sign ? { sign } : {}),
    ...(house ? { house } : {}),
    ...(motion ? { motion } : {})
  };
}
