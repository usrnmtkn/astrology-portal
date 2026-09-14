import { getSupabaseClient } from "./auth";
import { installContentPublications, validContentPublication, publicationLedgerReady } from "../content/contentPublicationState";

let pending: Promise<void> | null = null;
let checkedAt = 0;
let resolved = false;
/** A failed first lookup is not evidence that no published override exists. */
export function contentPublicationsResolved() { return resolved || publicationLedgerReady(); }
/** Fetch every page before installing; partial or failed reads cannot erase retirements. */
export async function refreshContentPublications(force = false): Promise<void> {
  if (pending) return pending;
  if (!force && Date.now() - checkedAt < 30_000) return;
  pending = (async () => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    const client = await getSupabaseClient();
    // Unconfigured local readers have no remote publication plane to resolve.
    if (!client) { resolved = true; return; }
    const records = [];
    let cursor: string | null = null;
    for (;;) {
      let query = client.from("content_publications").select("content_key,state,revision,row_id,row_updated_at,updated_at")
        .order("content_key", { ascending: true }).limit(1000);
      if (cursor) query = query.gt("content_key", cursor);
      const { data, error } = await query.abortSignal(AbortSignal.timeout(8000));
      if (error || !Array.isArray(data) || !data.every(validContentPublication)) return;
      records.push(...data);
      if (data.length < 1000) break;
      const nextCursor = data[data.length - 1].content_key;
      if (cursor !== null && nextCursor <= cursor) return;
      cursor = nextCursor;
    }
    installContentPublications(records);
    resolved = true;
    checkedAt = Date.now();
  })().catch(() => undefined).finally(() => { pending = null; });
  return pending;
}
