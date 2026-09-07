/** Select only the released collective Sky modifier, never personal transit copy. */
export type SkyPlacementMotionCopy = { contentKey: string; body: string };

type ReaderRenderer = { renderRoute(input: Record<string, unknown>): unknown };

export function skyPlacementMotionCopy(
  planet: string,
  isRetrograde: boolean,
  renderer: ReaderRenderer
): SkyPlacementMotionCopy | null {
  if (!isRetrograde) return null;
  const contentKey = `sky-placement/retrograde/${planet}`;
  try {
    const result = renderer.renderRoute({ contentKey }) as {
      contentKey?: string; servingEnabled?: boolean; versionStatus?: string; readerParts?: string[];
    };
    if (result.servingEnabled !== true || result.versionStatus !== "approved-serving-baseline"
      || result.contentKey !== contentKey || !result.readerParts?.length) return null;
    const body = result.readerParts.join("\n\n");
    return body.trim() ? { contentKey, body } : null;
  } catch (error) {
    if (error instanceof Error && /^SKY_V4_(?:NOT_RELEASED|NOT_SERVABLE|SOURCE_GAP)/u.test(error.message)) return null;
    throw error;
  }
}

/** Reorder whole units only; preserve the approved base text byte-for-byte. */
export function skyPlacementMotionParts(parts: string[], motion: SkyPlacementMotionCopy | null) {
  return motion ? [motion.body, ...parts.filter(part => part !== motion.body)] : parts;
}
