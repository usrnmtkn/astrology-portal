import type { SkySnapshot } from "../types";
import { natalSectForSnapshot } from "../../../../src/shared/solarHorizon.js";
import { emptyHouseRulersBySystem } from "./emptyHouseRulership";
import { renderGeneratedContentTemplate, type LiveGeneratedContent } from "../services/generatedContent";

const signs = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
const sectPlanets = new Set(["jupiter", "venus", "mars", "saturn"]);
export type NatalReadingAudience = "you" | "they";
export type NatalReading = { contentKey: string; label: string };
export type NatalPlanetReadingContext = {
  snapshot: SkySnapshot;
  audience: NatalReadingAudience;
  ownerName?: string;
  planet: string;
};

/** Fixed natal facts select complete published units; current transits never enter. */
export function natalChartReadings(snapshot: SkySnapshot | null | undefined, audience: NatalReadingAudience, planet?: string): NatalReading[] {
  if (!snapshot || snapshot.birthTimeKnown !== true) return [];
  const sect = natalSectForSnapshot(snapshot);
  const chartLabel = sect === "day" ? "Day chart" : "Night chart";
  if (planet) {
    const key = planet.toLowerCase();
    return sect && sectPlanets.has(key) && snapshot.positions.some(position => position.planet.toLowerCase() === key)
      ? [{ contentKey: `cms/natal-planet-sect/${audience}/${key}/${sect}`, label: chartLabel }] : [];
  }
  const readings: NatalReading[] = sect
    ? [{ contentKey: `cms/natal-chart-context/${audience}/sect/${sect}`, label: chartLabel }] : [];
  const ascendant = signs.indexOf(snapshot.ascendant.toLowerCase());
  if (ascendant < 0) return readings;
  const twelfthSign = signs[(ascendant + 11) % 12];
  const ruler = emptyHouseRulersBySystem.traditional[twelfthSign];
  const rulerPosition = snapshot.positions.find(position => position.planet.toLowerCase() === ruler);
  const rulerSign = signs.indexOf(rulerPosition?.sign.toLowerCase() ?? "");
  if (rulerSign < 0) return readings;
  const rulerHouse = ((rulerSign - ascendant + 12) % 12) + 1;
  return [...readings,
    { contentKey: `cms/natal-twelfth-ruler/${audience}/introduction`, label: "Understanding Undoing" },
    { contentKey: `cms/natal-twelfth-ruler/${audience}/ruler-house/${rulerHouse}`, label: `Twelfth-house ruler in the ${rulerHouse}${rulerHouse === 1 ? "st" : rulerHouse === 2 ? "nd" : rulerHouse === 3 ? "rd" : "th"} house` }
  ];
}

/** Preserve the saved body, including repeated paragraphs. Only declared slots change. */
export function natalReadingBody(row: LiveGeneratedContent | undefined, audience: NatalReadingAudience, ownerName?: string): string | null {
  if (!row || row.status !== "LIVE" || row.lane !== "serving" || row.reviewState) return null;
  if (audience === "they" && !ownerName?.trim()) return null;
  return renderGeneratedContentTemplate(row, audience === "they" ? { ownerName: ownerName!.trim() } : {})?.body || null;
}
