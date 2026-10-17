import type { SkySnapshot } from "../../types";
import { normalizeSkyBodyName } from "../../astrologyConfig";
import { isDisplayRetrograde } from "../../services/astrologyDisplay";
import { pointGlyph, zodiacSignIconFiles } from "./chartAssets";

export type SocialPlacementRow = {
  id: string;
  glyph: string;
  label: string;
  sign: string;
  degree: number;
  house: number | null;
  retrograde: boolean;
  description?: string;
  detailAvailable?: boolean;
};


const socialPlacementOrder = [
  "Sun",
  "Moon",
  "Ascendant",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
  "Pluto",
  "Chiron",
  "Lilith",
  "North Node",
  "South Node",
  "Midheaven"
];

function normalizedAngle(value: number) {
  return ((value % 360) + 360) % 360;
}

function wholeSignHouseForSign(sign: string, ascendant: string) {
  const zodiacSigns = [
    "Aries",
    "Taurus",
    "Gemini",
    "Cancer",
    "Leo",
    "Virgo",
    "Libra",
    "Scorpio",
    "Sagittarius",
    "Capricorn",
    "Aquarius",
    "Pisces"
  ];
  const signIndex = zodiacSigns.indexOf(sign);
  const ascendantIndex = zodiacSigns.indexOf(ascendant);

  if (signIndex < 0 || ascendantIndex < 0) {
    return null;
  }

  return ((signIndex - ascendantIndex + 12) % 12) + 1;
}

export function socialPlacementRows(sky: SkySnapshot | null): SocialPlacementRow[] {
  if (!sky) {
    return [];
  }

  const positionMap = new Map(sky.positions.map((position) => [normalizeSkyBodyName(position.planet), position]));

  return socialPlacementOrder.flatMap((point) => {
    if (point === "Ascendant" || point === "Midheaven") {
      const sign = point === "Ascendant" ? sky.ascendant : sky.midheaven;
      const longitude = point === "Ascendant" ? sky.ascendantLongitude : sky.midheavenLongitude;

      // Unknown birth times do not provide reliable angles, even in older cached snapshots.
      if (sky.birthTimeKnown === false || !Object.hasOwn(zodiacSignIconFiles, sign)
        || typeof longitude !== "number" || !Number.isFinite(longitude)) {
        return [];
      }

      return [{
        id: point,
        glyph: point === "Ascendant" ? pointGlyph(point) : "MC",
        label: point,
        sign,
        degree: normalizedAngle(longitude) % 30,
        house: point === "Midheaven" && sky.ascendant ? wholeSignHouseForSign(sign, sky.ascendant) : null,
        retrograde: false
      }];
    }

    const position = positionMap.get(point);

    if (!position) {
      return [];
    }

    return [{
      id: normalizeSkyBodyName(position.planet),
      glyph: position.glyph || pointGlyph(point),
      label: normalizeSkyBodyName(position.planet),
      sign: position.sign,
      degree: position.degree,
      house: position.house || null,
      retrograde: isDisplayRetrograde(position)
    }];
  });
}

