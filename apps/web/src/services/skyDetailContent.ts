import { publicationAllowsContent } from "../content/contentPublicationState";
import type { SkySnapshot } from "../types";
import type { LiveGeneratedContent } from "./generatedContent";
import { skyAspectGeneratedContentKeys } from "./skyAspectContent";

/** Request writing for the same facts that the detail renders, including event-time signs. */
export function skySnapshotAspectContentKeys(snapshot: SkySnapshot) {
  return Array.from(new Set(snapshot.aspects.flatMap(aspect => {
    const firstSign = aspect.fromSign ?? snapshot.positions.find(position => position.planet === aspect.from)?.sign;
    const secondSign = aspect.toSign ?? snapshot.positions.find(position => position.planet === aspect.to)?.sign;
    if (!firstSign || !secondSign) return [];
    return skyAspectGeneratedContentKeys({
      first: aspect.from, second: aspect.to, aspect: aspect.type,
      firstSign, secondSign, targetDate: snapshot.generatedAt.slice(0, 10)
    });
  })));
}

export function eligibleSkyDetailContent(existing: Map<string, LiveGeneratedContent>) {
  return new Map([...existing].filter(([, row]) =>
    publicationAllowsContent(row.contentKey, row.id, row.updatedAt, row.targetDate)));
}

export async function loadSkyDetailContent(
  snapshot: SkySnapshot,
  existing: Map<string, LiveGeneratedContent>,
  extraKeys: string[],
  load: (keys: string[]) => Promise<Map<string, LiveGeneratedContent>>
) {
  const keys = Array.from(new Set([...skySnapshotAspectContentKeys(snapshot), ...extraKeys]));
  const retained = eligibleSkyDetailContent(existing);
  const missing = keys.filter(key => !retained.has(key));
  if (!missing.length) return retained.size === existing.size ? existing : retained;
  try {
    const incoming = await load(missing);
    return new Map([...retained, ...incoming]);
  } catch (error) {
    // Local approved sources may have finished loading during this request.
    // Let the reader recompose them with only still-eligible cached rows.
    console.warn("Sky detail content refresh failed; retaining eligible cached content.", error);
    return retained;
  }
}
