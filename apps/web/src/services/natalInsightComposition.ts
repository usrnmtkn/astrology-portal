import type { SkySnapshot } from "../types";
import { natalInsightRulerPlacementKey, natalInsightHouseConnectionKey, type NatalInsightRuledHouse, natalInsightPassageKey, natalInsightTemplateKey, natalInsightSigns, type NatalInsightId, type NatalInsightPassageGroup } from "../content/natalInsightCatalog";
import { traditionalSignRulers } from "../content/skySunSeason";
import { wholeSignHouseForSign } from "./chartMath";
import { resolveCmsSurfaceOverride, type CmsGeneratedContentMap } from "../content/cmsSurfaceOverrides";
import type { TemplateSlotValues } from "./templateInterpolation";
import { natalInsightBirthTimeKnown } from "./natalInsightNavigation";
export { natalInsightBirthTimeKnown } from "./natalInsightNavigation";

type PassageSelection = { slot: string; key: string; contextualKey?: string; slots?: TemplateSlotValues };
export type NatalInsightCompositionPlan = {
  templateKey: string; passages: PassageSelection[]; slots: TemplateSlotValues;
  unavailable: "birth-time" | "chart-facts" | null;
};

/** Fact selection only: no reader prose, generated text, or example birth data. */
export function natalInsightCompositionPlan(topic: NatalInsightId, sky: SkySnapshot, birthTimeKnown: boolean, audience: "you" | "friend" = "you"): NatalInsightCompositionPlan {
  const validSign = (sign?: string): sign is typeof natalInsightSigns[number] => natalInsightSigns.some(value => value === sign);
  const known = natalInsightBirthTimeKnown(sky, birthTimeKnown);
  const signOf = (planet: string) => sky.positions.find(p => p.planet.toLowerCase() === planet.toLowerCase())?.sign;
  const houseSign = (house: number) => known ? natalInsightSigns[(natalInsightSigns.indexOf(sky.ascendant as typeof natalInsightSigns[number]) + house - 1) % 12] : undefined;
  const plan: NatalInsightCompositionPlan = {
    templateKey: natalInsightTemplateKey(topic, audience, topic === "approach" && !known), passages: [], unavailable: null,
    slots: audience === "you" ? { subject: "you", Subject: "You", possessive: "your", Possessive: "Your", object: "you", insightIsYou: true }
      : { subject: "they", Subject: "They", possessive: "their", Possessive: "Their", object: "them", insightIsYou: false }
  };
  for (const planet of ["Sun", "Moon", "Venus"] as const) {
    const sign = signOf(planet);
    if (validSign(sign)) plan.slots[`insight${planet}Sign`] = sign;
  }
  const select = (slot: string, group: NatalInsightPassageGroup, sign: string | undefined, optional = false) => {
    if (!validSign(sign)) { if (!optional) plan.unavailable = "chart-facts"; return; }
    plan.passages.push({ slot, key: natalInsightPassageKey(group, sign) });
  };
  const ruler = (sourceHouse: NatalInsightRuledHouse, signSlot = "insightRulerSign", houseSlot = "insightRulerHouse", factPrefix = "insight") => {
    const sign = houseSign(sourceHouse);
    if (!known || !validSign(sign)) { plan.unavailable = "chart-facts"; return; }
    const name = traditionalSignRulers[sign.toLowerCase()];
    const rulerSign = signOf(name ?? "");
    if (!name || !validSign(rulerSign)) { plan.unavailable = "chart-facts"; return; }
    const rulerName = `${name === "sun" || name === "moon" ? "The " : ""}${name.charAt(0).toUpperCase() + name.slice(1)}`;
    // Follow the app's whole-sign house model, without substituting the MC.
    const house = wholeSignHouseForSign(rulerSign, sky.ascendant);
    if (!house) { plan.unavailable = "chart-facts"; return; }
    plan.slots[factPrefix === "insight" ? "insightHouseSign" : `${factPrefix}Sign`] = sign;
    plan.slots[`${factPrefix}RulerName`] = name.charAt(0).toUpperCase() + name.slice(1);
    plan.slots[`${factPrefix}RulerSignName`] = rulerSign;
    plan.slots[`${factPrefix}RulerHouseName`] = `${house}${house === 1 ? "st" : house === 2 ? "nd" : house === 3 ? "rd" : "th"} house`;
    plan.passages.push({ slot: signSlot, key: natalInsightRulerPlacementKey(audience, name, rulerSign),
      contextualKey: natalInsightRulerPlacementKey(audience, name, rulerSign, sourceHouse) });
    plan.passages.push({ slot: houseSlot, key: natalInsightHouseConnectionKey(audience, sourceHouse, house), slots: { rulerName } });
  };
  if (["home-belonging", "creativity-pleasure", "money-resources", "work-direction"].includes(topic) && !known) {
    plan.unavailable = "birth-time";
    return plan;
  }
  switch (topic) {
    case "approach":
      if (known) {
        select("insightPrimary", topic, sky.ascendant);
        select("insightSunPurpose", "sun-purpose", signOf("Sun"));
        ruler(1);
      } else {
        select("insightPrimary", "sun-purpose", signOf("Sun"));
        select("insightMoonNeeds", "emotional-needs", signOf("Moon"));
      }
      break;
    case "emotional-needs":
      select("insightPrimary", topic, signOf("Moon"));
      select("insightSunPurpose", "sun-purpose", signOf("Sun"));
      break;
    case "style-expression":
      select("insightPrimary", topic, signOf("Venus"));
      select("insightMoonNeeds", "emotional-needs", signOf("Moon"));
      if (known) {
        select("insightCreativity", "creativity-pleasure", houseSign(5));
        plan.slots.insightCreativitySign = houseSign(5);
      }
      break;
    case "home-belonging":
    case "creativity-pleasure":
    case "money-resources":
    case "work-direction": {
      const house = { "home-belonging": 4, "creativity-pleasure": 5, "money-resources": 2, "work-direction": 10 }[topic];
      select("insightPrimary", topic, houseSign(house));
      ruler(house as NatalInsightRuledHouse);
      if (topic === "creativity-pleasure") select("insightVenusStyle", "style-expression", signOf("Venus"));
      if (topic === "work-direction") {
        select("insightDailyWork", "daily-work", houseSign(6));
        ruler(6, "insightDailyWorkRuler", "insightDailyWorkConnection", "insightDailyWork");
        select("insightResources", "money-resources", houseSign(2));
        ruler(2, "insightResourcesRuler", "insightResourcesConnection", "insightResources");
        const longitude = sky.midheavenLongitude;
        const mc = Number.isFinite(longitude) ? natalInsightSigns[Math.floor((((longitude! % 360) + 360) % 360) / 30)] : signOf("Midheaven") ?? signOf("MC");
        select("insightMidheaven", "midheaven", mc, true);
        if (validSign(mc)) plan.slots.insightMidheavenSign = mc;
      }
      break;
    }
  }
  return plan;
}

