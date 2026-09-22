import { isRetiredCompositionKey } from "./fallbackArchitectureV3/resolver/retiredCompositions.mjs";
import { announceContentUpdate } from "../services/contentUpdateSignal.js";
/** Shared lifecycle identity. A retirement survives deletion of its editable row. */
export type ContentPublication = {
  content_key: string;
  state: "live" | "retired";
  revision: number;
  row_id: string | null;
  row_updated_at: string | null;
  updated_at: string;
};
export const publicationLedgerKey = "__content-publication-ledger/v1";
export function publicationLedgerReady() { return publications.has(publicationLedgerKey); }
export const publicationCacheKey = "tldrastro:content-publications:v1";
const publications = new Map<string, ContentPublication>();
const listeners = new Set<() => void>();
export let contentPublicationGeneration = 0;

export function validContentPublication(value: unknown): value is ContentPublication {
  if (!value || typeof value !== "object") return false;
  const row = value as ContentPublication;
  return typeof row.content_key === "string" && Boolean(row.content_key)
    && ["live", "retired"].includes(row.state)
    && Number.isSafeInteger(row.revision) && row.revision > 0
    && typeof row.updated_at === "string" && Number.isFinite(Date.parse(row.updated_at))
    && (row.row_id === null || typeof row.row_id === "string")
    && (row.row_updated_at === null || typeof row.row_updated_at === "string" && Number.isFinite(Date.parse(row.row_updated_at)));
}

export function mergeContentPublications(target: Map<string, ContentPublication>, incoming: readonly unknown[]) {
  let changed = false;
  for (const candidate of incoming) {
    if (!validContentPublication(candidate)) continue;
    const previous = target.get(candidate.content_key);
    if (previous && previous.revision >= candidate.revision) continue;
    target.set(candidate.content_key, candidate);
    changed = true;
  }
  return changed;
}

if (typeof window !== "undefined") {
  try {
    const cached: unknown = JSON.parse(window.localStorage.getItem(publicationCacheKey) ?? "[]");
    if (Array.isArray(cached)) mergeContentPublications(publications, cached);
  } catch { /* A failed content cache must not prevent the app from loading. */ }
  window.addEventListener("storage", (event) => {
    if (event.key !== publicationCacheKey || !event.newValue) return;
    try {
      const incoming: unknown = JSON.parse(event.newValue);
      if (Array.isArray(incoming)) installContentPublications(incoming);
    } catch { /* Keep the last verified lifecycle records. */ }
  });
}

export function installContentPublications(incoming: readonly unknown[]) {
  if (!mergeContentPublications(publications, incoming)) return;
  contentPublicationGeneration += 1;
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(publicationCacheKey, JSON.stringify([...publications.values()])); }
    catch { /* Memory still retains the retirement for this session. */ }
  }
  for (const listener of listeners) listener();
  announceContentUpdate({ contentKey: "*", published: false, updatedAt: new Date().toISOString() });
}
export function contentPublication(contentKey: string) { return publications.get(contentKey); }
export function isContentRetired(contentKey: string) { return isRetiredCompositionKey(contentKey) || publications.get(contentKey)?.state === "retired"; }
export function subscribeToContentPublications(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Once a key has a publication, an older row or unversioned bundle is not a substitute. */
export function publicationAllowsContent(contentKey: string, rowId?: string | null, rowUpdatedAt?: string | null, targetDate?: string | null, records: ReadonlyMap<string, ContentPublication> = publications) {
  if (isRetiredCompositionKey(contentKey)) return false;
  const publication = records.get(contentKey);
  if (!publication) return !rowId || Boolean(targetDate) || !records.has(publicationLedgerKey);
  if (publication.state === "retired") return false;
  if (targetDate || !publication.row_id) return true;
  return rowId === publication.row_id && Boolean(rowUpdatedAt) && Boolean(publication.row_updated_at)
    && publicationTimestamp(rowUpdatedAt!) === publicationTimestamp(publication.row_updated_at!);
}
export function contentPublicationRecords() { return [...publications.values()]; }

export function publicationTimestamp(value: string) {
  const microseconds = (value.match(/\.(\d+)/)?.[1] ?? "").padEnd(6, "0").slice(3, 6);
  return `${Date.parse(value)}:${microseconds}`;
}
