import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { subscribeToContentUpdates } from "../../web/src/services/contentUpdateSignal";
export type LiveStatus = { id: string; live: boolean; label: "Live" | "Not live"; detail: string; source: string | null; updatedAt: string | null };
type StatusRow = { id?: string | null; updated_at?: string | null };
type Load = (row: StatusRow) => Promise<LiveStatus>;
const Context = createContext<Load | null>(null);
export function ContentLiveStatusProvider({ request, children }: { request: (ids: string[]) => Promise<LiveStatus[]>; children: ReactNode }) {
  const requestRef = useRef(request);
  requestRef.current = request;
  const [revision, setRevision] = useState(0);
  useEffect(() => subscribeToContentUpdates(() => setRevision((value) => value + 1)), []);
  const load = useMemo<Load>(() => {
    const cache = new Map<string, Promise<LiveStatus>>();
    let pending: Array<{ id: string; resolve: (status: LiveStatus) => void; reject: (error: Error) => void }> = [];
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
                const status = statuses.find((value) => value.id === item.id);
                if (status) item.resolve(status); else item.reject(new Error("Status could not be verified."));
              }
            } catch (error) { group.forEach((item) => item.reject(error instanceof Error ? error : new Error("Status could not be verified."))); }
          }
        }, 0);
      }));
      return cache.get(key)!;
    };
  }, [revision]);
  return <Context.Provider value={load}>{children}</Context.Provider>;
}
export default function ContentLiveStatusBadge({ row, unsaved = false, label }: { row: StatusRow; unsaved?: boolean; label?: string }) {
  const load = useContext(Context);
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setStatus(null); setFailed(false);
    if (!row.id || !load || unsaved) return;
    void load(row).then((value) => { if (!cancelled) {
      if (row.updated_at && value.updatedAt && Date.parse(row.updated_at) !== Date.parse(value.updatedAt)) setFailed(true);
      else setStatus(value);
    } }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [load, row.id, row.updated_at, unsaved]);
  if (unsaved || !row.id) return <span aria-label={label} className="ui-pill admin-status status-draft" title="These edits have not been saved and published.">Not live</span>;
  if (!status) return <span aria-label={label} className="admin-field-hint" title={failed ? "Could not verify reader status. Reload to retry." : undefined}>{failed ? "Status unavailable" : "Checking status…"}</span>;
  return <span aria-label={label} className={`ui-pill admin-status admin-table-tag ${status.live ? "status-live" : "status-draft"}`} title={status.detail}>{status.label}</span>;
}
