// Topic navigation selects calculated chart facts. Shared editorial passages
// and private chart-specific overrides each retain their publication boundary.
import { natalInsightTopics, natalInsightSigns, natalInsightContentKey, natalInsightGuideKey, type NatalInsightId } from "./natalInsightDefinitions.js";
import { parseNatalInsightCombinationKey } from "./natalInsightCombination.js";
export { natalInsightTopics, natalInsightSigns, natalInsightContentKey, natalInsightGuideKey, type NatalInsightId } from "./natalInsightDefinitions.js";

export const natalInsightPassageGroups = [...natalInsightTopics.map(topic => topic.id), "sun-purpose", "ruler-sign", "ruler-house", "daily-work", "midheaven"] as const;
export type NatalInsightPassageGroup = typeof natalInsightPassageGroups[number];
export function natalInsightTemplateKey(topic: NatalInsightId, audience: "you" | "friend", untimed = false) {
  return `${natalInsightContentKey(topic, audience)}/reading${untimed ? "/untimed" : ""}`;
}
export function natalInsightPassageKey(group: NatalInsightPassageGroup, value: string | number) {
  return `cms/natal-insight/passage/${group}/${String(value).toLowerCase()}`;
}
export const natalInsightRulerPlanets = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"] as const;
export const natalInsightRuledHouses = [1, 2, 4, 5, 6, 10] as const;
export type NatalInsightRuledHouse = typeof natalInsightRuledHouses[number];
export function natalInsightRulerPlacementKey(audience: "you" | "friend", planet: string, sign: string, sourceHouse?: NatalInsightRuledHouse) {
  return `cms/natal-insight/passage/ruler-placement/${audience === "friend" ? "they" : "you"}/${sourceHouse ? `${sourceHouse}/` : ""}${planet.toLowerCase()}/${sign.toLowerCase()}`;
}
export function natalInsightHouseConnectionKey(audience: "you" | "friend", sourceHouse: number, destinationHouse: number) {
  return `cms/natal-insight/passage/house-connection/${audience === "friend" ? "they" : "you"}/${sourceHouse}/${destinationHouse}`;
}
export const natalInsightOptionalSlots = ["insightCreativity", "insightMidheaven"];
// Facts for editable headings. These never contain interpretation prose.
export const natalInsightFactSlots = [
  "insightHouseSign", "insightRulerName", "insightRulerSignName", "insightRulerHouseName",
  "insightDailyWorkSign", "insightDailyWorkRulerName", "insightDailyWorkRulerSignName", "insightDailyWorkRulerHouseName",
  "insightResourcesSign", "insightResourcesRulerName", "insightResourcesRulerSignName", "insightResourcesRulerHouseName",
  "insightSunSign", "insightMoonSign", "insightVenusSign", "insightCreativitySign", "insightMidheavenSign"
] as const;
export const natalInsightTemplateSlots = ["subject", "Subject", "possessive", "Possessive", "object", "insightIsYou", "insightPrimary", "insightSunPurpose", "insightMoonNeeds", "insightVenusStyle", "insightCreativity", "insightResources", "insightDailyWork", "insightMidheaven", "insightRulerSign", "insightRulerHouse", "insightDailyWorkRuler", "insightDailyWorkConnection", "insightResourcesRuler", "insightResourcesConnection", ...natalInsightFactSlots];
export const natalInsightPassageSlots = ["subject", "Subject", "possessive", "Possessive", "object", "rulerName", "anchor", "insightIsYou"];
/** Editable source prefixes for each full-passage template slot. */
export function natalInsightSlotGroups(topic: NatalInsightId, untimed = false, audience: "you" | "friend" = "you"): Record<string, string> {
  const viewer = audience === "friend" ? "they" : "you";
  const rulerSlots = (house: number) => ({ insightRulerSign: `ruler-placement/${viewer}`, insightRulerHouse: `house-connection/${viewer}/${house}` });
  if (topic === "approach") return untimed ? { insightPrimary: "sun-purpose", insightMoonNeeds: "emotional-needs" }
    : { insightPrimary: topic, insightSunPurpose: "sun-purpose", ...rulerSlots(1) };
  if (topic === "emotional-needs") return { insightPrimary: topic, insightSunPurpose: "sun-purpose" };
  if (topic === "style-expression") return { insightPrimary: topic, insightMoonNeeds: "emotional-needs", insightCreativity: "creativity-pleasure" };
  const house = { "home-belonging": 4, "creativity-pleasure": 5, "money-resources": 2, "work-direction": 10 }[topic];
  return { insightPrimary: topic, ...rulerSlots(house),
    ...(topic === "creativity-pleasure" ? { insightVenusStyle: "style-expression" } : {}),
    ...(topic === "work-direction" ? { insightDailyWork: "daily-work", insightResources: "money-resources", insightMidheaven: "midheaven",
      insightDailyWorkRuler: `ruler-placement/${viewer}`, insightDailyWorkConnection: `house-connection/${viewer}/6`,
      insightResourcesRuler: `ruler-placement/${viewer}`, insightResourcesConnection: `house-connection/${viewer}/2` } : {}) };
}

// Only known shared templates/passages and canonical combinations may publish. A private
// chart fingerprint or a look-alike prefix must never enter this exception.
export function isNatalInsightContentKey(contentKey: string | null | undefined) {
  if (!contentKey) return false;
  return Boolean(parseNatalInsightCombinationKey(contentKey)) || contentKey === natalInsightGuideKey("approach", true) || natalInsightTopics.some(topic => (["you", "friend"] as const).some(audience => (
    natalInsightContentKey(topic.id, audience) === contentKey
    || natalInsightTemplateKey(topic.id, audience) === contentKey
    || (topic.id === "approach" && natalInsightTemplateKey(topic.id, audience, true) === contentKey)
  ))) || natalInsightPassageGroups.some(group => (group === "ruler-house"
    ? Array.from({ length: 12 }, (_, i) => i + 1) : natalInsightSigns)
    .some(value => natalInsightPassageKey(group, value) === contentKey))
    || (["you", "friend"] as const).some(audience =>
      natalInsightRulerPlanets.some(planet => natalInsightSigns.some(sign => natalInsightRulerPlacementKey(audience, planet, sign) === contentKey
        || natalInsightRuledHouses.some(house => natalInsightRulerPlacementKey(audience, planet, sign, house) === contentKey)))
      || natalInsightRuledHouses.some(source => Array.from({ length: 12 }, (_, i) => i + 1).some(destination => natalInsightHouseConnectionKey(audience, source, destination) === contentKey)));
}
