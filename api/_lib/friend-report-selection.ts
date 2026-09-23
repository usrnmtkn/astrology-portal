import type { FriendTransitReadingBrief, FriendTransitReadingPersonalTransit } from "./friend-transit-reading.js";

/** Deliberately conservative: keep conflicting source versions and separate
 * contacts. Aspect labels, repeated words, or a shared source key are not IDs. */
function contactKey(brief: FriendTransitReadingBrief, reading: FriendTransitReadingPersonalTransit) {
  const e = reading.evidence;
  if (!reading.id || !e.transitPlanet || !e.aspect || !e.natalPoint || !reading.readerSections?.length
    || !reading.rangeLabel.trim()) return null;
  return JSON.stringify([
    brief.friendName, brief.dateLabel, reading.id,
    e.transitPlanet, e.transitSign ?? null, e.aspect, e.natalPoint, e.natalSign, e.natalHouse ?? null,
    e.direction ?? null, reading.rangeLabel, reading.timingLabel, reading.durationLabel,
    reading.readerSections.map(section => [section.body, [...section.sourceKeys].sort()])
  ]);
}

export function selectDistinctFriendTransits(brief: FriendTransitReadingBrief) {
  const seen = new Map<string, string>();
  const duplicates: Array<{ path: string; retainedPath: string }> = [];
  const select = (group: "primaryThemes" | "longerCycles") => brief[group].filter((reading, index) => {
    const key = contactKey(brief, reading), path = `${group}.${index}`;
    if (!key) return true;
    const retainedPath = seen.get(key);
    if (retainedPath) { duplicates.push({ path, retainedPath }); return false; }
    seen.set(key, path);
    return true;
  });
  const primaryThemes = select("primaryThemes"), longerCycles = select("longerCycles");
  return { primaryThemes, longerCycles, duplicates };
}
