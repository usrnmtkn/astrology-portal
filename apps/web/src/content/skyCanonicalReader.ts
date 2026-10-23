import { loadSkyPlacementSourceAssets } from "./skyPlacementSourceAssets";
// @ts-ignore Shared governed source correction and complete canonical reader.
import { applySkyV4ContinuousCorpusCorrection } from "./fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs";
import { createPublishedSkyReader } from "./skyPlacementPublishedSources";

export async function loadCanonicalSkyV4ReaderRoute(publishedSources: () => unknown[] = () => []) {
  const sources = await loadSkyPlacementSourceAssets();
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