export function natalInsightCompositionKeys(plan: NatalInsightCompositionPlan) {
  return plan.unavailable ? [] : [...new Set([plan.templateKey, ...plan.passages.flatMap(p => p.contextualKey ? [p.contextualKey, p.key] : [p.key])])];
}

/** Reader-safe map only. A missing/retired dependency prevents partial essays. */
export function composeNatalInsight(plan: NatalInsightCompositionPlan, content: CmsGeneratedContentMap) {
  if (plan.unavailable) return null;
  const slots = { ...plan.slots };
  const sourceKeys: string[] = [];
  const resolve = (key: string, values: TemplateSlotValues) => {
    if (content.get(key)?.status !== "LIVE") return null;
    const resolved = resolveCmsSurfaceOverride(content, [key], values);
    if (!resolved?.body || resolved.unavailable || /\{\{|\}\}/u.test(resolved.body)) return null;
    sourceKeys.push(key);
    return resolved.body;
  };
  for (const passage of plan.passages) {
    const values = { ...plan.slots, ...passage.slots };
    // A reviewed house-specific passage replaces the general placement as one
    // complete unit. Until it is published, retain the existing full passage.
    const contextual = passage.contextualKey && (content.get(passage.contextualKey)?.status === "LIVE"
      || resolveCmsSurfaceOverride(content, [passage.contextualKey], values)?.unavailable);
    const body = resolve(contextual ? passage.contextualKey! : passage.key, values);
    if (!body) return null;
    slots[passage.slot] = body;
  }
  const body = resolve(plan.templateKey, slots);
  return body ? { body, sourceKeys: [...new Set(sourceKeys)] } : null;
}
