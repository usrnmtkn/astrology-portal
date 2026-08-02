import { pointGlyph, signGlyph } from "../../components/charts/chartAssets";
import type { SocialPlacementRow } from "../../components/charts/PlacementRows";
import {
  displayTimeToTwentyFourHour,
  twentyFourHourTimeToDisplay
} from "../../services/chartTime";
import { isSocialFriendChart } from "../../services/socialFriends";
import type { ManualChart } from "../../services/manualCharts";
import type {
  TldrAstroChartSettings,
  TldrAstroSubject
} from "../../services/tldrastroApi";
import type { PlanetPosition, SkySnapshot } from "../../types";
import { compactCityLabel } from "../../utils/locationLabels";

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
