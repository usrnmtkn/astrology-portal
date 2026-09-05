import bundledSkyPlacementRowsV3 from "./fallbackArchitectureV3/bundled-sky-placement-rows-v3.json";
import bundledSkyPlacementHouseRowsV3 from "./fallbackArchitectureV3/bundled-sky-placement-house-rows-v3.json";
import bundledSkyPlacementManifestV3 from "./fallbackArchitectureV3/bundled-sky-placement-manifest-v3.json";
import ownerAuthoredSkyPlacementHousePassages from "./fallbackArchitectureV3/authored-inputs/owner-authored-sky-placement-house-passages-v1.json";
import skyV4CanonicalCorpusUrl from "./fallbackArchitectureV3/authored-inputs/sky-v4-canonical-content-studio-stage-v1.json?url";
import correctionManifestUrl from "./fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-correction-v1.json?url";
import correctionChunk1Url from "./fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-correction-v1-chunk-1.json?url";
import correctionChunk2Url from "./fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-correction-v1-chunk-2.json?url";
import correctionChunk3Url from "./fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-correction-v1-chunk-3.json?url";
import correctionChunk4Url from "./fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-correction-v1-chunk-4.json?url";
import lunarManifestUrl from "./fallbackArchitectureV3/authored-inputs/sky-v4-placement-lunar-context-v1.json?url";
import lunarChunk1Url from "./fallbackArchitectureV3/authored-inputs/sky-v4-placement-lunar-context-v1-chunk-1.json?url";
import lunarChunk2Url from "./fallbackArchitectureV3/authored-inputs/sky-v4-placement-lunar-context-v1-chunk-2.json?url";
// @ts-ignore Shared ESM helper enforces all-or-nothing owner-authored 12-house sets at the deferred bundle boundary.
import { filterMixedDepthSkyPlacementHouseRows } from "./fallbackArchitectureV3/skyPlacementHouseSetGuard.mjs";
// @ts-ignore The governed resolver is shared ESM; its reader input is narrowed at this bundle boundary.
import { applySkyV4ContinuousCorpusCorrection, renderSkyV4ReaderRoute } from "./fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs";
import type {
  FallbackArchitectureV3Bundle,
  FallbackArchitectureV3PackageManifest,
  HookRow
} from "./fallbackArchitectureV3Runtime";

const guardedSkyPlacementHouseRows = filterMixedDepthSkyPlacementHouseRows(
  bundledSkyPlacementHouseRowsV3.hookRows,
  ownerAuthoredSkyPlacementHousePassages.rows
) as HookRow[];

export const skyPlacementFallbackArchitectureV3Bundle: FallbackArchitectureV3Bundle = {
  transitLib: { authoredCards: [] },
  templatesFile: { templates: [] },
  rowsFile: {
    hookRows: [
      ...bundledSkyPlacementRowsV3.hookRows,
      ...guardedSkyPlacementHouseRows
    ] as HookRow[],
    vocabularyRows: []
  },
  packageManifest: bundledSkyPlacementManifestV3 as FallbackArchitectureV3PackageManifest
};

export const skyPlacementFallbackArchitectureV3Manifest =
  bundledSkyPlacementManifestV3 as FallbackArchitectureV3PackageManifest;

export async function loadCanonicalSkyV4ReaderRoute() {
  // Vite resolves `?url` to an on-demand asset URL in the reader build. The
  // Node/esbuild parity harness resolves the same import to the parsed JSON
  // module. Support both representations so verification exercises the same
  // deferred boundary without teaching production to accept a thin fallback.
  async function loadJson(imported: unknown) {
    if (typeof imported === "string") {
      const response = await fetch(imported);
      if (!response.ok) throw new Error(`SKY_V4_SOURCE_GAP: reader package returned ${response.status}.`);
      return response.json() as Promise<unknown>;
    }
    return (imported as { default?: unknown })?.default ?? imported;
  }
  const [corpus, correctionManifest, correctionChunk1, correctionChunk2, correctionChunk3, correctionChunk4, lunarManifest, lunarChunk1, lunarChunk2] = await Promise.all([
    loadJson(skyV4CanonicalCorpusUrl),
    loadJson(correctionManifestUrl),
    ...[correctionChunk1Url, correctionChunk2Url, correctionChunk3Url, correctionChunk4Url].map(loadJson),
    loadJson(lunarManifestUrl),
    loadJson(lunarChunk1Url),
    loadJson(lunarChunk2Url)
  ]);
  if (!corpus) {
    throw new Error("SKY_V4_SOURCE_GAP: canonical reader package was empty.");
  }
  const chunks = [correctionChunk1, correctionChunk2, correctionChunk3, correctionChunk4] as Array<{ records: Record<string, unknown>[] }>;
  const correctedCorpus = applySkyV4ContinuousCorpusCorrection(corpus, {
    ...(correctionManifest as Record<string, unknown>),
    chunks,
    records: chunks.flatMap((chunk) => chunk.records)
  });
  const lunarChunks = [lunarChunk1, lunarChunk2] as Array<{ records: Record<string, unknown>[] }>;
  const lunarSource = {
    ...(lunarManifest as Record<string, unknown>),
    chunks: lunarChunks,
    records: lunarChunks.flatMap((chunk) => chunk.records)
  };
  return (input: Record<string, unknown>) => renderSkyV4ReaderRoute(correctedCorpus, input, lunarSource);
}
