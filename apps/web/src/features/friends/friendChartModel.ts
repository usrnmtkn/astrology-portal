import { pointGlyph, signGlyph } from "../../components/charts/chartAssets";
import { profileInitials } from "../../components/ProfileAvatar";
import type { SocialPlacementRow } from "../../components/charts/PlacementRows";
import { natalBigThreeFromSky, zodiacFromBirthDate } from "../../services/chartProfile";
import {
  displayTimeToTwentyFourHour,
  twentyFourHourTimeToDisplay
} from "../../services/chartTime";
import { isSocialFriendChart } from "../../services/socialFriends";
import { manualChartNeedsBirthTime } from "../../services/manualCharts";
import type { ManualChart } from "../../services/manualCharts";
import { natalAspectPatternPillSummary } from "../../services/natalAspectPatterns";
import type { NatalAspectPatternPillSummary } from "../../services/natalAspectPatterns";
import type {
  TldrAstroChartSettings,
  TldrAstroSubject
} from "../../services/tldrastroApi";
import { groupAspectsByGiftLesson } from "../../services/aspectGiftLesson";
import { uniqueDisplayableNatalAspects } from "../../services/natalAspectDisplay";
import type { PlanetPosition, SkySnapshot } from "../../types";
import { compactCityLabel } from "../../utils/locationLabels";
import type { RelationshipComparisonOption } from "./RelationshipComparePicker";

export type FriendChartListItem = {
  chart: ManualChart;
  initials: string;
  sun: string;
  moon: string;
  rising: string;
  needsBirthTime: boolean;
  active: boolean;
  patternSummary: NatalAspectPatternPillSummary | null;
};

const socialBigThreeLabels = new Set(["Sun", "Moon", "Ascendant"]);

export function isSocialBigThreeRow(row: SocialPlacementRow) {
  return socialBigThreeLabels.has(row.label);
}

export function planetPositionFromSocialRow(
  row: SocialPlacementRow,
  sky: SkySnapshot
): PlanetPosition | null {
  const existingPosition = sky.positions.find((position) => position.planet === row.label);

  if (existingPosition) {
    return existingPosition;
  }

  if (row.label !== "Ascendant") {
    return null;
  }

  const glyph = signGlyph(row.sign);

  return {
    planet: "Ascendant",
    glyph: row.glyph || pointGlyph("Ascendant"),
    sign: row.sign,
    signGlyph: glyph ? `${glyph}\uFE0E` : "",
    degree: row.degree,
    house: row.house ?? 0,
    motion: "direct"
  };
}

function formatManualChartBirthDate(value: string) {
  const [, year = "", month = "", day = ""] = value.match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? [];
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  if (!year || Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}

export function manualChartSubtitle(chart: ManualChart) {
  if (isSocialFriendChart(chart)) {
    return `${chart.notes ?? "Connected friend"} · Connected friend`;
  }

  const birthTime = chart.birthTimeUnknown
    ? "Time unknown"
    : twentyFourHourTimeToDisplay(chart.birthTime ?? "12:00");
  const dateTimePlace = [
    formatManualChartBirthDate(chart.birthDate),
    birthTime,
    compactCityLabel(chart.birthPlace)
  ].join(" · ");

  return chart.chartType === "event" ? `Event · ${dateTimePlace}` : dateTimePlace;
}

export function manualChartBigThree(chart: ManualChart) {
  if (!chart.natalChart) {
    return {
      sun: zodiacFromBirthDate(chart.birthDate),
      moon: "Moon pending",
      rising: "Rising pending"
    };
  }

  return natalBigThreeFromSky(chart.natalChart, chart.birthTimeUnknown);
}

export function buildFriendChartListItems(
  charts: ManualChart[],
  selectedChartId: string | null,
  showNatalAspectPatterns: boolean
): FriendChartListItem[] {
  return charts.map((chart) => {
    const bigThree = manualChartBigThree(chart);

    return {
      chart,
      initials: profileInitials(chart.displayName, chart.displayName),
      sun: bigThree.sun,
      moon: bigThree.moon,
      rising: bigThree.rising,
      needsBirthTime: manualChartNeedsBirthTime(chart),
      active: selectedChartId === chart.id,
      patternSummary: showNatalAspectPatterns && chart.chartType === "person"
        ? natalAspectPatternPillSummary(chart.natalChart)
        : null
    };
  });
}

export function buildRelationshipComparisonOptions({
  allFriendCharts,
  profileEmail,
  profileName,
  profileNatalSky,
  selectedChartId
}: {
  allFriendCharts: ManualChart[];
  profileEmail: string;
  profileName: string;
  profileNatalSky: SkySnapshot | null;
  selectedChartId: string | null;
}): RelationshipComparisonOption[] {
  const selfOption: RelationshipComparisonOption = {
    id: "self",
    displayName: "You",
    initials: profileInitials(profileName, profileEmail),
    subtitle: profileNatalSky ? "Your birth chart" : "Birth chart pending",
    natalChart: profileNatalSky,
    isSelf: true
  };
  const chartOptions = allFriendCharts
    .filter((chart) => chart.id !== selectedChartId && chart.chartType !== "event")
    .map((chart) => ({
      id: chart.id,
      displayName: chart.displayName,
      initials: profileInitials(chart.displayName, chart.displayName),
      subtitle: manualChartSubtitle(chart),
      natalChart: chart.natalChart ?? null,
      isSelf: false
    }));

  return [selfOption, ...chartOptions];
}

export function apiSubjectFromManualChart(
  chart: ManualChart | null | undefined,
  settings: TldrAstroChartSettings
): TldrAstroSubject | null {
  if (!chart?.birthDate || !chart.birthLocation?.timeZone) {
    return null;
  }

  const timeKnown = !chart.birthTimeUnknown && Boolean(chart.birthTime);

  return {
    name: chart.displayName,
    datetime: {
      date: chart.birthDate,
      time: timeKnown ? displayTimeToTwentyFourHour(chart.birthTime) : "12:00",
      timeKnown,
      timeZone: chart.birthLocation.timeZone
    },
    location: chart.birthLocation,
    settings
  };
}

export function groupFriendNatalAspects(aspects: SkySnapshot["aspects"]) {
  return groupAspectsByGiftLesson(
    uniqueDisplayableNatalAspects(aspects),
    (aspect) => aspect.type,
    (aspect) => aspect.orb
  );
}
