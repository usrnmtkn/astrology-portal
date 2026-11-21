import { natalRetrogradeModifierKey } from '../../web/src/content/natalRetrogradeModifier.js';
import { natalPlacementSourceKeys as natalPlacementResolverDependencyKeys, natalPlacementAngles, natalPlacementSigns } from '../../web/src/content/natalPlacementSourceKeys.js';
export { natalPlacementResolverDependencyKeys, natalPlacementAngles, natalPlacementSigns };

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
  "south-node",
  "ascendant",
  "descendant",
  "midheaven",
  "imum-coeli"
] as const;



const natalPlacementPointLabels = {
  ascendant: "ASC",
  descendant: "DC",
  midheaven: "MC",
  "imum-coeli": "IC"
} as const;

const natalPlacementPointAliases: Array<{ pattern: RegExp; point: typeof natalPlacementAngles[number] }> = [
  { pattern: /\bimum[- ]coeli\b/, point: "imum-coeli" },
  { pattern: /\bascendant\b/, point: "ascendant" },
  { pattern: /\bdescendant\b/, point: "descendant" },
  { pattern: /\bmidheaven\b/, point: "midheaven" },
  { pattern: /\basc\b/, point: "ascendant" },
  { pattern: /\bdc\b/, point: "descendant" },
  { pattern: /\bmc\b/, point: "midheaven" },
  { pattern: /\bic\b/, point: "imum-coeli" }
];



export const natalPlacementHouses = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] as const;
export const natalPlacementMotions = ["direct", "retrograde"] as const;

export type NatalPlacementPlanet = typeof natalPlacementPlanets[number];
export type NatalPlacementAngle = typeof natalPlacementAngles[number];
export type NatalPlacementSign = typeof natalPlacementSigns[number];
export type NatalPlacementHouse = typeof natalPlacementHouses[number];
export type NatalPlacementMotion = typeof natalPlacementMotions[number];

export function isNatalPlacementAngle(value: string): value is NatalPlacementAngle {
  return (natalPlacementAngles as readonly string[]).includes(value);
}

export function natalPlacementPointLabel(planet: string) {
  return natalPlacementPointLabels[planet as NatalPlacementAngle] ?? titleCase(planet);
}

export function natalPlacementMotionIsFixed(planet: NatalPlacementPlanet | "") {
  return planet === "sun" || planet === "moon" || isNatalPlacementAngle(planet);
}

