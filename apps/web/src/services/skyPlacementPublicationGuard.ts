import { contentPublicationRecords, publicationAllowsContent, publicationTimestamp } from "../content/contentPublicationState";

type OverlayRow = {
  contentKey: string;
  publicationRowId?: string;
  publicationRowUpdatedAt?: string;
};

type OverlayBundle = {
  transitLib?: { authoredCards?: OverlayRow[] };
  rowsFile?: { hookRows?: OverlayRow[]; vocabularyRows?: OverlayRow[] };
  templatesFile?: { templates?: OverlayRow[] };
} | null;

const isSkySource = (key: string) => /^sky-(?:placement|context|lunation|nodes|lilith|v4)\//u.test(key)
  || /^fallback-hook\/sky-/u.test(key) || key.startsWith("house-horoscope-core/");

/** Astronomy ticks and unrelated editorial saves do not change prose identity. */
export function skyPlacementPublicationIdentity() {
  return JSON.stringify(contentPublicationRecords().filter(row => isSkySource(row.content_key))
    .map(row => [row.content_key, row.state, row.revision, row.row_id,
      row.row_updated_at ? publicationTimestamp(row.row_updated_at) : null])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
}

export function missingSkyPlacementPublications(bundles: OverlayBundle[]) {
  const rows = new Map(bundles.flatMap(bundle => [
    ...(bundle?.transitLib?.authoredCards ?? []), ...(bundle?.rowsFile?.hookRows ?? []),
    ...(bundle?.rowsFile?.vocabularyRows ?? []), ...(bundle?.templatesFile?.templates ?? [])
  ]).map(row => [row.contentKey, row]));
  return contentPublicationRecords().filter(publication => {
    if (!isSkySource(publication.content_key) || publication.state !== "live" || !publication.row_id) return false;
    const row = rows.get(publication.content_key);
    // Writing-library and other Studio-live keys can share a sky-placement
    // prefix without being an overlay source the Sky loaders fetch. Requiring
    // those ledger rows here takes down every Sky Placement surface.
    if (!row) return false;
    return !publicationAllowsContent(publication.content_key,
      row.publicationRowId, row.publicationRowUpdatedAt);
  }).map(row => row.content_key);
}
