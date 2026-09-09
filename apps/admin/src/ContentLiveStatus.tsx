import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { subscribeToContentUpdates } from "../../web/src/services/contentUpdateSignal";
import { publicationTimestamp } from "../../web/src/content/contentPublicationState";
export type LiveStatus = { id: string; live: boolean; label: "Live" | "Not live"; detail: string; source: string | null; updatedAt: string | null };
type StatusRow = { id?: string | null; updated_at?: string | null };
type Load = (row: StatusRow) => Promise<LiveStatus>;
const Context = createContext<Load | null>(null);
function validLiveStatus(value: unknown): value is LiveStatus {
  if (!value || typeof value !== "object") return false;
  const status = value as Record<string, unknown>;
  return typeof status.id === "string"
    && typeof status.live === "boolean"
    && status.label === (status.live ? "Live" : "Not live")
    && typeof status.detail === "string"
    && (status.updatedAt === null || typeof status.updatedAt === "string")
    && (status.source === null || typeof status.source === "string");
}
export function useContentLiveStatusLoader(request: (ids: string[]) => Promise<LiveStatus[]>, identity: string) {
  const requestRef = useRef(request);
  requestRef.current = request;
  const [revision, setRevision] = useState(0);
  useEffect(() => subscribeToContentUpdates(() => setRevision((value) => value + 1)), []);
  const load = useMemo<Load>(() => {
    const cache = new Map<string, Promise<LiveStatus>>();
    let pending: Array<{ id: string; resolve: (status: LiveStatus) => void; reject: (error: unknown) => void }> = [];
    let scheduled = false;
    return (row) => {
      const key = `${row.id}/${row.updated_at ?? ""}`;
      if (!cache.has(key)) cache.set(key, new Promise((resolve, reject) => {
        pending.push({ id: row.id!, resolve, reject });
        if (scheduled) return;
        scheduled = true;
        setTimeout(async () => {
          const batch = pending; pending = []; scheduled = false;
          for (let offset = 0; offset < batch.length; offset += 64) {
            const group = batch.slice(offset, offset + 64);
            try {
              const statuses = await requestRef.current([...new Set(group.map((item) => item.id))]);
              for (const item of group) {
                const status = statuses.find((value) => validLiveStatus(value) && value.id === item.id);
                if (status) item.resolve(status); else item.reject(new Error("Status could not be verified."));
              }
            } catch (error) { group.forEach((item) => item.reject(error)); }
          }
        }, 0);
      }));
      const pendingStatus = cache.get(key)!;
      void pendingStatus.catch(() => cache.delete(key));
      return pendingStatus.then((status) => {
        if (row.updated_at && status.updatedAt && publicationTimestamp(row.updated_at) !== publicationTimestamp(status.updatedAt)) throw new Error("Status could not be verified.");
        return status;
      });
    };
  }, [revision, identity]);
  return load;
}
export const ContentLiveStatusProvider = Context.Provider;
export function useContentLiveStatusResults(load: Load, rows: StatusRow[], enabled: boolean) {
  const [result, setResult] = useState<{ load: Load; rows: StatusRow[]; statuses: Map<string, LiveStatus>; failed: number; pending: number } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void (async () => {
      const statuses = new Map<string, LiveStatus>();
      let failed = 0;
      // Stream matching rows as batches resolve and stop scheduling work when
      // the editor changes the search/category or leaves this screen.
      for (let offset = 0; offset < rows.length || offset === 0; offset += 64) {
        await Promise.all(rows.slice(offset, offset + 64).map((row) => load(row)
          .then((status) => { statuses.set(status.id, status); })
          .catch(() => { failed++; })));
        if (cancelled) return;
        setResult({ load, rows, statuses: new Map(statuses), failed, pending: Math.max(0, rows.length - offset - 64) });
      }
    })();
    return () => { cancelled = true; };
  }, [load, rows, enabled]);
  return result?.load === load && result.rows === rows ? result : null;
}
export default function ContentLiveStatusBadge({ row, unsaved = false, label }: { row: StatusRow; unsaved?: boolean; label?: string }) {
  const load = useContext(Context);
  const [status, setStatus] = useState<LiveStatus | "unavailable" | null>(null);
  useEffect(() => {
    let cancelled = false;
    setStatus(null);
    if (!row.id || !load || unsaved) return;
    void load(row).then((value) => { if (!cancelled) setStatus(value); })
      .catch(() => { if (!cancelled) setStatus("unavailable"); });
    return () => { cancelled = true; };
  }, [load, row.id, row.updated_at, unsaved]);
  if (unsaved || !row.id) return <span aria-label={label} className="ui-pill admin-status status-draft" title="These edits have not been saved and published.">Not live</span>;
  if (!status || status === "unavailable") return <span aria-label={label} className="admin-field-hint" title={status === "unavailable" ? "Status unavailable. Refresh rows to retry." : undefined}>{status === "unavailable" ? "Status unavailable" : "Checking status…"}</span>;
  return <span aria-label={label} className={`ui-pill admin-status admin-table-tag ${status.live ? "status-live" : "status-draft"}`} title={status.detail}>{status.label}</span>;
}
