export type FallbackHookSurface = "sky" | "you" | "natal" | "friends" | "synastry" | "composite" | "relationship" | "settings";

export type FallbackHookDomain = "sky" | "natal" | "relationship";

export type FallbackHookContext = Record<string, string | number | null | undefined>;

export type FallbackHookCopyGuidance = {
  headline: string;
  summary: string;
  body: string;
  bestMove: string;
  emptyState: string;
};

export type FallbackHookDefinition = {
  key: string;
  label: string;
  surface: FallbackHookSurface;
  domain: FallbackHookDomain;
  mode: "feed" | "in_depth" | "article" | "system";
  description: string;
  knowledgeIdTemplates: string[];
  requiredFacts: string[];
  copy: FallbackHookCopyGuidance;
};

const emptyFallbackHookCopy: FallbackHookCopyGuidance = {
  headline: "",
  summary: "",
  body: "",
  bestMove: "",
  emptyState: "If no approved content exists, leave the product surface blank."
};

export const fallbackHookDefinitions = [
  {
    key: "sky.seasonal-current",
    label: "Sky > Season",
    surface: "sky",
    domain: "sky",
    mode: "feed",
    description: "Sun sign season cards, such as Gemini Season, with current-sky aspects layered in.",
    knowledgeIdTemplates: ["sky-{planet}-in-{sign}", "{planet}-in-{sign}"],
    requiredFacts: ["sign", "seasonPlanet=Sun", "optional active aspect", "optional date/orb"],
    copy: emptyFallbackHookCopy
  },
  {
    key: "sky.lunar-cycle",
    label: "Sky > Lunar Cycle",
    surface: "sky",
    domain: "sky",
    mode: "feed",
    description: "Moon sign and lunar cycle cards, including the Moon's strongest active aspect.",
    knowledgeIdTemplates: ["sky-{planet}-in-{sign}", "{planet}-in-{sign}"],
    requiredFacts: ["moon sign", "moon phase", "optional strongest aspect"],
    copy: emptyFallbackHookCopy
  },
  {
    key: "sky.planetary-placement",
    label: "Sky > Planetary Placement",
    surface: "sky",
    domain: "sky",
    mode: "feed",
    description: "Current sky write-up for a planet moving through a sign, separate from natal placement language.",
    knowledgeIdTemplates: ["sky-{planet}-in-{sign}", "{planet}-in-{sign}"],
    requiredFacts: ["planet", "sign", "planet topic", "sign style"],
    copy: emptyFallbackHookCopy
  },
  {
    key: "sky.aspect-detail",
    label: "Sky > Current Aspect Detail",
    surface: "sky",
    domain: "sky",
    mode: "feed",
    description: "Current sky aspects between two planets, with action and timing.",
    knowledgeIdTemplates: ["sky-{planetA}-{aspect}-{planetB}", "{planetA}-{aspect}-{planetB}", "{planetB}-{aspect}-{planetA}"],
    requiredFacts: ["planetA", "planetB", "aspect", "orb", "applying/separating optional"],
    copy: emptyFallbackHookCopy
  },
  {
    key: "sky.retrograde",
    label: "Sky > Retrograde Detail",
    surface: "sky",
    domain: "sky",
    mode: "feed",
    description: "Planet-specific retrograde copy, using the planet's topic instead of generic retrograde text.",
    knowledgeIdTemplates: ["retrograde-{planet}", "sky-retrograde-{planet}", "{planet}-retrograde"],
    requiredFacts: ["planet", "planet topic", "retrograde status"],
    copy: emptyFallbackHookCopy
  },
  {
    key: "you.natal-placement",
    label: "You > Natal Placement",
    surface: "you",
    domain: "natal",
    mode: "in_depth",
    description: "Natal planet-in-sign placements shown on the You page.",
    knowledgeIdTemplates: ["natal-{planet}-in-{sign}", "{planet}-in-{sign}"],
    requiredFacts: ["planet", "sign", "planet topic", "sign style"],
    copy: emptyFallbackHookCopy
  },
  {
    key: "you.natal-aspect",
    label: "You > Natal Aspect",
    surface: "you",
    domain: "natal",
    mode: "in_depth",
    description: "Natal aspect cards and aspect detail text.",
    knowledgeIdTemplates: ["natal-{planetA}-{aspect}-{planetB}", "{planetA}-{aspect}-{planetB}", "{planetB}-{aspect}-{planetA}"],
    requiredFacts: ["planetA", "planetB", "aspect", "planet topics"],
    copy: emptyFallbackHookCopy
  },
  {
    key: "you.transit-to-natal",
    label: "You > Transit To Natal",
    surface: "you",
    domain: "natal",
    mode: "feed",
    description: "Current transit hitting a natal planet or angle on the You page.",
    knowledgeIdTemplates: ["transit-natal-{transitPlanet}-{aspect}-{natalPoint}", "{transitPlanet}-{aspect}-{natalPoint}"],
    requiredFacts: ["transitPlanet", "aspect", "natalPoint", "orb/timing optional"],
    copy: emptyFallbackHookCopy
  },
  {
    key: "friends.synastry-contact",
    label: "Friends > Synastry Contact",
    surface: "friends",
    domain: "relationship",
    mode: "in_depth",
    description: "Two-chart interaspects, such as one person's Venus sextile the other's Ascendant.",
    knowledgeIdTemplates: ["synastry-{planetA}-{aspect}-{planetB}", "relationship-{planetA}-{aspect}-{planetB}", "{planetA}-{aspect}-{planetB}", "{planetB}-{aspect}-{planetA}"],
    requiredFacts: ["personA planet/point", "personB planet/point", "aspect"],
    copy: emptyFallbackHookCopy
  },
  {
    key: "friends.house-overlay",
    label: "Friends > House Overlay",
    surface: "friends",
    domain: "relationship",
    mode: "in_depth",
    description: "Where one person's planet lands in the other person's house.",
    knowledgeIdTemplates: ["synastry-{planet}-in-{house}-house", "relationship-{planet}-in-{house}-house", "personal-planet-house{house}"],
    requiredFacts: ["personA planet", "personB house", "house life area"],
    copy: emptyFallbackHookCopy
  },
  {
    key: "friends.composite-aspect",
    label: "Friends > Composite Aspect",
    surface: "composite",
    domain: "relationship",
    mode: "in_depth",
    description: "Composite chart aspects describing the relationship as its own pattern.",
    knowledgeIdTemplates: ["composite-{planetA}-{aspect}-{planetB}", "relationship-{planetA}-{aspect}-{planetB}", "{planetA}-{aspect}-{planetB}"],
    requiredFacts: ["planetA", "planetB", "aspect", "relationship context"],
    copy: emptyFallbackHookCopy
  },
  {
    key: "friends.composite-placement",
    label: "Friends > Composite Placement",
    surface: "composite",
    domain: "relationship",
    mode: "in_depth",
    description: "Composite chart planet sign and house placements describing the relationship as its own pattern.",
    knowledgeIdTemplates: ["composite-{planet}-house-{house}", "composite-{planet}-house{house}", "composite-{planet}-in-{sign}", "relationship-{planet}-house-{house}", "{planet}-house-{house}"],
    requiredFacts: ["planet", "sign", "house", "relationship context"],
    copy: emptyFallbackHookCopy
  },
  {
    key: "friends.relationship-timing",
    label: "Friends > Relationship Timing",
    surface: "relationship",
    domain: "relationship",
    mode: "feed",
    description: "Current transits and timing cards comparing what each person is carrying.",
    knowledgeIdTemplates: ["transit-natal-{transitPlanet}-{aspect}-{natalPoint}", "relationship-timing-{transitPlanet}", "{transitPlanet}-{aspect}-{natalPoint}"],
    requiredFacts: ["transitPlanet", "aspect", "natalPoint", "person/chart affected"],
    copy: emptyFallbackHookCopy
  },
  {
    key: "friends.circle-feed",
    label: "Friends > Circle Feed",
    surface: "friends",
    domain: "relationship",
    mode: "feed",
    description: "Circle overview cards that explain shared timing patterns across multiple friends.",
    knowledgeIdTemplates: ["friends-circle-{topic}", "relationship-circle-{topic}", "{topic}"],
    requiredFacts: ["topic", "people affected", "shared timing pattern"],
    copy: emptyFallbackHookCopy
  },
  {
    key: "settings.life-area-focus",
    label: "Settings > Life Area Focus",
    surface: "settings",
    domain: "natal",
    mode: "system",
    description: "Settings descriptions for career, relationships, family, health, money, and other life-area focus toggles.",
    knowledgeIdTemplates: ["life-area-{topic}", "{topic}"],
    requiredFacts: ["life area topic"],
    copy: emptyFallbackHookCopy
  }
] satisfies FallbackHookDefinition[];

export function fallbackHookByKey(key: string) {
  return fallbackHookDefinitions.find((hook) => hook.key === key) ?? null;
}

export function normalizeFallbackHookPart(value: string | number | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function knowledgeIdsForFallbackHook(key: string, context: FallbackHookContext = {}) {
  const hook = fallbackHookByKey(key);

  if (!hook) {
    return [];
  }

  return hook.knowledgeIdTemplates
    .map((template) => template.replace(/\{([a-zA-Z0-9]+)\}/g, (_, name: string) => normalizeFallbackHookPart(context[name])))
    .filter((id) => !id.includes("--") && !id.endsWith("-") && !id.startsWith("-") && !id.includes("{}"))
    .filter((id) => !/\{[a-zA-Z0-9]+\}/.test(id));
}
