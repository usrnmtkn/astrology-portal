// Topic navigation selects calculated chart facts. Shared editorial passages
// and private chart-specific overrides each retain their publication boundary.
export const natalInsightTopics = [
  { id: "approach", title: "Your approach to life", friendTitle: "Approach to life", planets: ["Sun", "Ascendant"], houses: [], chartRuler: true },
  { id: "emotional-needs", title: "Emotional needs", planets: ["Moon", "Sun"], houses: [] },
  { id: "home-belonging", title: "Home & belonging", planets: ["Imum Coeli", "IC"], houses: [4] },
  { id: "creativity-pleasure", title: "Creativity & pleasure", planets: ["Venus"], houses: [5] },
  { id: "style-expression", title: "Style & self-expression", planets: ["Venus", "Ascendant", "Moon"], houses: [5] },
  { id: "money-resources", title: "Money & resources", planets: [], houses: [2] },
  { id: "work-direction", title: "Work & direction", planets: ["Midheaven", "MC"], houses: [2, 6, 10] }
] as const;


export type NatalInsightId = typeof natalInsightTopics[number]["id"];
export function natalInsightContentKey(topicId: NatalInsightId, audience: "you" | "friend") {
  return `cms/natal-insight/${audience === "friend" ? "they" : "you"}/${topicId}`;
}

/** One full guide is shared by the You and Friends reading pages. */
export function natalInsightGuideKey(topicId: NatalInsightId, untimed = false) {
  return `${natalInsightContentKey(topicId, "you")}${topicId === "approach" && untimed ? "/untimed" : ""}`;
}

export const natalInsightSigns = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"] as const;
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

// Only enumerated shared templates/passages are publishable globally. A private
// chart fingerprint or a look-alike prefix must never enter this exception.
export function isNatalInsightContentKey(contentKey: string | null | undefined) {
  if (!contentKey) return false;
  return contentKey === natalInsightGuideKey("approach", true) || natalInsightTopics.some(topic => (["you", "friend"] as const).some(audience => (
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
