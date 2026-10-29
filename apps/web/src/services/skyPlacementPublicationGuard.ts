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
  || key.startsWith("sky.aspect.") || /^sky-(?:article|season-fallback)\//u.test(key)
  || /^fallback-hook\/sky-/u.test(key) || key.startsWith("house-horoscope-core/");

/** Shared sources remain guarded; dated editions belong to their article's placement. */
export function skyPlacementPublicationIdentity(selection?: string) {
  const pairs = selection?.startsWith("article:") ? selection.slice(8).split(",") : [];
  const selected = pairs.length && pairs.every(pair => /^[a-z-]+\/[a-z-]+$/u.test(pair)) ? new Set(pairs) : null;
  return JSON.stringify(contentPublicationRecords().filter(row => {
    if (!isSkySource(row.content_key)) return false;
    const dated = /^sky-article\/([^/]+\/[^/]+)\/\d{4}\/(?:day\/)?\d{4}-\d{2}-\d{2}$/u.exec(row.content_key);
    return !selected || !dated || selected.has(dated[1]);
  })
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
