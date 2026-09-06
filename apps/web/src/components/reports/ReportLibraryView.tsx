import { Archive, ChevronLeft, FileText, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  listReportLibrary,
  loadGeneratedReportById,
  markReportArchived,
  markReportSeen,
  type GeneratedReportRecord,
  type ReportLibraryItem
} from "../../services/reportLibrary";

function generatedReportIdFromPath() {
  return window.location.pathname.match(/^\/reports\/generated\/([^/]+)$/u)?.[1] ?? "";
}

function formatTimestamp(value: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function statusLabel(item: ReportLibraryItem) {
  if (item.status === "ready") return item.seenAt ? "Ready" : "New";
  if (item.status === "generating") return "Preparing";
  if (item.status === "needs_attention") return "Needs information";
  if (item.status === "failed") return "Unavailable";
  return "Unavailable";
}

function openItem(item: ReportLibraryItem) {
  void markReportSeen(item).finally(() => window.location.assign(item.route));
}

function ReportLibraryRow({
  item,
  onArchiveChange
}: {
  item: ReportLibraryItem;
  onArchiveChange: (item: ReportLibraryItem, archived: boolean) => Promise<void>;
}) {
  const archived = Boolean(item.archivedAt);
  return (
    <article className="report-library-row" data-report-status={item.status}>
      <button className="report-library-row__open" type="button" onClick={() => openItem(item)}>
        <span className="report-library-row__icon" aria-hidden="true"><FileText size={20} /></span>
        <span className="report-library-row__copy">
          <span className="report-library-row__title-line">
            <strong>{item.title}</strong>
            <span className={`report-library-status report-library-status--${item.status}`}>{statusLabel(item)}</span>
          </span>
          <span className="report-library-row__subtitle">{item.subtitle}</span>
          <span className="report-library-row__date">
            {item.status === "ready" ? `Saved ${formatTimestamp(item.readyAt ?? item.updatedAt)}` : `Updated ${formatTimestamp(item.updatedAt)}`}
          </span>
        </span>
      </button>
      <button
        className="report-library-row__archive"
        type="button"
        aria-label={archived ? `Restore ${item.title}` : `Archive ${item.title}`}
        onClick={() => void onArchiveChange(item, !archived)}
      >
        {archived ? <RotateCcw size={18} aria-hidden="true" /> : <Archive size={18} aria-hidden="true" />}
        <span>{archived ? "Restore" : "Archive"}</span>
      </button>
    </article>
  );
}

export function ReportLibraryView() {
  const [items, setItems] = useState<ReportLibraryItem[]>([]);
  const [view, setView] = useState<"active" | "archived">("active");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  async function refresh() {
    try {
      setItems(await listReportLibrary());
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => { void refresh(); }, []);

  const visible = useMemo(() => items.filter((item) => (
    view === "archived" ? Boolean(item.archivedAt) : !item.archivedAt
  )), [items, view]);
  const archivedCount = useMemo(() => items.filter((item) => item.archivedAt).length, [items]);

  async function changeArchive(item: ReportLibraryItem, archived: boolean) {
    await markReportArchived(item, archived);
    await refresh();
  }

  return (
    <main className="report-library-shell">
      <header className="report-library-header">
        <a className="report-library-back" href="/">
          <ChevronLeft size={18} aria-hidden="true" />
          <span>TLDR Astro</span>
        </a>
        <div>
          <span className="report-library-eyebrow">Your library</span>
          <h1>Reports</h1>
          <p>Every saved reading stays here so you can come back to it without generating or paying for it again.</p>
        </div>
      </header>

      <div className="report-library-tabs" role="tablist" aria-label="Report library">
        <button type="button" role="tab" aria-selected={view === "active"} className={view === "active" ? "active" : ""} onClick={() => setView("active")}>Reports</button>
        <button type="button" role="tab" aria-selected={view === "archived"} className={view === "archived" ? "active" : ""} onClick={() => setView("archived")}>Archived{archivedCount ? ` ${archivedCount}` : ""}</button>
      </div>

      <section className="report-library-list" aria-live="polite">
        {status === "loading" ? <p className="report-library-empty">Loading your reports…</p> : null}
        {status === "error" ? <p className="report-library-empty">Your reports could not be loaded right now.</p> : null}
        {status === "ready" && visible.length === 0 ? (
          <p className="report-library-empty">{view === "archived" ? "No archived reports." : "Your saved reports will appear here."}</p>
        ) : null}
        {status === "ready" ? visible.map((item) => (
          <ReportLibraryRow key={item.id} item={item} onArchiveChange={changeArchive} />
        )) : null}
      </section>
    </main>
  );
}

export function GeneratedReportDeliveryView() {
  const reportId = useMemo(generatedReportIdFromPath, []);
  const [report, setReport] = useState<GeneratedReportRecord | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    void loadGeneratedReportById(reportId).then(async (value) => {
      if (cancelled) return;
      if (!value) {
        setStatus("error");
        return;
      }
      setReport(value);
      setStatus("ready");
      try {
        await markReportSeen({ sourceKind: "generated_interpretation", sourceId: value.id });
      } catch {
        // The saved reading remains readable even if its notification state cannot update.
      }
    }).catch(() => {
      if (!cancelled) setStatus("error");
    });
    return () => { cancelled = true; };
  }, [reportId]);

  if (status === "loading") return <main className="report-library-shell"><p className="report-library-empty">Loading report…</p></main>;
  if (status === "error" || !report) return <main className="report-library-shell"><p className="report-library-empty">This report is unavailable.</p></main>;

  return (
    <main className="saved-generated-report">
      <a className="report-library-back" href="/reports/">
        <ChevronLeft size={18} aria-hidden="true" />
        <span>Reports</span>
      </a>
      <article className="saved-generated-report__article">
        <div className="saved-generated-report__topline">
          <span>Friends</span>
          <span>Paid reading</span>
        </div>
        <h1>{report.headline ?? "Saved reading"}</h1>
        {report.summary ? <p className="saved-generated-report__summary">{report.summary}</p> : null}
        <div className="saved-generated-report__body">
          {report.body.split(/\n{2,}/u).filter(Boolean).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
        <footer>Saved {formatTimestamp(report.updatedAt)}</footer>
      </article>
    </main>
  );
}
