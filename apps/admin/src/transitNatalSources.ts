export const transitNatalPlanets = [
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
  "north-node",
  "south-node",
  "lilith"
] as const;

export const transitNatalSigns = [
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

export const transitNatalHouses = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] as const;

export const transitNatalAspects = ["conjunction", "opposition", "square", "trine", "sextile"] as const;

export const transitNatalPoints = [
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
  "north-node",
  "south-node",
  "lilith",
  "ascendant",
  "midheaven",
  "descendant",
  "imum-coeli"
] as const;

export type TransitNatalPlanet = typeof transitNatalPlanets[number];
export type TransitNatalSign = typeof transitNatalSigns[number];
export type TransitNatalHouse = typeof transitNatalHouses[number];
export type TransitNatalAspect = typeof transitNatalAspects[number];
export type TransitNatalPoint = typeof transitNatalPoints[number];

export type TransitNatalSelection = {
  planet: TransitNatalPlanet;
  sign: TransitNatalSign;
  transitHouse: TransitNatalHouse;
  aspect: TransitNatalAspect;
  natalPoint: TransitNatalPoint;
  natalHouse: TransitNatalHouse;
};

export type TransitNatalSource = {
  id: "frame" | "transiting-sign" | "natal-point" | "lived-effect" | "standalone" | "template";
  label: string;
  scope: string;
  candidateKeys: string[];
};

export type TransitNatalSourceGroup = {
  key: "composition" | "fallback";
  label: string;
  description: string;
  sources: TransitNatalSource[];
};

export type TransitNatalResolvedSource = {
  key: string;
  text: string;
};

export type TransitNatalPreview = {
  headline: string;
  body: string;
  complete: boolean;
  sourceKeys: string[];
  missing: string[];
};

const conjunctionSoftPlanets = new Set<TransitNatalPlanet>(["venus", "sun", "mercury", "jupiter"]);

function titleCase(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function transitNatalOrdinal(house: TransitNatalHouse) {
  if (house === "1") return "1st";
  if (house === "2") return "2nd";
  if (house === "3") return "3rd";
  return `${house}th`;
}

export function transitNatalAspectFamily(planet: TransitNatalPlanet, aspect: TransitNatalAspect): "hard" | "soft" {
  if (aspect === "trine" || aspect === "sextile") return "soft";
  if (aspect === "conjunction" && conjunctionSoftPlanets.has(planet)) return "soft";
  return "hard";
}

export function transitNatalLabel(selection: TransitNatalSelection) {
  return `${titleCase(selection.planet)} ${selection.aspect} your ${titleCase(selection.natalPoint)}`;
}

export function transitNatalSourceGroups(selection: TransitNatalSelection): TransitNatalSourceGroup[] {
  const planet = titleCase(selection.planet);
  const sign = titleCase(selection.sign);
  const natalPoint = titleCase(selection.natalPoint);
  const family = transitNatalAspectFamily(selection.planet, selection.aspect);

  return [
    {
      key: "composition",
      label: "House-aware assembled version (advanced)",
      description: "Some placement surfaces assemble these four shared blocks when a transit house is available. Editing one block changes every house-aware Personal Transit that reuses it.",
      sources: [
        {
          id: "frame",
          label: "Transit fact frame",
          scope: `Controls how ${planet} in a reader's transit house is connected to the natal point and calculated end date.`,
          candidateKeys: [
            `fallback-hook/transit-house-event-frame/${selection.planet}`,
            "fallback-hook/transit-house-event-frame/generic"
          ]
        },
        {
          id: "transiting-sign",
          label: `${planet} in ${sign} action`,
          scope: `Used whenever transiting ${planet} is in ${sign}, regardless of the natal point.`,
          candidateKeys: [`fallback-hook/transit-house-event-wants/${selection.planet}/${selection.sign}`]
        },
        {
          id: "natal-point",
          label: `Natal ${natalPoint} response`,
          scope: `Used whenever a transit activates natal ${natalPoint}.`,
          candidateKeys: [`fallback-hook/transit-house-event-natal/${selection.natalPoint}`]
        },
        {
          id: "lived-effect",
          label: `${planet} to ${natalPoint} ${family}-aspect effect`,
          scope: `Used for the lived consequence of ${selection.aspect} and other ${family} contacts between ${planet} and natal ${natalPoint}.`,
          candidateKeys: [
            `fallback-hook/transit-house-event-scenes/${selection.planet}/${selection.natalPoint}/${family}`,
            `fallback-hook/transit-effect-${family}/${selection.planet}/${selection.natalPoint}`
          ]
        }
      ]
    },
    {
      key: "fallback",
      label: "Exact You and Friends transit write-up",
      description: "This exact aspect passage is the main interpretation when a reader opens the transit from You or Friends. The generic template is used only when the exact passage is unavailable.",
      sources: [
        {
          id: "standalone",
          label: `Exact ${planet} ${selection.aspect} ${natalPoint} passage`,
          scope: "Edit this passage to change the opened You or Friends transit interpretation for this exact planet, natal point, and aspect.",
          candidateKeys: [
            `authored/transit-aspect/${selection.planet}/${selection.natalPoint}/${selection.aspect}`,
            `authored/transit-aspect/${selection.planet}/${selection.natalPoint}/${family}`
          ]
        },
        {
          id: "template",
          label: "Generic transit-aspect fallback template",
          scope: "Used only when the exact transit passage above is unavailable.",
          candidateKeys: ["fallback-template/transit.aspect"]
        }
      ]
    }
  ];
}

const aspectVerb: Record<TransitNatalAspect, string> = {
  conjunction: "sitting right on",
  opposition: "opposing",
  square: "squaring",
  trine: "trining",
  sextile: "sextiling"
};

function fillTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{([\w.]+)\}\}/gu, (token, key: string) => values[key] ?? token).trim();
}

export function renderTransitNatalPreview(
  selection: TransitNatalSelection,
  resolve: (candidateKeys: string[]) => TransitNatalResolvedSource | null
): TransitNatalPreview {
  const sources = transitNatalSourceGroups(selection)[0].sources;
  const resolved = new Map(sources.map((source) => [source.id, resolve(source.candidateKeys)]));
  const missing = sources.filter((source) => !resolved.get(source.id)).map((source) => source.label);
  const frame = resolved.get("frame");
  const wants = resolved.get("transiting-sign");
  const natal = resolved.get("natal-point");
  const effect = resolved.get("lived-effect");

  if (!frame || !wants || !natal || !effect) {
    return {
      headline: transitNatalLabel(selection),
      body: "This Personal Transit is incomplete. Add or repair the missing passages below; the reader app will use its alternate complete write-up until all four passages are available.",
      complete: false,
      sourceKeys: [frame, wants, natal, effect].filter((source): source is TransitNatalResolvedSource => Boolean(source)).map((source) => source.key),
      missing
    };
  }

  const natalTitle = `${titleCase(selection.natalPoint)} in your ${transitNatalOrdinal(selection.natalHouse)} house`;
  const renderedFrame = fillTemplate(frame.text, {
    aspectVerb: aspectVerb[selection.aspect],
    houseOrdinal: transitNatalOrdinal(selection.transitHouse),
    natalTitle,
    transitTitle: titleCase(selection.planet),
    windowClause: " until the calculated end date"
  });

  return {
    headline: transitNatalLabel(selection),
    body: `${renderedFrame} ${wants.text}; ${natal.text}. ${effect.text}`,
    complete: true,
    sourceKeys: [frame.key, wants.key, natal.key, effect.key],
    missing: []
  };
}
