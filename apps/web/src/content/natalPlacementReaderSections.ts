import { fullDetailReaderFacingCopy } from "./readerSafety";

export function natalPlacementReaderSectionCopy(
  value: string | null | undefined,
  _partKey: string | null | undefined
) {
  // A resolver part is already the complete semantic section selected for the
  // reader. Never interpret an internal paragraph boundary as a preview
  // boundary: doing so silently discarded the remainder of approved
  // placement-sign, placement-house, and generic lived rows.
  const readerCopy = fullDetailReaderFacingCopy([value]);

  // Source blocks retain their governed boundaries and hashes. The natal
  // placement article presents each semantic section as one paragraph:
  // planet-in-sign first, then planet-in-house.
  return readerCopy?.replace(/\s+/gu, " ").trim() ?? null;
}
