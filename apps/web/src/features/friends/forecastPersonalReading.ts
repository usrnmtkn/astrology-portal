import type { TransitItem } from "../../App";
import type { NatalTransitTiming } from "../../services/ephemeris";
import type { ForecastContact } from "../../services/relationshipForecast";
import { zodiacSignForLongitude } from "../../services/chartMath";
import { transitAspectDefinitions } from "../../astrologyConfig";
import { fallbackV3ApprovalLevelForContentKey, transitV3AuthoredCardForContentKey } from "../../content/fallbackArchitectureV3Runtime";
import { isFriendsAcceptedApprovalLevel } from "../../content/fallbackApproval";
import { connectionTransitReading } from "./connectionTransitReading";

export type ForecastNormalizer = (transit: TransitItem, at: string, voice?: string) => {
  sections: Array<{ slot?: string; body: string; sourceKeys: string[] }>;
};

/** Select the same published personal source as You/Friends. Do not adapt its
 * wording into a relationship interpretation or reuse another planet pair. */
export function forecastPersonalReading(contact: ForecastContact, timing: NatalTransitTiming, friendName: string, timeZone: string, normalize: ForecastNormalizer) {
  const voice = contact.owner === "reader" ? "you" : friendName;
  const end = new Date(timing.currentEnd);
  if (!Number.isFinite(+end)) return null;
  const window = `until ${end.toLocaleDateString("en-US", { timeZone, month: "long", day: "numeric", year: "numeric" })}`;
  const transit: TransitItem = { id: `${contact.planet}-${contact.aspect}-${contact.target}`.toLowerCase().replaceAll(" ","-"),
    term: "short", glyph: "", transitPlanet: contact.planet, transitSign: zodiacSignForLongitude(contact.transitLongitude),
    transitMotion: contact.retrograde ? "retrograde" : "direct",
    natalPoint: contact.target, natalSign: zodiacSignForLongitude(contact.targetLongitude), natalLongitude: contact.targetLongitude,
    aspect: contact.aspect, aspectDegrees: transitAspectDefinitions.find(a=>a.type === contact.aspect)?.exact,
    orb: String(contact.orb), arc: [], note: "", timing, reportWindowLabel: window, timeZone };
  const section = normalize(transit,contact.peakAt,voice).sections.find(s=>s.slot === "meaning");
  if (!section) return null;
  const token = (value:string)=>value.toLowerCase().replaceAll(" ","-");
  if (contact.aspect === "conjunction" && contact.planet === contact.target) {
    const key = `authored/transit-return/${token(contact.planet)}`;
    return section.sourceKeys.includes(key) && isFriendsAcceptedApprovalLevel(fallbackV3ApprovalLevelForContentKey(key))
      ? { body:section.body, contentKey:key } : null;
  }
  return connectionTransitReading({transiting:token(contact.planet),natal:token(contact.target),aspect:contact.aspect,voice,window},
    transitV3AuthoredCardForContentKey,section.sourceKeys);
}
