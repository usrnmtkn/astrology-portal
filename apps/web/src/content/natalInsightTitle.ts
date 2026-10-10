import { natalInsightGuideKey, natalInsightTopics, type NatalInsightId } from "./natalInsightCatalog";
import { resolveCmsSurfaceOverride, type CmsGeneratedContentMap } from "./cmsSurfaceOverrides";

export function natalInsightTitle(id: NatalInsightId, audience: "you" | "friend", content?: CmsGeneratedContentMap | null, ownerName = "", birthTimeKnown = true) {
  const topic = natalInsightTopics.find(item => item.id === id)!;
  // Both reading pages display the same editable guide and its saved title.
  const untimed = id === "approach" && !birthTimeKnown;
  const key = natalInsightGuideKey(id, untimed);
  const copy = content?.get(key)?.status === "LIVE" ? resolveCmsSurfaceOverride(content, [key], { ownerName }) : null;
  return copy?.headline || (untimed ? "Sun & Moon" : audience === "friend" && "friendTitle" in topic ? topic.friendTitle : topic.title);
}
