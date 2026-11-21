import type { SkySnapshot } from "../types";
import { natalInsightCombinationKey, type NatalInsightCombination } from "../content/natalInsightCombination";
import type { NatalInsightId } from "../content/natalInsightDefinitions";
import { natalInsightBirthTimeKnown, natalInsightCompositionPlan, composeNatalInsight } from "./natalInsightComposition";
import { resolveCmsSurfaceOverride, type CmsGeneratedContentMap } from "../content/cmsSurfaceOverrides";

export function natalInsightCompleteKey(topic: NatalInsightId, sky: SkySnapshot, birthTimeKnown: boolean, audience: "you" | "friend" = "you") {
  const plan = natalInsightCompositionPlan(topic, sky, birthTimeKnown, audience);
  if (plan.unavailable) return null;
  const selection: NatalInsightCombination = { topic, audience, timed: natalInsightBirthTimeKnown(sky, birthTimeKnown),
    sourceSign: String(plan.slots.insightHouseSign ?? plan.slots.insightCreativitySign ?? ""),
    planets: Object.fromEntries(sky.positions.map(position => [position.planet.toLowerCase(), position.sign])),
    ...(typeof plan.slots.insightMidheavenSign === "string" ? { midheaven: plan.slots.insightMidheavenSign } : {}) };
  return natalInsightCombinationKey(selection);
}

/** A complete record wins as one authored unit. Keep existing approved
 * composition during migration, but never substitute after an explicit hold. */
export function resolveNatalInsightReading(key: string | null, plan: ReturnType<typeof natalInsightCompositionPlan>, content: CmsGeneratedContentMap, ownerName?: string) {
  if (plan.unavailable) return null;
  if (key) {
    const exact = resolveCmsSurfaceOverride(content, [key], { ownerName: ownerName?.trim() || "They" });
    if (exact?.unavailable) return null;
    const row = content.get(key);
    if (row?.status === "LIVE" && row.body?.trim() && exact?.body && !/\{\{|\}\}/u.test(exact.body)) {
      return { body: exact.body, sourceKeys: [key], kind: "complete" as const };
    }
  }
  const legacy = composeNatalInsight(plan, content);
  return legacy ? { ...legacy, kind: "composition" as const } : null;
}
