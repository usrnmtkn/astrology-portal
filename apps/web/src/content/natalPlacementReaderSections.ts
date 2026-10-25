import { fullDetailReaderFacingCopy } from "./readerSafety";

export function natalPlacementReaderSectionCopy(
  value: string | null | undefined,
  partKey: string | null | undefined,
  preserveParagraphs = false
) {
  // A resolver part is already the complete semantic section selected for the
  // reader. Never interpret an internal paragraph boundary as a preview
  // boundary: doing so silently discarded the remainder of approved
  // placement-sign, placement-house, and generic lived rows.
  const readerCopy = fullDetailReaderFacingCopy([value]);
  if (preserveParagraphs && partKey?.startsWith("fallback-hook/natal-you-placement-complete-final/")) return readerCopy;

  // Source blocks retain their governed boundaries and hashes. The natal
  // placement article presents each semantic section as one paragraph:
  // planet-in-sign first, then planet-in-house.
  return readerCopy?.replace(/\s+/gu, " ").trim() ?? null;
}