export type NatalPlacementSource = {
  key: string;
  label: string;
  scope: string;
  existingOnly?: boolean;
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

export function natalPlacementLabel(planet: NatalPlacementPlanet, sign: NatalPlacementSign, house: NatalPlacementHouse, motion: NatalPlacementMotion = "direct") {
  return `${natalPlacementPointLabel(planet)}${motion === "retrograde" ? " retrograde" : ""} in ${titleCase(sign)} in the ${ordinalHouse(house)} house`;
}

export function natalPlacementSignLabel(planet: NatalPlacementPlanet, sign: NatalPlacementSign) {
  return `${natalPlacementPointLabel(planet)} in ${titleCase(sign)}`;
}

export function natalPlacementHouseLabel(planet: NatalPlacementPlanet, house: NatalPlacementHouse, motion: NatalPlacementMotion = "direct") {
  return `${natalPlacementPointLabel(planet)}${motion === "retrograde" ? " retrograde" : ""} in the ${ordinalHouse(house)} house`;
}

export function natalPlacementExactKey(
  planet: NatalPlacementPlanet,
  sign: NatalPlacementSign,
  house: NatalPlacementHouse,
  motion: NatalPlacementMotion = "direct"
) {
  const directKey = `fallback-hook/natal-you-placement-complete-final/${planet}/${sign}/${house}`;
  return motion === "retrograde" ? `${directKey}/retrograde` : directKey;
}

export function natalPlacementSourceGroups(
  planet: NatalPlacementPlanet,
  sign: NatalPlacementSign | "",
  house?: NatalPlacementHouse | "",
  motion: NatalPlacementMotion = "direct"
): NatalPlacementSourceGroup[] {
  const planetLabel = natalPlacementPointLabel(planet);
  const signLabel = titleCase(sign);
  if (!sign && (!house || isNatalPlacementAngle(planet))) return [];
  if (isNatalPlacementAngle(planet)) {
    return [
      {
        key: "sign",
        label: `${planetLabel} in ${signLabel}`,
        description: "Edit the angle introduction or the sign-specific natal passage. These are the sources the reader uses for this chart angle.",
        sources: [
          { key: `fallback-hook/angle-sign/${planet}/${sign}`, label: `${planetLabel} in ${signLabel} passage`, scope: `Used for ${planetLabel} in ${signLabel}.` },
          { key: `fallback-hook/angle-intro/${planet}`, label: `${planetLabel} introduction`, scope: `Used by every natal ${planetLabel} placement.` }
        ]
      },
      {
        key: "structure",
        label: "Sentence structure (advanced)",
        description: "Preview the assembled copy; colored sections open its source writing.",
        sources: [
          { key: "fallback-template/natal.angle-in-sign", label: "Natal angle template", scope: "Controls the sentence order for every natal angle-in-sign write-up." }
        ]
      }
    ];
  }
  const signGroup: NatalPlacementSourceGroup = {
    key: "sign",
    label: `${planetLabel} in ${signLabel}`,
    description: "Edit the complete sign passage or its shared sources.",
    sources: [
      { key: `fallback-hook/natal-you-placement-sign-final/${planet}/${sign}`, label: `Complete ${planetLabel} in ${signLabel} passage`, scope: `Replaces the You sign paragraph across every house.` },
      { key: `fallback-hook/natal/planet-intro/${planet}`, label: `${planetLabel} introduction`, scope: `Used by every natal ${planetLabel} placement.` },
      { key: `fallback-vocab/planet-verb/${planet}`, label: `${planetLabel} action phrase`, scope: `Used by every natal ${planetLabel} sign placement.` },
      { key: `fallback-vocab/sign-adverb/${sign}`, label: `${signLabel} style phrase`, scope: `Used by every natal placement in ${signLabel}.` },
      { key: `fallback-vocab/sign-need/${sign}`, label: `${signLabel} need`, scope: `Used by every natal placement in ${signLabel}.` },
      { key: `fallback-hook/placement-sentence/${planet}/${sign}`, label: `${planetLabel} in ${signLabel} passage`, scope: `Used for ${planetLabel} in ${signLabel}, across every house.` },
      ...Array.from({ length: 8 }, (_, index) => ({ key: `fallback-vocab/placement-gerund/${planet}/${sign}/${index}`, label: `${planetLabel} in ${signLabel} day-to-day phrase ${index + 1}`, scope: "Used in the day-to-day sentence for this planet and sign.", existingOnly: true })),
      { key: `fallback-vocab/planet-excess/${planet}`, label: `${planetLabel} challenge`, scope: `Used by every natal ${planetLabel} placement.` },
      { key: `fallback-hook/planet-best/${planet}`, label: `${planetLabel} strength`, scope: `Used by every natal ${planetLabel} placement.` },
      ...["planet-topic", "planet-core", "planet-productive"].map(family => ({ key: `fallback-vocab/${family}/${planet}`, label: `${planetLabel} ${family.replace("planet-", "")} phrase`, scope: `Shared wording available to the ${planetLabel} template.`, existingOnly: true })),
      { key: `fallback-vocab/sign-style/${sign}`, label: `${signLabel} style`, scope: `Shared wording available to templates for ${signLabel}.`, existingOnly: true },
      ...(["north-node", "south-node"].includes(planet) ? [
        { key: `fallback-hook/node-journey/${planet}`, label: `${planetLabel} journey`, scope: `Used by every ${planetLabel} sign placement.` },
        { key: `fallback-vocab/node-direction/${natalPlacementSigns[(natalPlacementSigns.indexOf(sign as NatalPlacementSign) + 6) % 12]}`, label: "Opposite sign direction", scope: "Used inside the node journey for the selected sign." }
      ] : []),
      { key: `fallback-hook/placement-sign-lived/${planet}/${sign}`, label: `${planetLabel} in ${signLabel} authored passage`, scope: "Used when no complete sign override is published.", existingOnly: true },
      { key: `fallback-hook/sign-lived/${sign}`, label: `${signLabel} fallback passage`, scope: "Used only when the sign template cannot render.", existingOnly: true }
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
    description: "Preview the assembled copy; colored sections open its source writing.",
    sources: [
      ...(sign ? [signStructure] : []),
      ...(includeHouse ? [{ key: "fallback-template/natal.house-context", label: "Natal house template", scope: "Controls the sentence order for all natal placement house paragraphs." }] : [])
    ]
  });

  const retrogradeKey = motion === "retrograde" ? natalRetrogradeModifierKey(planet, house) : null;
  const motionGroup: NatalPlacementSourceGroup | null = motion === "retrograde" && !natalPlacementMotionIsFixed(planet) ? {
    key: "motion",
    label: `${planetLabel} retrograde${house ? ` in the ${ordinalHouse(house)} house` : ""}`,
    description: house
      ? "Retrograde is a calculated fact; edit this planet and house."
      : "Choose a house to edit its You and Friend retrograde additions.",
    sources: retrogradeKey && house ? [{
      key: retrogradeKey,
      label: `${planetLabel} retrograde in the ${ordinalHouse(house)} house modifier`,
      scope: `Used across every zodiac sign, after the sign and house paragraphs.`
    }] : []
  } : null;

  if (!house) return [signGroup, ...(motionGroup ? [motionGroup] : []), structureGroup(false)];

  const houseLabel = ordinalHouse(house);
  const exactKey = sign ? natalPlacementExactKey(planet, sign, house, motion) : "";
  const motionLabel = motion === "retrograde" ? "retrograde " : "";
  return [
    ...(sign ? [{
      key: "exact",
      label: natalPlacementLabel(planet, sign, house, motion),
      description: `Optional exact override. Direct/retrograde stored separately; replaces all assembled sections.`,
      sources: [
        {
          key: exactKey,
          label: `Complete ${motionLabel}${planetLabel} in ${signLabel} in the ${houseLabel} house write-up`,
          scope: `Only for this planet, sign, house and motion.`
        }
      ]
    } as NatalPlacementSourceGroup, signGroup] : []),
    ...(motionGroup ? [motionGroup] : []),
    {
      key: "house",
      label: `${planetLabel} in the ${houseLabel} house`,
      description: "These rows build the second paragraph about how this placement works in the selected house.",
      sources: [
        { key: `fallback-hook/natal-you-placement-house-final/${planet}/${house}`, label: `Complete ${planetLabel} in the ${houseLabel} house passage`, scope: `Replaces the You house paragraph across every sign.` },
        { key: `fallback-hook/house-meaning/${house}`, label: `${houseLabel} house meaning`, scope: `Used by every natal placement in the ${houseLabel} house.` },
        { key: `fallback-hook/placement-house-sentence/${planet}/${house}`, label: `${planetLabel} in the ${houseLabel} house passage`, scope: `Used for ${planetLabel} in the ${houseLabel} house, across every zodiac sign.` },
        { key: `fallback-hook/placement-house-lived/${planet}/${house}`, label: `${planetLabel} in the ${houseLabel} house authored passage`, scope: "Used when no complete house override is published.", existingOnly: true },
        { key: `fallback-hook/house-lived/${house}`, label: `${houseLabel} house fallback passage`, scope: "Used only when the house template cannot render.", existingOnly: true }
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
  const aliasedAngle = natalPlacementPointAliases.find((alias) => alias.pattern.test(normalized))?.point;
  const planet = aliasedAngle
    ?? natalPlacementPlanets.find((value) => new RegExp(`\\b${value.replace("-", "[- ]")}\\b`).test(normalized));
  const sign = natalPlacementSigns.find((value) => new RegExp(`\\b${value}\\b`).test(normalized));
  const houseMatch = normalized.match(/(?:house\s*[-:]?\s*|\b)(1[0-2]|[1-9])(?:st|nd|rd|th)?(?:\s+house)?\b/);
  const house = houseMatch && natalPlacementHouses.includes(houseMatch[1] as NatalPlacementHouse)
    ? houseMatch[1] as NatalPlacementHouse
    : undefined;
  const motion = /\b(?:retrograde|retro|rx)\b/u.test(normalized)
    ? "retrograde"
    : /\bdirect\b/u.test(normalized)
      ? "direct"
      : undefined;
  return {
    ...(planet ? { planet } : {}),
    ...(sign ? { sign } : {}),
    ...(house ? { house } : {}),
    ...(motion ? { motion } : {})
  };
}
