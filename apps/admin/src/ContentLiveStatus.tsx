import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { subscribeToContentUpdates } from "../../web/src/services/contentUpdateSignal";
import { publicationTimestamp } from "../../web/src/content/contentPublicationState";
import { StudioStatusBadge, type StudioStatusTone } from "./StudioControls";

export type LiveStatus = { id: string; live: boolean; label: "Live" | "Not live"; detail: string; source: string | null; updatedAt: string | null };
type StatusRow = { id?: string | null; updated_at?: string | null; requestRevision?: number; status?: string | null };
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
      const key = `${row.id}/${row.updated_at ?? ""}/${row.requestRevision ?? 0}`;
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

function editorialStatusPresentation(row: StatusRow): { label: string; tone: StudioStatusTone } | null {
  switch ((row.status ?? "").toUpperCase()) {
    case "LIVE": return { label: "Live", tone: "live" };
    case "REVIEWED": return { label: "Ready", tone: "ready" };
    case "DRAFT": return { label: "Draft", tone: "draft" };
    case "ARCHIVED": return { label: "Archived", tone: "archived" };
    case "ERROR": return { label: "Error", tone: "error" };
    case "RETIRED": return { label: "Retired", tone: "retired" };
    default: return null;
  }
}

function savedStatusPresentation(row: StatusRow, live: LiveStatus): { label: string; tone: StudioStatusTone } {
  if (live.live) return { label: "Live", tone: "live" };
  return editorialStatusPresentation(row) ?? { label: "Inactive", tone: "inactive" };
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
  }, [load, row.id, row.updated_at, row.requestRevision, unsaved]);

  if (unsaved || !row.id) {
    return <StudioStatusBadge aria-label={label} tone="draft" title="These edits have not been saved and published." className="admin-status">Draft</StudioStatusBadge>;
  }
  if (status === "unavailable") {
    const editorial = editorialStatusPresentation(row);
    if (editorial) {
      return <StudioStatusBadge aria-label={label} tone={editorial.tone} title="Reader serving status could not be verified. Showing the saved editorial state." className="admin-status">{editorial.label}</StudioStatusBadge>;
    }
    return <StudioStatusBadge aria-label={label} tone="unknown" title="Status unavailable. Refresh rows to retry." className="admin-status">Unavailable</StudioStatusBadge>;
  }
  if (!status) {
    return <span aria-label={label} className="admin-field-hint">Checking status…</span>;
  }
  const presentation = savedStatusPresentation(row, status);
  return <StudioStatusBadge aria-label={label} tone={presentation.tone} title={status.detail} className="admin-status admin-table-tag">{presentation.label}</StudioStatusBadge>;
}
