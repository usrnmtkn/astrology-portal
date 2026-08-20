import { allReaderFacingCopy, firstReaderFacingCopy } from "./readerSafety";

export function natalPlacementReaderSectionCopy(
  value: string | null | undefined,
  partKey: string | null | undefined
) {
  const isOwnerApprovedFinalReaderSection = partKey?.startsWith("fallback-hook/natal-you-placement-") ?? false;

  return isOwnerApprovedFinalReaderSection
    ? allReaderFacingCopy([value])
    : firstReaderFacingCopy([value]);
}
