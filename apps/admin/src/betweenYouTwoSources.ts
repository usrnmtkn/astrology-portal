export const betweenYouTwoPlanets = [
  "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus",
  "neptune", "pluto", "chiron", "north-node", "south-node", "lilith",
  "ascendant", "midheaven", "descendant", "imum-coeli"
] as const;

export const betweenYouTwoTransitingPlanets = betweenYouTwoPlanets.filter((planet) => (
  !["ascendant", "midheaven", "descendant", "imum-coeli"].includes(planet)
)) as Array<Exclude<typeof betweenYouTwoPlanets[number], "ascendant" | "midheaven" | "descendant" | "imum-coeli">>;

export const betweenYouTwoAspects = ["conjunction", "opposition", "square", "trine", "sextile"] as const;

export type BetweenYouTwoPlanet = typeof betweenYouTwoPlanets[number];
export type BetweenYouTwoTransitPlanet = typeof betweenYouTwoTransitingPlanets[number];
export type BetweenYouTwoAspect = typeof betweenYouTwoAspects[number];
export type BetweenYouTwoEndpointOwner = "reader" | "friend";

export type BetweenYouTwoSelection = {
  transiting: BetweenYouTwoTransitPlanet;
  transitAspect: BetweenYouTwoAspect;
  endpointPlanet: BetweenYouTwoPlanet;
  endpointOwner: BetweenYouTwoEndpointOwner;
  activatedPlanet: BetweenYouTwoPlanet;
  natalAspect: BetweenYouTwoAspect;
};

export type BetweenYouTwoSourceRecord = {
  key: string;
  bodyYou: string;
  bodyThey: string;
};

export type BetweenYouTwoSource = {
  id: "effect" | "effect-family" | "effect-variant-2" | "effect-variant-3" | "synastry" | "synastry-family" | "synastry-type";
  label: string;
  scope: string;
  candidateKeys: string[];
};

export type BetweenYouTwoSourceGroup = {
  key: "reader-card" | "fallbacks";
  label: string;
  description: string;
  sources: BetweenYouTwoSource[];
};

const softConjunctionPlanets = new Set<BetweenYouTwoTransitPlanet>(["sun", "mercury", "venus", "jupiter"]);

