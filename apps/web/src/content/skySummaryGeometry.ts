import { type MoonSummaryKind } from "./skyMoonSummary";

const signs = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
// Geometry for example selectors and validation only. Runtime positions still
// come from the ephemeris at the exact event timestamp.
export function pairedSummarySign(sign: string, kind: MoonSummaryKind): string {
  const index = signs.findIndex(value => value.toLowerCase() === sign.toLowerCase());
  if (index < 0) throw new Error(`Unknown Sky summary sign: ${sign}`);
  return signs[(index + (kind === "fullMoon" || kind === "lunarEclipse" ? 6 : 0)) % 12];
}
export function validSummaryGeometry(sun: string, moon: string, kind: MoonSummaryKind): boolean {
  if (!signs.some(sign => sign.toLowerCase() === sun.toLowerCase()) || !signs.some(sign => sign.toLowerCase() === moon.toLowerCase())) return false;
  return kind === "regular" || pairedSummarySign(sun, kind).toLowerCase() === moon.toLowerCase();
}
