import type { SkySnapshot } from "../types";
import { natalInsightSigns, natalInsightTopics, type NatalInsightId } from "../content/natalInsightCatalog";

/** Lightweight navigation checks; chart composition stays behind the reading route. */
export function natalInsightBirthTimeKnown(sky: SkySnapshot | null | undefined, birthTimeKnown: boolean) {
  return birthTimeKnown && !!sky && sky.birthTimeKnown !== false && natalInsightSigns.some(sign => sign === sky.ascendant);
}

export function natalInsightFromHash(hash: string): NatalInsightId | null {
  const id = hash.match(/^#you\/insight\/([^/?]+)$/u)?.[1];
  return natalInsightTopics.find(topic => topic.id === id)?.id ?? null;
}
