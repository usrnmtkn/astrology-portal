import type { DailyMoonContext } from "../../components/DailyMoonContextTags";
import type { NatalAspectPatternReaderItem } from "../../services/natalAspectPatterns";

export type FriendBondTransitView = {
  id: string;
  headline: string;
  effectBody: string;
  activationBody: string;
  transitPlanet?: string;
};

export type FriendHouseTransitView = {
  id: string;
  contentKey: string;
  transitPlanet: string;
  title: string;
  durationLabel: string | null;
  timingRange: string;
  rowSummary: string;
  termLabel: string;
  keywords: string[];
  house: number;
  houseLabel: string;
  detailAvailable: boolean;
};

export type FriendPersonalTransitEvidence = {
  transitPlanet: string;
  transitSign?: string;
  aspect: string;
  natalPoint: string;
  natalSign: string;
  natalHouse?: number;
  direction?: "applying" | "separating";
  score?: number;
  significance?: string;
  timingBonuses: string[];
  contentKeys: string[];
};

export type FriendPersonalTransitView = {
  id: string;
  title: string;
  durationLabel: string;
  rangeLabel: string;
  timingLabel: string;
  summary: string;
  orb: string;
  detailAvailable: boolean;
  evidence: FriendPersonalTransitEvidence;
};

export type FriendPersonalTransitGroup = {
  key: "short" | "long";
  label: string;
  transits: FriendPersonalTransitView[];
};

export type FriendDailyForecastView = {
  headline: string;
  body: string;
  moonContext: DailyMoonContext;
};

export type FriendTransitsBrief = {
  schema: "tldr.friend-transits-brief.v1";
  friendName: string;
  dateLabel: string;
  primaryThemes: FriendPersonalTransitView[];
  relationshipActivations: FriendBondTransitView[];
  houseContext: FriendHouseTransitView[];
  daily: {
    forecast: FriendDailyForecastView | null;
    doItems: string[];
    dontItems: string[];
  } | null;
  longerCycles: FriendPersonalTransitView[];
  activePatterns: NatalAspectPatternReaderItem[];
  hasAnyTransit: boolean;
  counts: {
    primaryThemes: number;
    relationshipActivations: number;
    houseContext: number;
    longerCycles: number;
    activePatterns: number;
  };
};

export function buildFriendTransitsBrief({
  friendName,
  dateLabel,
  personalTransitGroups,
  bondTransits,
  houseTransits,
  dailyForecast,
  dailyDoItems,
  dailyDontItems,
  patternItems
}: {
  friendName: string;
  dateLabel: string;
  personalTransitGroups: FriendPersonalTransitGroup[];
  bondTransits: FriendBondTransitView[];
  houseTransits: FriendHouseTransitView[];
  dailyForecast: FriendDailyForecastView | null;
  dailyDoItems: string[];
  dailyDontItems: string[];
  patternItems: NatalAspectPatternReaderItem[];
}): FriendTransitsBrief {
  const primaryThemes = personalTransitGroups
    .find((group) => group.key === "short")
    ?.transits.filter((transit) => transit.detailAvailable) ?? [];
  const longerCycles = personalTransitGroups
    .find((group) => group.key === "long")
    ?.transits.filter((transit) => transit.detailAvailable) ?? [];
  const houseContext = houseTransits.filter((transit) => transit.detailAvailable);
  const activePatterns = patternItems.filter((item) => Boolean(item.activationCopy));
  const hasDailyGuidance = dailyDoItems.length === 3 && dailyDontItems.length === 3;
  const daily = dailyForecast || hasDailyGuidance
    ? {
        forecast: dailyForecast,
        doItems: hasDailyGuidance ? [...dailyDoItems] : [],
        dontItems: hasDailyGuidance ? [...dailyDontItems] : []
      }
    : null;
  const counts = {
    primaryThemes: primaryThemes.length,
    relationshipActivations: bondTransits.length,
    houseContext: houseContext.length,
    longerCycles: longerCycles.length,
    activePatterns: activePatterns.length
  };

  return {
    schema: "tldr.friend-transits-brief.v1",
    friendName,
    dateLabel,
    primaryThemes,
    relationshipActivations: [...bondTransits],
    houseContext,
    daily,
    longerCycles,
    activePatterns,
    hasAnyTransit: Boolean(daily)
      || Object.values(counts).some((count) => count > 0),
    counts
  };
}
