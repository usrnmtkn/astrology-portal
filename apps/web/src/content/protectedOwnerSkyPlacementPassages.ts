import protectedOwnerPassages from "./fallbackArchitectureV3/authored-inputs/owner-authored-sky-placement-house-passages-v1.json";

type ProtectedOwnerPassage = {
  body_sha256: string;
  body_you: string;
  contentKey: string;
  word_count: number;
};

type ProtectedOwnerPassageSelection = {
  body: string;
  contentKey?: string;
  protectionApplied: boolean;
};

const protectedPassagesByKey = new Map(
  (protectedOwnerPassages.rows as ProtectedOwnerPassage[]).map((row) => [row.contentKey, row])
);

/**
 * Prevents any compact summary, excerpt, stale CMS article passage, or other
 * alternate wording from replacing an owner-authored house horoscope. A
 * deliberate rewrite must first update the governed protected source, word
 * count, and hash together.
 */
export function preserveProtectedOwnerSkyPlacementPassage({
  body,
  contentKey,
  house,
  planet,
  sign
}: {
  body: string;
  contentKey?: string;
  house: number;
  planet: string;
  sign: string;
}): ProtectedOwnerPassageSelection {
  const protectedKey = `house-horoscope-core/${planet}/${sign}/house-${house}`;
  const protectedPassage = protectedPassagesByKey.get(protectedKey);

  if (!protectedPassage || body === protectedPassage.body_you) {
    return { body, contentKey, protectionApplied: false };
  }

  return {
    body: protectedPassage.body_you,
    contentKey: protectedPassage.contentKey,
    protectionApplied: true
  };
}
