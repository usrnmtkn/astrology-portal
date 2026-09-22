import { loadProtectedOwnerSkyPlacementPassages } from "./protectedOwnerSkyPlacementPassages";
import { loadSkyPlacementSourceAssets } from "./skyPlacementSourceAssets";
import bundledSkyPlacementRowsV3 from "./fallbackArchitectureV3/bundled-sky-placement-rows-v3.json";
import bundledSkyPlacementManifestV3 from "./fallbackArchitectureV3/bundled-sky-placement-manifest-v3.json";
// @ts-ignore The governed resolver is shared ESM; its reader input is narrowed at this bundle boundary.
import { applySkyV4ContinuousCorpusCorrection } from "./fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs";
import { createPublishedSkyReader } from "./skyPlacementPublishedSources";
import type {
  FallbackArchitectureV3Bundle,
  FallbackArchitectureV3PackageManifest,
  HookRow
} from "./fallbackArchitectureV3Runtime";

export const skyPlacementFallbackArchitectureV3Bundle: FallbackArchitectureV3Bundle = {
  transitLib: { authoredCards: [] },
  templatesFile: { templates: [] },
  rowsFile: {
    hookRows: [
      ...bundledSkyPlacementRowsV3.hookRows
    ] as HookRow[],
    vocabularyRows: []
  },
  packageManifest: bundledSkyPlacementManifestV3 as FallbackArchitectureV3PackageManifest
};

export const skyPlacementFallbackArchitectureV3Manifest =
  bundledSkyPlacementManifestV3 as FallbackArchitectureV3PackageManifest;

export async function loadCanonicalSkyV4ReaderRoute(publishedSources: () => unknown[] = () => []) {
  const [sources] = await Promise.all([loadSkyPlacementSourceAssets(), loadProtectedOwnerSkyPlacementPassages()]);
  const [corpus, correctionManifest, correctionChunk1, correctionChunk2, correctionChunk3, correctionChunk4, lunarManifest, lunarChunk1, lunarChunk2] = sources;
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
  return createPublishedSkyReader(correctedCorpus, lunarSource, publishedSources);
}
