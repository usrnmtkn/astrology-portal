import { fallbackV3HookBody } from "../content/fallbackArchitectureV3Runtime";

export type BetweenYouTwoV2Daily = {
  dateLabel: string;
  evidenceTier: "bond" | "shared-moon";
  headline: string;
  body: string;
  move: string | null;
  readerContext: string | null;
  friendContext: string | null;
  primaryBondTransitId: string | null;
  sourceKeys: string[];
};

type BondDirection = "you" | "they";
type BondFamily = "soft" | "hard";
type MoonElement = "fire" | "earth" | "air" | "water";

function fillFriend(value: string, friendName: string) {
  return value
    .replaceAll("{{holder1}}'s", `${friendName}'s`)
    .replaceAll("{{holder1}}", friendName)
    .trim();
}

export function betweenYouTwoV2BondReading({
  dateLabel,
  family,
  transiting,
  direction,
  friendName,
  primaryBondTransitId,
  readerContext = null,
  friendContext = null
}: {
  dateLabel: string;
  family: BondFamily;
  transiting: string;
  direction: BondDirection;
  friendName: string;
  primaryBondTransitId: string;
  readerContext?: string | null;
  friendContext?: string | null;
}): BetweenYouTwoV2Daily | null {
  const normalizedPlanet = transiting.trim().toLowerCase();
  const bodyKey = `fallback-hook/bond-effect-${family}/${normalizedPlanet}`;
  const headlineKey = `fallback-hook/pair-daily/v2/headline/${family}/${normalizedPlanet}/${direction}`;
  const moveKey = `fallback-hook/pair-daily/v2/move/${family}/${normalizedPlanet}/${direction}`;
  const voice = direction === "you" ? "you" : "they";
  const headline = fallbackV3HookBody(headlineKey, "you").trim();
  const body = fallbackV3HookBody(bodyKey, voice).trim();
  const move = fallbackV3HookBody(moveKey, "you").trim();

  // V2 fails closed as one governed unit. A canonical bond body alone is not
  // enough to opt a relationship into the new reader hierarchy until its
  // direction-specific headline and move have both been explicitly approved.
  if (!headline || !body || !move) return null;

  return {
    dateLabel,
    evidenceTier: "bond",
    headline: fillFriend(headline, friendName),
    body: fillFriend(body, friendName),
    move: fillFriend(move, friendName),
    readerContext,
    friendContext,
    primaryBondTransitId,
    sourceKeys: [headlineKey, bodyKey, moveKey]
  };
}

export function betweenYouTwoV2SharedMoonReading({
  dateLabel,
  element,
  readerContext = null,
  friendContext = null
}: {
  dateLabel: string;
  element: MoonElement;
  readerContext?: string | null;
  friendContext?: string | null;
}): BetweenYouTwoV2Daily | null {
  const headlineKey = `fallback-hook/pair-daily/v2/shared-moon/${element}/headline`;
  const bodyKey = `fallback-hook/pair-daily/v2/shared-moon/${element}/body`;
  const headline = fallbackV3HookBody(headlineKey, "you").trim();
  const body = fallbackV3HookBody(bodyKey, "you").trim();

  if (!headline || !body) return null;

  return {
    dateLabel,
    evidenceTier: "shared-moon",
    headline,
    body,
    move: null,
    readerContext,
    friendContext,
    primaryBondTransitId: null,
    sourceKeys: [headlineKey, bodyKey]
  };
}
