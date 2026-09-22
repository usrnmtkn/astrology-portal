import { isContentRetired, contentPublicationRecords, installContentPublications, mergeContentPublications, publicationAllowsContent } from "../content/contentPublicationState";
import { updateLastKnownGoodFallbackArchitectureV3Bundle, loadFallbackArchitectureV3BundledCoreManifest, loadFallbackArchitectureV3BundledSkyPlacementManifest } from "../content/fallbackArchitectureV3Runtime";
import { packageFallbackArchitectureV3CoreRows } from "./fallbackArchitectureV3CorePackaging";
import type { GeneratedContentRow } from "./generatedContent";

export async function installOfflineContentSnapshot(rows: GeneratedContentRow[], publications: unknown[]) {
  // Reuse the shipped partitions instead of downloading a duplicate full index.
  const [core, sky] = await Promise.all([loadFallbackArchitectureV3BundledCoreManifest(), loadFallbackArchitectureV3BundledSkyPlacementManifest()]);
  const manifest = { ...core, keys: [...core.keys, ...sky.keys] };
  const prospective = new Map(contentPublicationRecords().map(record => [record.content_key, record]));
  mergeContentPublications(prospective, publications);
  const bundle = packageFallbackArchitectureV3CoreRows(rows, manifest,
    (key, id, version, date) => publicationAllowsContent(key, id, version, date, prospective),
    { includeSkyPlacement: true });
  // Stage matching rows before ledger listeners invalidate unversioned content.
  if (bundle) updateLastKnownGoodFallbackArchitectureV3Bundle(previous => ({
    // Preserve verified newer rows when an older snapshot does not supply them.
    transitLib: { authoredCards: [...(previous?.transitLib.authoredCards ?? []), ...bundle.transitLib.authoredCards] },
    templatesFile: { templates: [...(previous?.templatesFile.templates ?? []), ...bundle.templatesFile.templates] },
    rowsFile: {
      hookRows: [...(previous?.rowsFile.hookRows ?? []), ...(bundle.rowsFile.hookRows ?? [])],
      vocabularyRows: [...(previous?.rowsFile.vocabularyRows ?? []), ...(bundle.rowsFile.vocabularyRows ?? [])]
    }
  }));
  installContentPublications(publications);
}

let contentStudioLastKnownGoodLoadedAt = 0;
let contentStudioLastKnownGoodRowsPromise: Promise<GeneratedContentRow[]> | null = null;

export async function loadOfflineContentRows(): Promise<GeneratedContentRow[]> {
  if (Date.now() - contentStudioLastKnownGoodLoadedAt > 5 * 60 * 1000) contentStudioLastKnownGoodRowsPromise = null;
  if (!contentStudioLastKnownGoodRowsPromise) {
    contentStudioLastKnownGoodLoadedAt = Date.now();
    contentStudioLastKnownGoodRowsPromise = (async () => {
      try {
        const response = await fetch("/content-studio-last-known-good.json", { cache: "no-cache", signal: AbortSignal.timeout(8000) });
        if (!response.ok) return [];
        const snapshot = await response.json() as { schema?: unknown; rowCount?: unknown; rows?: unknown; publications?: unknown };
        if (snapshot.schema !== "content-studio-last-known-good-v2" || !Array.isArray(snapshot.rows)
          || snapshot.rowCount !== snapshot.rows.length) return [];
        if (Array.isArray(snapshot.publications)) {
          await installOfflineContentSnapshot(snapshot.rows, snapshot.publications);
        }
        return snapshot.rows as GeneratedContentRow[];
      } catch {
        return [];
      }
    })();
  }
  const rows = await contentStudioLastKnownGoodRowsPromise;
  if (!rows.length) contentStudioLastKnownGoodRowsPromise = null;
  return rows.filter((row) => !isContentRetired(row.content_key));
}
