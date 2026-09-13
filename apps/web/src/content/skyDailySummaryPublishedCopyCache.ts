import { publicationTimestamp, type ContentPublication } from "./contentPublicationState";

const storageKey = "tldrastro:sky-daily-summary-published-copy:v1";
const maximumEntries = 160;

type CachedSkySummaryCopy = {
  key: string;
  revision: number;
  rowId: string | null;
  rowUpdatedAt: string | null;
  body: string;
};

const cache = new Map<string, CachedSkySummaryCopy>();
let storageLoaded = false;

function sameTimestamp(left: string | null, right: string | null) {
  if (left === null || right === null) return left === right;
  return publicationTimestamp(left) === publicationTimestamp(right);
}

function matchesPublication(entry: CachedSkySummaryCopy, publication: ContentPublication) {
  return entry.revision === publication.revision
    && entry.rowId === publication.row_id
    && sameTimestamp(entry.rowUpdatedAt, publication.row_updated_at);
}

function loadStorage() {
  if (storageLoaded || typeof window === "undefined") return;
  storageLoaded = true;
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
    if (!Array.isArray(value)) return;
    for (const candidate of value) {
      if (!candidate || typeof candidate !== "object") continue;
      const entry = candidate as CachedSkySummaryCopy;
      if (typeof entry.key !== "string" || !entry.key
        || !Number.isSafeInteger(entry.revision) || entry.revision < 1
        || typeof entry.body !== "string" || !entry.body.trim()
        || entry.rowId !== null && typeof entry.rowId !== "string"
        || entry.rowUpdatedAt !== null && typeof entry.rowUpdatedAt !== "string") continue;
      cache.set(entry.key, entry);
    }
  } catch { /* A presentation cache must never stop Sky from loading. */ }
}

function persistStorage() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify([...cache.values()].slice(-maximumEntries)));
  } catch { /* Memory still prevents same-session copy flicker. */ }
}

export function cachedPublishedSkySummaryCopy(key: string, publication: ContentPublication) {
  loadStorage();
  const entry = cache.get(key);
  if (!entry || !matchesPublication(entry, publication)) {
    if (entry) {
      cache.delete(key);
      persistStorage();
    }
    return null;
  }
  return entry.body;
}

export function rememberPublishedSkySummaryCopy(key: string, publication: ContentPublication, body: string) {
  const normalized = body.trim();
  if (!normalized || publication.state !== "live") return;
  loadStorage();
  cache.delete(key);
  cache.set(key, {
    key,
    revision: publication.revision,
    rowId: publication.row_id,
    rowUpdatedAt: publication.row_updated_at,
    body: normalized
  });
  while (cache.size > maximumEntries) {
    const oldest = cache.keys().next().value;
    if (!oldest) break;
    cache.delete(oldest);
  }
  persistStorage();
}

export function clearPublishedSkySummaryCopyCache() {
  cache.clear();
  storageLoaded = true;
  if (typeof window !== "undefined") {
    try { window.localStorage.removeItem(storageKey); } catch { /* Ignore cache cleanup failure. */ }
  }
}
