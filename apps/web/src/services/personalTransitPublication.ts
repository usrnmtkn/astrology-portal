import { contentPublicationRecords, publicationTimestamp } from "../content/contentPublicationState";

// Source families, not candidate precedence: the shared renderer still selects
// exact/situation/family/return copy and the correct audience. Include its house,
// point, timing and template dependencies for every personal-transit surface.
export function isPersonalTransitSource(key: string) {
  return /^(?:authored\/(?:transit-|point-explainer\/)|fallback-hook\/(?:transit-|fog-note|natal-core)|fallback-template\/transit\.|fallback-vocab\/)/u.test(key);
}

export function personalTransitPublicationIdentity() {
  return JSON.stringify(contentPublicationRecords().filter(row => isPersonalTransitSource(row.content_key))
    .map(row => [row.content_key, row.state, row.revision, row.row_id,
      row.row_updated_at ? publicationTimestamp(row.row_updated_at) : null])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
}
