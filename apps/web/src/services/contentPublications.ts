import { getSupabaseClient } from "./auth";
import { installContentPublications, validContentPublication, publicationLedgerReady, contentPublicationRecords } from "../content/contentPublicationState";

let pending: Promise<void> | null = null;
let checkedAt = 0;
let resolved = false;
let resolvedFromNetwork = false;
/** Only a complete successful live read can make the offline snapshot optional. */
export function contentPublicationsAvailableOnline() { return resolvedFromNetwork; }
/** A failed first lookup is not evidence that no published override exists. */
export function contentPublicationsResolved() { return resolved || publicationLedgerReady(); }
/** Fetch every page before installing; partial or failed reads cannot erase retirements. */
export async function refreshContentPublications(force = false, usePublicRelay = false): Promise<void> {
  if (pending) return pending;
  if (!force && Date.now() - checkedAt < 30_000) return;
  resolvedFromNetwork = false;
  pending = (async () => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    if (usePublicRelay) {
      try {
        const { loadPublicationLedgerFromApi } = await import("./publicationLedgerTransport");
        const rows = await loadPublicationLedgerFromApi(contentPublicationRecords());
        installContentPublications(rows);
        resolved = resolvedFromNetwork = true;
        checkedAt = Date.now();
        return;
      } catch { /* Older/offline deployments retain the existing direct read. */ }
    }
    const client = await getSupabaseClient();
    // Unconfigured local readers have no remote publication plane to resolve.
    if (!client) { resolved = true; return; }
    // Half-open key ranges cover the entire ledger, including future key families.
    // These boundaries balance today's inventory; each range still paginates as
    // it grows. Keyset pagination avoids offset gaps during concurrent edits.
    const boundaries = [null, "authored/compat-pair/s", "authored/transit-house-sign/m", "fallback-hook/n", null];
    const pages = await Promise.all(boundaries.slice(0, -1).map(async (lower, index) => {
      const upper = boundaries[index + 1];
      const records = [];
      let cursor: string | null = null;
      for (;;) {
        let query = client.from("content_publications").select("content_key,state,revision,row_id,row_updated_at,updated_at")
          .order("content_key").limit(1000);
        if (lower) query = query.gte("content_key", lower);
        if (upper) query = query.lt("content_key", upper);
        if (cursor) query = query.gt("content_key", cursor);
        const { data, error } = await query.abortSignal(AbortSignal.timeout(8000));
        if (error || !Array.isArray(data) || !data.every(validContentPublication)) throw new Error("Incomplete publication ledger.");
        records.push(...data);
        if (data.length < 1000) return records;
        const nextCursor = data[data.length - 1].content_key;
        if (cursor !== null && nextCursor <= cursor) throw new Error("Incomplete publication ledger.");
        cursor = nextCursor;
      }
    }));
    installContentPublications(pages.flat());
    resolved = true;
    resolvedFromNetwork = true;
    checkedAt = Date.now();
  })().catch(() => undefined).finally(() => { pending = null; });
  return pending;
}
