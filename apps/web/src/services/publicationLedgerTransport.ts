import { validContentPublication, type ContentPublication } from "../content/contentPublicationState.js";

/** The tag describes the complete public ledger, including retirements. No
 * publication timestamp or subset is sufficient to validate the cached set. */
export function canonicalPublicationLedger(rows: unknown): ContentPublication[] {
  if (!Array.isArray(rows) || !rows.every(validContentPublication)
    || new Set(rows.map(row => row.content_key)).size !== rows.length) {
    throw new Error("Incomplete publication ledger.");
  }
  return rows.map(({ content_key, state, revision, row_id, row_updated_at, updated_at }) => (
    { content_key, state, revision, row_id, row_updated_at, updated_at }
  )).sort((a, b) => a.content_key < b.content_key ? -1 : a.content_key > b.content_key ? 1 : 0);
}

export async function publicationLedgerTag(rows: readonly ContentPublication[]) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(rows)));
  return `"publications-v1-${Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("")}"`;
}

export async function loadPublicationLedgerFromApi(cached: readonly ContentPublication[]) {
  const snapshot = canonicalPublicationLedger(cached);
  const tag = snapshot.length ? await publicationLedgerTag(snapshot) : null;
  const response = await fetch("/api/content-publications", {
    cache: "no-store", signal: AbortSignal.timeout(5000),
    headers: tag ? { "if-none-match": tag } : {}
  });
  if (response.status === 304) {
    if (!tag || response.headers.get("etag") !== tag) throw new Error("Unverified publication response.");
    return snapshot;
  }
  if (!response.ok) throw new Error("Publication service unavailable.");
  const payload = await response.json();
  if (payload.schema !== "tldr-publications/v1") throw new Error("Invalid publication response.");
  const rows = canonicalPublicationLedger(payload.publications);
  if (response.headers.get("etag") !== await publicationLedgerTag(rows)) throw new Error("Unverified publication response.");
  return rows;
}
