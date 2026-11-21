import { isContentRetired, contentPublicationRecords, installContentPublications, mergeContentPublications, publicationAllowsContent, type ContentPublication } from "../content/contentPublicationState";
import { updateLastKnownGoodFallbackArchitectureV3Bundle, loadFallbackArchitectureV3BundledCoreManifest, loadFallbackArchitectureV3BundledSkyPlacementManifest } from "../content/fallbackArchitectureV3Runtime";
import { packageFallbackArchitectureV3CoreRows } from "./fallbackArchitectureV3CorePackaging";
import type { GeneratedContentRow } from "./generatedContent";
import { recoverySnapshotUrl } from "../content/contentStudioRecovery.mjs";

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
        // Try the independent GitHub recovery copy, then retain the shipped fallback.
        for (const url of [recoverySnapshotUrl, "/content-studio-last-known-good.json"]) {
          try {
            const response = await fetch(url, { cache: "no-cache", signal: AbortSignal.timeout(url === recoverySnapshotUrl ? 3000 : 8000) });
            if (!response.ok) continue;
            const snapshot = await response.json();
            if (snapshot?.schema !== "content-studio-last-known-good-v2" || typeof snapshot.sourceRevision !== "string"
              || Object.keys(snapshot).length !== 5 || !Array.isArray(snapshot.rows) || snapshot.rowCount < 100
              || snapshot.rowCount !== snapshot.rows.length || !Array.isArray(snapshot.publications)) continue;
            const publications = new Map<string, ContentPublication>();
            // The merger drops invalid records; equal size also proves uniqueness.
            mergeContentPublications(publications, snapshot.publications);
            if (publications.size !== snapshot.publications.length || !publications.has("__content-publication-ledger/v1")
              || new Set(snapshot.rows.map((row: GeneratedContentRow) => row.content_key)).size !== snapshot.rows.length
              || !snapshot.rows.every((row: GeneratedContentRow) => row.status === "LIVE" && row.lane === "serving"
                && row.review_state == null && row.target_date == null
                && publicationAllowsContent(row.content_key, row.id, row.updated_at, null, publications))) continue;
            await installOfflineContentSnapshot(snapshot.rows, snapshot.publications);
            return snapshot.rows as GeneratedContentRow[];
          } catch { /* A failed recovery host must not disable the packaged copy. */ }
        }
        return [];
      } catch {
        return [];
      }
    })();
  }
  const rows = await contentStudioLastKnownGoodRowsPromise;
  if (!rows.length) contentStudioLastKnownGoodRowsPromise = null;
  return rows.filter((row) => !isContentRetired(row.content_key));
}
