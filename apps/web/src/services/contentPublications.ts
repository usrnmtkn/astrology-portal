import { getSupabaseClient } from "./auth";
import { publicReaderConfigurationPresent } from "./publicReaderConfiguration";
import { installContentPublications, validContentPublication, publicationLedgerReady, publicationLedgerBoundaries } from "../content/contentPublicationState";

let pending: Promise<void> | null = null;
let checkedAt = 0;
let resolved = false;
let resolvedFromNetwork = false;
/** Only a complete successful live read can make the offline snapshot optional. */
export function contentPublicationsAvailableOnline() { return resolvedFromNetwork; }
let availabilityListeners: Set<() => void> | undefined;
/** Transport failure can change availability without changing ledger rows. */
export function subscribeToContentPublicationAvailability(listener: () => void) {
  const listeners = availabilityListeners ??= new Set<() => void>();
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
/** A failed first lookup is not evidence that no published override exists. */
export function contentPublicationsResolved() { return resolved || publicationLedgerReady(); }
/** A Studio notice must not be satisfied by a read started before the edit. */
export async function refreshContentPublicationsAfterUpdate(): Promise<void> {
  if (pending) await pending;
  await refreshContentPublications(true);
}
/** Fetch every page before installing; partial or failed reads cannot erase retirements. */
export async function refreshContentPublications(force = false, readRelay?: () => Promise<readonly unknown[]>): Promise<void> {
  if (pending) return pending;
  if (!force && Date.now() - checkedAt < 30_000) return;
  const wasOnline = resolvedFromNetwork;
  let completedOnline = false;
  pending = (async () => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    if (readRelay) {
      try {
        const rows = await readRelay();
        installContentPublications(rows, "complete-live");
        resolved = completedOnline = true;
        checkedAt = Date.now();
        return;
      } catch { /* Older/offline deployments retain the existing direct read. */ }
    }
    if (publicReaderConfigurationPresent()) {
      try {
        const transport = await import("./anonymousReaderTransport");
        if (transport.anonymousReaderAvailable()) {
          const rows = await transport.loadAnonymousPublicationLedger();
          installContentPublications(rows, "complete-live");
          resolved = completedOnline = true;
          checkedAt = Date.now();
          return;
        }
      } catch { /* Preserve the existing SDK/offline recovery on transport failure. */ }
    }
    const client = await getSupabaseClient();
    // Unconfigured local readers have no remote publication plane to resolve.
    if (!client) { resolved = true; return; }
    // Half-open key ranges cover the entire ledger, including future key families.
    // These boundaries balance today's inventory; each range still paginates as
    // it grows. Keyset pagination avoids offset gaps during concurrent edits.
    const boundaries = publicationLedgerBoundaries;
    const pages = await Promise.all(boundaries.slice(0, -1).map(async (lower, index) => {
      const upper = boundaries[index + 1];
      const records = [];
      let cursor: string | null = null;
      for (;;) {
        // A 503 must reach the verified offline recovery path promptly. The
        // client's default 1s/2s/4s retries compound across source-plane reads.
        // Keep the deadline for hung connections and let an explicit refresh retry.
        let query = client.from("content_publications").select("content_key,state,revision,row_id,row_updated_at,updated_at")
          .order("content_key").limit(1000).retry(false);
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
    installContentPublications(pages.flat(), "complete-live");
    resolved = true;
    completedOnline = true;
    checkedAt = Date.now();
  })().catch(() => undefined).finally(() => {
    pending = null;
    resolvedFromNetwork = completedOnline;
    if (wasOnline !== resolvedFromNetwork) availabilityListeners?.forEach(listener => listener());
  });
  return pending;
}