export function betweenYouTwoTitle(value: string) {
  return value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export function betweenYouTwoFamily(transiting: BetweenYouTwoTransitPlanet, aspect: BetweenYouTwoAspect): "soft" | "hard" {
  if (aspect === "trine" || aspect === "sextile") return "soft";
  if (aspect === "conjunction" && softConjunctionPlanets.has(transiting)) return "soft";
  return "hard";
}

export function synastryFamily(aspect: BetweenYouTwoAspect): "soft" | "hard" | null {
  if (aspect === "trine" || aspect === "sextile") return "soft";
  if (aspect === "square" || aspect === "opposition") return "hard";
  return null;
}

export function betweenYouTwoHeadline(selection: BetweenYouTwoSelection, friendName = "your friend") {
  const endpoint = selection.endpointOwner === "reader"
    ? `your ${betweenYouTwoTitle(selection.endpointPlanet)}`
    : `${friendName}'s ${betweenYouTwoTitle(selection.endpointPlanet)}`;
  const verb = selection.transitAspect === "conjunction"
    ? "conjunct"
    : selection.transitAspect === "opposition"
      ? "opposite"
      : selection.transitAspect;
  return `${betweenYouTwoTitle(selection.transiting)} ${verb} ${endpoint}`;
}

function synastryPlanets(selection: BetweenYouTwoSelection) {
  return selection.endpointOwner === "reader"
    ? { reader: selection.endpointPlanet, friend: selection.activatedPlanet }
    : { reader: selection.activatedPlanet, friend: selection.endpointPlanet };
}

export function betweenYouTwoSourceGroups(selection: BetweenYouTwoSelection): BetweenYouTwoSourceGroup[] {
  const family = betweenYouTwoFamily(selection.transiting, selection.transitAspect);
  const pairFamily = synastryFamily(selection.natalAspect);
  const pair = synastryPlanets(selection);
  const effectLabel = `${betweenYouTwoTitle(selection.transiting)} ${selection.transitAspect} relationship effect`;
  const connectionLabel = `Your ${betweenYouTwoTitle(pair.reader)} ${selection.natalAspect} their ${betweenYouTwoTitle(pair.friend)}`;
  const forwardExact = `fallback-hook/synastry-pair/${pair.reader}/${pair.friend}/${selection.natalAspect}`;
  const reverseExact = `fallback-hook/synastry-pair/${pair.friend}/${pair.reader}/${selection.natalAspect}`;
  const familyCandidates = pairFamily ? [
    `fallback-hook/synastry-pair/${pair.reader}/${pair.friend}/${pairFamily}`,
    `fallback-hook/synastry-pair/${pair.friend}/${pair.reader}/${pairFamily}`
  ] : [];

  return [
    {
      key: "reader-card",
      label: "What the reader sees",
      description: "The relationship effect appears first. The astrology sentence between it and the activated connection is calculated from the two charts and is not editable copy.",
      sources: [
        {
          id: "effect",
          label: effectLabel,
          scope: `Controls the opening paragraph whenever transiting ${betweenYouTwoTitle(selection.transiting)} makes this exact aspect to either person's natal chart. Both reader directions are stored on this row.`,
          candidateKeys: [`fallback-hook/bond-effect-${selection.transitAspect}/${selection.transiting}`]
        },
        {
          id: "synastry",
          label: `${connectionLabel} passage`,
          scope: "Controls the passage under “What this activates.” The resolver checks the reader-first orientation, then the reversed orientation.",
          candidateKeys: [forwardExact, reverseExact]
        }
      ]
    },
    {
      key: "fallbacks",
      label: "Fallback hooks (advanced)",
      description: "These rows serve only when exact copy is unavailable or when repeated cards rotate to avoid duplicate paragraphs.",
      sources: [
        {
          id: "effect-family",
          label: `${betweenYouTwoTitle(selection.transiting)} ${family} relationship fallback`,
          scope: `Family fallback shared by ${family} aspects for this transiting planet.`,
          candidateKeys: [`fallback-hook/bond-effect-${family}/${selection.transiting}`]
        },
        {
          id: "effect-variant-2",
          label: `${betweenYouTwoTitle(selection.transiting)} ${family} alternate 2`,
          scope: "Used for a repeated card so two cards do not show the same opening paragraph.",
          candidateKeys: [`fallback-hook/bond-effect-${family}/${selection.transiting}/variant-2`]
        },
        {
          id: "effect-variant-3",
          label: `${betweenYouTwoTitle(selection.transiting)} ${family} alternate 3`,
          scope: "Additional stable alternate for repeated views.",
          candidateKeys: [`fallback-hook/bond-effect-${family}/${selection.transiting}/variant-3`]
        },
        {
          id: "synastry-family",
          label: `${connectionLabel} family fallback`,
          scope: pairFamily ? `Used only if the exact ${selection.natalAspect} connection passage is missing.` : "Conjunction requires exact connection copy; it has no family fallback.",
          candidateKeys: familyCandidates
        },
        {
          id: "synastry-type",
          label: `${betweenYouTwoTitle(selection.natalAspect)} connection label`,
          scope: "Provides the small relationship-aspect tag when the connection is shown elsewhere.",
          candidateKeys: [`fallback-hook/synastry-aspect-type/${selection.natalAspect}`]
        }
      ]
    }
  ];
}

function replaceHolders(text: string, holder1: string, holder2: string) {
  return text
    .replaceAll("{{holder1}}'s", `${holder1}'s`)
    .replaceAll("{{holder2}}'s", `${holder2}'s`)
    .replaceAll("{{holder1}}", holder1)
    .replaceAll("{{holder2}}", holder2);
}

export function renderBetweenYouTwoPreview(
  selection: BetweenYouTwoSelection,
  resolve: (candidateKeys: string[]) => BetweenYouTwoSourceRecord | null,
  friendName = "Alisa"
) {
  const groups = betweenYouTwoSourceGroups(selection);
  const effect = resolve(groups[0].sources[0].candidateKeys);
  const connection = resolve(groups[0].sources[1].candidateKeys)
    ?? resolve(groups[1].sources.find((source) => source.id === "synastry-family")?.candidateKeys ?? []);
  const effectText = effect
    ? replaceHolders(selection.endpointOwner === "reader" ? effect.bodyYou : effect.bodyThey || effect.bodyYou, friendName, "you")
    : "This relationship-effect passage is missing. The card is omitted until an approved fallback is available.";
  const pair = synastryPlanets(selection);
  const connectionForward = connection?.key.includes(`/synastry-pair/${pair.reader}/${pair.friend}/`) ?? false;
  const connectionText = connection
    ? replaceHolders(connectionForward ? connection.bodyYou : connection.bodyThey || connection.bodyYou, connectionForward ? "you" : friendName, connectionForward ? friendName : "you")
    : "This activated connection is omitted because no approved exact or family passage is available.";
  const endpoint = selection.endpointOwner === "reader"
    ? `your ${betweenYouTwoTitle(selection.endpointPlanet)}`
    : `${friendName}'s ${betweenYouTwoTitle(selection.endpointPlanet)}`;
  const activated = selection.endpointOwner === "reader"
    ? `${friendName}'s ${betweenYouTwoTitle(selection.activatedPlanet)}`
    : `your ${betweenYouTwoTitle(selection.activatedPlanet)}`;
  const relation = selection.transitAspect === "conjunction" ? "conjunct" : selection.transitAspect === "opposition" ? "opposite" : selection.transitAspect;
  const calculatedFact = `${betweenYouTwoTitle(selection.transiting)} is ${relation} ${endpoint}, activating the connection it makes with ${activated}.`;

  return {
    headline: betweenYouTwoHeadline(selection, friendName),
    effectText,
    calculatedFact,
    connectionHeadline: `Your ${betweenYouTwoTitle(pair.reader)} ${selection.natalAspect === "conjunction" ? "conjunct" : selection.natalAspect === "opposition" ? "opposite" : selection.natalAspect} ${friendName}'s ${betweenYouTwoTitle(pair.friend)}`,
    connectionText,
    complete: Boolean(effect && connection),
    sourceKeys: [effect?.key, connection?.key].filter((key): key is string => Boolean(key))
  };
}
