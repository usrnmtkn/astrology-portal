import { allReaderFacingCopy, firstReaderFacingCopy } from "./readerSafety";

export function natalPlacementReaderSectionCopy(
  value: string | null | undefined,
  partKey: string | null | undefined
) {
  const isOwnerApprovedFinalReaderSection = partKey?.startsWith("fallback-hook/natal-you-placement-") ?? false;
  const readerCopy = isOwnerApprovedFinalReaderSection
    ? allReaderFacingCopy([value])
    : firstReaderFacingCopy([value]);

  // Source blocks retain their governed boundaries and hashes. The natal
  // placement article presents each semantic section as one paragraph:
  // planet-in-sign first, then planet-in-house.
  return readerCopy?.replace(/\s+/gu, " ").trim() ?? null;
}
