import { lunarBeatCopyByKey } from "./lunarBeatCopy";
import { seasonArcCopyBySign } from "./seasonArcCopy";

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
  slotKeys?: string[];
  copy: FallbackHookCopyGuidance;
};

export type LunarCalendarContentKeyGroup =
  | "new-moon"
  | "full-moon"
  | "first-quarter"
  | "last-quarter"
  | "eclipse"
  | "season"
  | "arc-fallback"
  | "transit-fallback";

export type LunarCalendarContentKeyDefinition = {
  key: string;
  group: LunarCalendarContentKeyGroup;
  label: string;
  slotKeys: string[];
  fieldKeys: Array<"headline" | "summary" | "body" | "journalPrompt">;
};

const emptyFallbackHookCopy: FallbackHookCopyGuidance = {
  headline: "",
  summary: "",
  body: "",
  bestMove: "",
  emptyState: "If no approved content exists, leave the product surface blank."
};

const zodiacSigns = [
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
];

const aspectTypes = ["conjunction", "sextile", "square", "trine", "opposition"];

const ingressPlanets = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto"
];

function titleCaseKeyPart(value: string) {
  return value
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

const lunationFieldKeys: LunarCalendarContentKeyDefinition["fieldKeys"] = ["headline", "summary", "body", "journalPrompt"];

export const lunarCalendarContentKeyDefinitions: LunarCalendarContentKeyDefinition[] = [
  ...zodiacSigns.map((sign) => ({
    key: `lunation/new-moon/${sign}`,
    group: "new-moon" as const,
    label: `New Moon / ${titleCaseKeyPart(sign)}`,
    slotKeys: ["moonPhase", "moonSign", "sunSign", "season", "arcPosition", "arcTargetSign", "eclipseSeason", "mercuryRx"],
    fieldKeys: lunationFieldKeys
  })),
  ...zodiacSigns.map((sign) => ({
    key: `lunation/full-moon/${sign}`,
    group: "full-moon" as const,
    label: `Full Moon / ${titleCaseKeyPart(sign)}`,
    slotKeys: ["moonPhase", "moonSign", "oppositeSign", "sunSign", "season", "arcPosition", "arcTargetSign", "eclipseSeason", "mercuryRx"],
    fieldKeys: lunationFieldKeys
  })),
  ...zodiacSigns.map((sign) => ({
    key: `lunation/first-quarter/${sign}`,
    group: "first-quarter" as const,
    label: `First Quarter / Moon in ${titleCaseKeyPart(sign)}`,
    slotKeys: ["moonPhase", "moonSign", "sunSign", "season", "arcPosition", "arcTargetSign", "eclipseSeason", "mercuryRx"],
    fieldKeys: lunationFieldKeys
  })),
  ...zodiacSigns.map((sign) => ({
    key: `lunation/last-quarter/${sign}`,
    group: "last-quarter" as const,
    label: `Last Quarter / Moon in ${titleCaseKeyPart(sign)}`,
    slotKeys: ["moonPhase", "moonSign", "sunSign", "season", "arcPosition", "arcTargetSign", "eclipseSeason", "mercuryRx"],
    fieldKeys: lunationFieldKeys
  })),
  {
    key: "lunation/eclipse",
    group: "eclipse",
    label: "Eclipse",
    slotKeys: ["moonPhase", "moonSign", "sunSign", "season", "eclipseType", "eclipseSeason", "arcPosition", "arcTargetSign", "mercuryRx"],
    fieldKeys: lunationFieldKeys
  },
  ...zodiacSigns.map((sign) => ({
    key: `season/${sign}`,
    group: "season" as const,
    label: `${titleCaseKeyPart(sign)} Season`,
    slotKeys: ["sunSign", "season", "seasonTheme"],
    fieldKeys: ["body"] as LunarCalendarContentKeyDefinition["fieldKeys"]
  })),
  {
    key: "fallback-hook/lunar-calendar/arc-new-moon",
    group: "arc-fallback",
    label: "Lunar Arc Fallback / New Moon",
    slotKeys: ["moonPhase", "moonSign", "sunSign", "season", "sixMonthArcConnection", "arcTargetSign", "eclipseSeason", "mercuryRx"],
    fieldKeys: ["body"] as LunarCalendarContentKeyDefinition["fieldKeys"]
  },
  {
    key: "fallback-hook/lunar-calendar/arc-full-moon",
    group: "arc-fallback",
    label: "Lunar Arc Fallback / Full Moon",
    slotKeys: ["moonPhase", "moonSign", "oppositeSign", "sunSign", "season", "twoWeekArcConnection", "sixMonthArcConnection", "eclipseSeason", "mercuryRx"],
    fieldKeys: ["body"] as LunarCalendarContentKeyDefinition["fieldKeys"]
  },
  ...aspectTypes.map((aspectType) => ({
    key: `transit-fallback/${aspectType}`,
    group: "transit-fallback" as const,
    label: `Transit Fallback / ${titleCaseKeyPart(aspectType)}`,
    slotKeys: ["planetA", "planetB", "aspectType", "orb", "applying", "moonPhase", "moonSign", "sunSign", "season"],
    fieldKeys: ["body"] as LunarCalendarContentKeyDefinition["fieldKeys"]
  }))
];

function titleCaseFromSlug(value: string) {
  return value
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function phaseSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const lunarBeatFallbackHookDefinitions = Object.entries(lunarBeatCopyByKey).map(([contentKey, copy]) => {
  const [, phase = "lunation", sign = ""] = contentKey.match(/^lunation\/([^/]+)\/([^/]+)$/) ?? [];
  const labelPhase = titleCaseFromSlug(phase);
  const labelSign = titleCaseFromSlug(sign);

  return {
    key: contentKey,
    label: `Lunar Calendar > ${labelPhase} / ${labelSign}`,
    surface: "sky",
    domain: "sky",
    mode: "feed",
    description: `Editable fallback row for ${copy.title}. Headline stores the Moon archetype name, summary stores the Story/Shadow/Growth lore paragraph, and body stores the client-facing day copy.`,
    knowledgeIdTemplates: [contentKey],
    requiredFacts: ["moon phase", "moon sign", "sun sign", "season", "lunar arc position"],
    copy: {
      ...emptyFallbackHookCopy,
      headline: copy.archetypeTitle ?? copy.title,
      summary: copy.archetypeLore ?? "",
      body: copy.body
    }
  } satisfies FallbackHookDefinition;
});

const seasonArcFallbackHookDefinitions = Object.entries(seasonArcCopyBySign).flatMap(([sign, copy]) => {
  const signSlug = phaseSlug(sign);
  const storyHook = {
    key: `season-arc/${signSlug}`,
    label: `Lunar Calendar > ${sign} Season Story`,
    surface: "sky",
    domain: "sky",
    mode: "feed",
    description: `Editable fallback row for the ${sign} season overview in the lunar calendar rail.`,
    knowledgeIdTemplates: [`season/${signSlug}`],
    requiredFacts: ["sun sign", "season"],
    copy: {
      ...emptyFallbackHookCopy,
      headline: `${sign} Season Story`,
      body: copy.story
    }
  } satisfies FallbackHookDefinition;
  const phaseHooks = copy.phases.map((phase) => ({
    key: `season-arc/${signSlug}/${phaseSlug(phase.phase)}`,
    label: `Lunar Calendar > ${sign} Season / ${phase.phase}`,
    surface: "sky",
    domain: "sky",
    mode: "feed",
    description: `Editable fallback row for the ${phase.phase} lunar phase in the ${sign} season arc.`,
    knowledgeIdTemplates: [`season/${signSlug}`, `season-arc/${signSlug}`],
    requiredFacts: ["sun sign", "season", "moon phase"],
    copy: {
      ...emptyFallbackHookCopy,
      headline: phase.figure ?? phase.phase,
      body: phase.body
    }
  } satisfies FallbackHookDefinition));

  return [storyHook, ...phaseHooks];
});

const planetIngressFallbackHookDefinitions = ingressPlanets.map((planet) => ({
  key: `sky.ingress.${planet}`,
  label: `Sky > ${titleCaseKeyPart(planet)} Ingress Template`,
  surface: "sky",
  domain: "sky",
  mode: "feed",
  description: `Planet-specific ingress template for ${titleCaseKeyPart(planet)} entering any sign. The destination sign remains a render-time slot.`,
  knowledgeIdTemplates: [`sky-ingress-${planet}-{sign}`, `sky-${planet}-enters-{sign}`, `sky-${planet}-in-{sign}`],
  requiredFacts: ["planet", "sign", "ingress date", "planet-specific threshold shift"],
  slotKeys: ["planet", "sign", "ingressDate", "thresholdShift", "strongestSkyAspect", "strongestNatalAspect", "natalHouse", "retrogradeCondition"],
  copy: emptyFallbackHookCopy
} satisfies FallbackHookDefinition));

export const fallbackHookDefinitions = [
  ...lunarBeatFallbackHookDefinitions,
  ...seasonArcFallbackHookDefinitions,
  ...planetIngressFallbackHookDefinitions,
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
    requiredFacts: ["moon sign", "Moon sign need", "moon phase", "optional strongest aspect"],
    copy: emptyFallbackHookCopy
  },
  {
    key: "lunar-calendar/day",
    label: "Lunar Calendar > Day",
    surface: "sky",
    domain: "sky",
    mode: "feed",
    description: "Reusable lunar calendar day copy when phase/sign/date-specific lunar editorial rows are missing.",
    knowledgeIdTemplates: ["sky-moon-in-{moonSign}", "moon-in-{moonSign}", "lunar-{moonPhase}-{moonSign}"],
    requiredFacts: ["moon phase", "moon phase helper", "moon sign", "moon sign mode", "current sun sign", "current season", "season theme", "lunar arc position", "lunar arc helper", "lunar arc target sign", "eclipse season flag", "Mercury retrograde flag"],
    copy: emptyFallbackHookCopy
  },
  {
    key: "lunar-calendar/arc-new-moon",
    label: "Lunar Calendar > Arc / New Moon",
    surface: "sky",
    domain: "sky",
    mode: "feed",
    description: "Fallback arc copy for New Moon calendar cards when authored lunar arc seed rows are missing.",
    knowledgeIdTemplates: ["lunation/new-moon/{moonSign}", "season/{sunSign}"],
    requiredFacts: ["moon phase", "moon sign", "current sun sign", "six-month arc connection", "arc target sign", "eclipse season flag", "Mercury retrograde flag"],
    copy: {
      ...emptyFallbackHookCopy,
      body: "Theme: {{sixMonthArcConnection}}"
    }
  },
  {
    key: "lunar-calendar/arc-full-moon",
    label: "Lunar Calendar > Arc / Full Moon",
    surface: "sky",
    domain: "sky",
    mode: "feed",
    description: "Fallback arc copy for Full Moon calendar cards when authored lunar arc lesson rows are missing.",
    knowledgeIdTemplates: ["lunation/full-moon/{moonSign}", "season/{sunSign}"],
    requiredFacts: ["moon phase", "moon sign", "opposite sign", "current sun sign", "two-week arc connection", "six-month arc connection", "eclipse season flag", "Mercury retrograde flag"],
    copy: {
      ...emptyFallbackHookCopy,
      body: "Recent arc: {{twoWeekArcConnection}}\n\nLonger {{moonSign}} arc: {{sixMonthArcConnection}}"
    }
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
    key: "sky.ingress",
    label: "Sky > Planetary Ingress",
    surface: "sky",
    domain: "sky",
    mode: "feed",
    description: "Planet entering a sign, composed with relevant current-sky aspect, personal transit, natal house, or retrograde condition when available.",
    knowledgeIdTemplates: ["sky-ingress-{planet}-{sign}", "sky-{planet}-enters-{sign}", "sky-{planet}-in-{sign}"],
    requiredFacts: ["planet", "sign", "ingress date", "optional strongest current-sky aspect", "optional natal house when birth time is reliable", "optional retrograde/station condition"],
    slotKeys: ["planet", "sign", "ingressDate", "strongestSkyAspect", "strongestNatalAspect", "natalHouse", "retrogradeCondition"],
    copy: emptyFallbackHookCopy
  },
  {
    key: "sky.aspect-detail",
    label: "Sky > Aspect Detail Write-Up",
    surface: "sky",
    domain: "sky",
    mode: "feed",
    description: "Primary fallback for the full active-aspect card or detail article between two current sky bodies.",
    knowledgeIdTemplates: ["sky-{planetA}-{aspect}-{planetB}", "{planetA}-{aspect}-{planetB}", "{planetB}-{aspect}-{planetA}"],
    requiredFacts: ["planetA", "planetB", "aspect", "orb", "applying/separating optional"],
    copy: emptyFallbackHookCopy
  },
  {
    key: "sky.aspect-sign-context",
    label: "Sky > Aspect Supporting Sign Line",
    surface: "sky",
    domain: "sky",
    mode: "feed",
    description: "Supplemental one-line context appended after the aspect write-up when both current planet signs are available.",
    knowledgeIdTemplates: [],
    requiredFacts: ["planetA", "signA", "signAStyle", "planetB", "signB", "signBStyle"],
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
    key: "sky.station",
    label: "Sky > Station Detail",
    surface: "sky",
    domain: "sky",
    mode: "feed",
    description: "Planet-specific station direct or station retrograde copy, using the planet topic and station direction.",
    knowledgeIdTemplates: ["station-{planet}-{direction}", "sky-station-{planet}-{direction}", "sky-retrograde-{planet}"],
    requiredFacts: ["planet", "station direction", "planet topic", "station date"],
    slotKeys: ["planet", "direction", "planetTopic", "stationDate", "sign"],
    copy: emptyFallbackHookCopy
  },
  {
    key: "sky.retrograde-section",
    label: "Sky > Retrograde Section",
    surface: "sky",
    domain: "sky",
    mode: "feed",
    description: "Section-level summary for multiple active retrogrades in the current sky.",
    knowledgeIdTemplates: [],
    requiredFacts: ["count", "fastestPlanet"],
    copy: emptyFallbackHookCopy
  },
  {
    key: "you.natal-placement",
    label: "Natal > Placement",
    surface: "you",
    domain: "natal",
    mode: "in_depth",
    description: "Natal planet-in-sign placements shown on the You page.",
    knowledgeIdTemplates: ["natal-{planet}-in-{sign}", "{planet}-in-{sign}"],
    requiredFacts: ["planet", "sign", "planet topic", "sign style"],
    copy: emptyFallbackHookCopy
  },
  {
    key: "you.natal-house-placement",
    label: "Natal > Planet In House",
    surface: "you",
    domain: "natal",
    mode: "in_depth",
    description: "Natal planet-in-house placement text when a reliable birth time gives house position.",
    knowledgeIdTemplates: ["natal-{planet}-in-house-{house}", "natal-{planet}-house-{house}", "{planet}-house-{house}"],
    requiredFacts: ["planet", "house", "planet topic", "house life area", "reliable birth time"],
    slotKeys: ["planet", "house", "planetTopic", "houseTopic", "birthTimeConfidence"],
    copy: emptyFallbackHookCopy
  },
  {
    key: "you.natal-angle-placement",
    label: "Natal > Ascendant / Midheaven Placement",
    surface: "you",
    domain: "natal",
    mode: "in_depth",
    description: "Ascendant and Midheaven sign placement text when birth time is reliable enough to calculate angles.",
    knowledgeIdTemplates: ["natal-{angle}-in-{sign}", "{angle}-in-{sign}", "natal-angle-{angle}-{sign}"],
    requiredFacts: ["angle", "sign", "angle meaning", "sign style", "reliable birth time"],
    slotKeys: ["angle", "sign", "angleTopic", "signStyle", "birthTimeConfidence"],
    copy: emptyFallbackHookCopy
  },
  {
    key: "you.natal-aspect",
    label: "Natal > Aspect",
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
    label: "Natal > Transit To Natal",
    surface: "you",
    domain: "natal",
    mode: "feed",
    description: "Current transit hitting a natal planet or angle on the You page.",
    knowledgeIdTemplates: ["transit-natal-{transitPlanet}-{aspect}-{natalPoint}", "{transitPlanet}-{aspect}-{natalPoint}"],
    requiredFacts: ["transitPlanet", "aspect", "natalPoint", "orb/timing optional"],
    slotKeys: ["transitPlanet", "aspect", "natalPoint", "transitPlanetTopic", "natalPointTopic", "transitPlanetWeather", "aspectTone", "personalActivation", "activatedHouse", "activatedHouseTopic", "timingIntensity", "timingPhase"],
    copy: emptyFallbackHookCopy
  },
  {
    key: "you.transit-through-house",
    label: "Natal > Transit Through House",
    surface: "you",
    domain: "natal",
    mode: "feed",
    description: "Current sky planet moving through a natal house, only when birth time is reliable enough to derive houses.",
    knowledgeIdTemplates: ["transit-house-{transitPlanet}-{house}", "transit-{transitPlanet}-through-house-{house}", "{transitPlanet}-house-{house}"],
    requiredFacts: ["transitPlanet", "house", "house life area", "reliable birth time", "transit window optional"],
    slotKeys: ["transitPlanet", "house", "houseTopic", "transitPlanetTopic", "transitStart", "transitEnd", "birthTimeConfidence"],
    copy: emptyFallbackHookCopy
  },
  {
    key: "you.transit-to-angle",
    label: "Natal > Transit To Angle",
    surface: "you",
    domain: "natal",
    mode: "feed",
    description: "Current transit aspecting the natal Ascendant, Descendant, Midheaven, or IC, only when birth time is reliable enough to derive angles.",
    knowledgeIdTemplates: ["transit-natal-{transitPlanet}-{aspect}-{angle}", "{transitPlanet}-{aspect}-{angle}", "transit-angle-{transitPlanet}-{aspect}-{angle}"],
    requiredFacts: ["transitPlanet", "aspect", "angle", "orb/timing optional", "reliable birth time"],
    slotKeys: ["transitPlanet", "aspect", "angle", "angleTopic", "transitPlanetTopic", "timingIntensity", "timingPhase", "birthTimeConfidence"],
    copy: emptyFallbackHookCopy
  },
  {
    key: "you.daily-timing",
    label: "Natal > Daily Timing",
    surface: "you",
    domain: "natal",
    mode: "feed",
    description: "Daily personal timing summary assembled from the strongest current transit against the natal chart.",
    knowledgeIdTemplates: ["transit-natal-{transitPlanet}-{aspect}-{natalPoint}", "{transitPlanet}-{aspect}-{natalPoint}", "{natalPoint}"],
    requiredFacts: ["transitPlanet", "aspect", "natalPoint", "orb", "window"],
    slotKeys: ["activeTransit", "transitPlanet", "aspect", "natalPoint", "transitPlanetTopic", "natalPointTopic", "transitPlanetWeather", "aspectTone", "personalActivation", "activatedHouse", "activatedHouseTopic", "timingIntensity", "timingPhase", "orb", "window", "activatedSign", "activatedRuler"],
    copy: emptyFallbackHookCopy
  },
  {
    key: "natal/hard-aspect",
    label: "Natal > Hard Aspect Reframe",
    surface: "natal",
    domain: "natal",
    mode: "in_depth",
    description: "Fallback line for squares and oppositions in natal or career-focused chart interpretation when a hard aspect needs a non-fatalistic reframe.",
    knowledgeIdTemplates: ["natal-{planetA}-{aspect}-{planetB}", "{planetA}-{aspect}-{planetB}", "{planetB}-{aspect}-{planetA}"],
    requiredFacts: ["planetA", "planetB", "aspect", "life area or career planet context"],
    slotKeys: ["planetA", "planetB", "aspect", "planetATopic", "planetBTopic", "lifeArea", "careerContext"],
    copy: emptyFallbackHookCopy
  },
  {
    key: "natal/chart-contradiction",
    label: "Natal > Chart Contradiction",
    surface: "natal",
    domain: "natal",
    mode: "in_depth",
    description: "UX fallback for the moment a reader feels a natal card does not sound like them.",
    knowledgeIdTemplates: [],
    requiredFacts: ["reader mismatch context optional", "birth time confidence optional"],
    slotKeys: ["personName", "placement", "birthTimeConfidence", "socialConditioningContext"],
    copy: emptyFallbackHookCopy
  },
  {
    key: "natal/free-will-disclaimer",
    label: "Natal > Free Will Disclaimer",
    surface: "natal",
    domain: "natal",
    mode: "article",
    description: "Report-level disclaimer reminding the reader that the chart describes potential rather than fixed fate.",
    knowledgeIdTemplates: ["natal-free-will", "chart-potential", "cosmic-blueprint"],
    requiredFacts: ["report or archetype context"],
    slotKeys: ["personName", "reportType", "archetype"],
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
    slotKeys: [
      "friendName",
      "friendNamePossessive",
      "friendPlanet",
      "friendPlanetTopic",
      "aspect",
      "readerName",
      "readerPossessive",
      "yourPlanet",
      "yourPlanetTopic",
      "personA",
      "personAPossessive",
      "personASubject",
      "personAObject",
      "personAPossessivePronoun",
      "personAName",
      "personANamePossessive",
      "planetA",
      "planetATopic",
      "personB",
      "personBPossessive",
      "personBSubject",
      "personBObject",
      "personBPossessivePronoun",
      "personBName",
      "personBNamePossessive",
      "planetB",
      "planetBTopic"
    ],
    copy: emptyFallbackHookCopy
  },
  {
    key: "friends.same-planet",
    label: "Friends > Same-Planet Synastry",
    surface: "friends",
    domain: "relationship",
    mode: "in_depth",
    description: "Symmetric synastry contacts where both charts meet through the same planet, such as Saturn conjunct Saturn.",
    knowledgeIdTemplates: [
      "synastry-same-planet-{planet}-{aspect}",
      "synastry-same-planet-{planet}-{aspectFamily}",
      "synastry-same-planet-{planet}",
      "relationship-same-planet-{planet}-{aspect}",
      "relationship-same-planet-{planet}"
    ],
    requiredFacts: ["same planet", "aspect", "relationship context", "orb"],
    slotKeys: [
      "friendName",
      "readerName",
      "personA",
      "personB",
      "planet",
      "planetA",
      "planetB",
      "aspect",
      "aspectFamily",
      "relationshipContext",
      "orb"
    ],
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

const fallbackHookAliases: Record<string, string> = {
  "sky.lunar-calendar-day": "lunar-calendar/day",
  "sky.lunar-arc-new-moon": "lunar-calendar/arc-new-moon",
  "sky.lunar-arc-full-moon": "lunar-calendar/arc-full-moon"
};

export function fallbackHookByKey(key: string) {
  const canonicalKey = fallbackHookAliases[key] ?? key;

  return fallbackHookDefinitions.find((hook) => hook.key === canonicalKey) ?? null;
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
