import type { LocationInput, SkySnapshot } from "../types";
import { displayTimeToTwentyFourHour } from "./chartTime";
import type { TldrAstroChartSettings, TldrAstroSubject } from "./tldrastroApi";

type ChartProfileInput = {
  name?: string | null;
};

type ChartBirthInput = {
  birthDate?: string | null;
  birthTime?: string | null;
  birthLocation?: LocationInput | null;
};

type ChartSettingsInput = {
  aspects?: string | null;
};

export function zodiacFromBirthDate(value: string) {
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const slashMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const monthValue = isoMatch?.[2] ?? slashMatch?.[1] ?? "";
  const dayValue = isoMatch?.[3] ?? slashMatch?.[2] ?? "";
  const month = Number(monthValue);
  const day = Number(dayValue);

  if (!month || !day) {
    return "Gemini";
  }

  const signStarts = [
    { sign: "Capricorn", month: 1, day: 1 },
    { sign: "Aquarius", month: 1, day: 20 },
    { sign: "Pisces", month: 2, day: 19 },
    { sign: "Aries", month: 3, day: 21 },
    { sign: "Taurus", month: 4, day: 20 },
    { sign: "Gemini", month: 5, day: 21 },
    { sign: "Cancer", month: 6, day: 21 },
    { sign: "Leo", month: 7, day: 23 },
    { sign: "Virgo", month: 8, day: 23 },
    { sign: "Libra", month: 9, day: 23 },
    { sign: "Scorpio", month: 10, day: 23 },
    { sign: "Sagittarius", month: 11, day: 22 },
    { sign: "Capricorn", month: 12, day: 22 }
  ];

  return signStarts.reduce((currentSign, item) => (
    month > item.month || (month === item.month && day >= item.day) ? item.sign : currentSign
  ), "Capricorn");
}

function planetSignFromSky(sky: SkySnapshot, planet: string) {
  return sky.positions.find((position) => position.planet === planet)?.sign ?? "";
}

export function natalBigThreeFromSky(sky: SkySnapshot, unknownBirthTime: boolean) {
  return {
    sun: planetSignFromSky(sky, "Sun") || sky.positions[0]?.sign || "Sun pending",
    moon: planetSignFromSky(sky, "Moon") || "Moon pending",
    rising: unknownBirthTime ? "Rising pending" : sky.ascendant
  };
}

export function validChartBirthDate(chart?: ChartBirthInput) {
  const value = chart?.birthDate?.trim() ?? "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const [, month = "", day = "", year = ""] = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/) ?? [];

  if (!month || !day || !year) {
    return "";
  }

  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export function validChartBirthTime(chart?: ChartBirthInput) {
  return chart?.birthTime && chart.birthTime !== "Birth time needed" ? chart.birthTime : "";
}

export function apiSettingsFromChartSettings(
  settings?: ChartSettingsInput | null
): TldrAstroChartSettings {
  return {
    houseSystem: "whole_sign",
    zodiac: "tropical",
    aspectProfile: settings?.aspects === "Tight" ? "tight" : "standard"
  };
}

export function apiSubjectFromUserChart(
  profile: ChartProfileInput,
  chart: ChartBirthInput | undefined,
  settings?: ChartSettingsInput | null
): TldrAstroSubject | null {
  const birthDate = validChartBirthDate(chart);
  const birthTime = validChartBirthTime(chart);
  const birthLocation = chart?.birthLocation?.timeZone
    ? chart.birthLocation
    : null;

  if (!birthDate || !birthTime || !birthLocation) {
    return null;
  }

  const timeKnown = birthTime !== "Time unknown";

  return {
    name: profile.name,
    datetime: {
      date: birthDate,
      time: timeKnown ? displayTimeToTwentyFourHour(birthTime) : "12:00",
      timeKnown,
      timeZone: birthLocation.timeZone
    },
    location: birthLocation,
    settings: apiSettingsFromChartSettings(settings)
  };
}
