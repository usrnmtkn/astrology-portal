import { loadCanonicalSkyReaderAssets } from "./canonicalSkyReaderAssets";
import { createPublishedSkyReader } from "./skyPlacementPublishedSources";

export async function loadCanonicalSkyV4ReaderRoute(publishedSources: () => unknown[] = () => []) {
  const { corpus, lunarSource } = await loadCanonicalSkyReaderAssets();
  return createPublishedSkyReader(corpus, lunarSource, publishedSources);
}
