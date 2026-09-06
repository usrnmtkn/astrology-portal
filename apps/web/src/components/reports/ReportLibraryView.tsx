import { Archive, ChevronLeft, FileText, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SegmentedControl } from "../SegmentedControl";
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
  if (item.status === "needs_attention") return "Needs information";
  return "Preparing";
}

function openItem(item: ReportLibraryItem) {
  if (item.status !== "ready") {
    window.location.assign(item.route);
    return;
  }
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
            <strong className="type-card-title">{item.title}</strong>
            <span className={`report-library-status ui-pill ui-pill--neutral report-library-status--${item.status}`}>{statusLabel(item)}</span>
          </span>
          <span className="report-library-row__subtitle type-meta">{item.subtitle}</span>
          <span className="report-library-row__date type-meta">
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
    try {
      await markReportArchived(item, archived);
      await refresh();
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="report-library-page">
      <button className="report-library-back floating-back-button" type="button" onClick={() => window.location.assign("/")}>
        <ChevronLeft size={18} aria-hidden="true" />
        <span>TLDR Astro</span>
      </button>

      <section className="report-library-shell" aria-labelledby="report-library-title">
        <header className="report-library-header">
          <p className="type-section-label">Your library</p>
          <h1 className="type-page-title" id="report-library-title">Reports</h1>
          <p className="type-body">Every saved reading stays here so you can come back to it without generating or paying for it again.</p>
        </header>

        <SegmentedControl
          id="report-library-tabs"
          panelId="report-library-panel"
          className="report-library-tabs"
          value={view}
          ariaLabel="Report library"
          onChange={setView}
          options={[
            { value: "active", label: "Reports" },
            { value: "archived", label: archivedCount ? `Archived ${archivedCount}` : "Archived" }
          ]}
        />

        <section
          className="report-library-list"
          id="report-library-panel"
          role="tabpanel"
          aria-labelledby={`report-library-tabs-${view}-tab`}
          aria-live="polite"
        >
          {status === "loading" ? <p className="report-library-empty type-body-muted">Loading your reports…</p> : null}
          {status === "error" ? <p className="report-library-empty type-body-muted">Your reports could not be loaded right now.</p> : null}
          {status === "ready" && visible.length === 0 ? (
            <p className="report-library-empty type-body-muted">{view === "archived" ? "No archived reports." : "Your saved reports will appear here."}</p>
          ) : null}
          {status === "ready" ? visible.map((item) => (
            <ReportLibraryRow key={item.id} item={item} onArchiveChange={changeArchive} />
          )) : null}
        </section>
      </section>
    </main>
  );
}

function GeneratedReportState({ message }: { message: string }) {
  return (
    <main className="saved-generated-report saved-generated-report--state">
      <button className="report-library-back floating-back-button" type="button" onClick={() => window.location.assign("/reports/")}>
        <ChevronLeft size={18} aria-hidden="true" />
        <span>Reports</span>
      </button>
      <p className="report-library-empty type-body-muted">{message}</p>
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

  if (status === "loading") return <GeneratedReportState message="Loading report…" />;
  if (status === "error" || !report) return <GeneratedReportState message="This report is unavailable." />;

  return (
    <main className="saved-generated-report">
      <button className="report-library-back floating-back-button" type="button" onClick={() => window.location.assign("/reports/")}>
        <ChevronLeft size={18} aria-hidden="true" />
        <span>Reports</span>
      </button>
      <article className="saved-generated-report__article">
        <header className="saved-generated-report__header">
          <div className="saved-generated-report__topline">
            <span className="type-section-label">Friends</span>
            <span className="ui-pill ui-pill--neutral">Paid reading</span>
          </div>
          <h1 className="type-page-title">{report.headline ?? "Saved reading"}</h1>
          {report.summary ? <p className="saved-generated-report__summary type-body">{report.summary}</p> : null}
        </header>
        <div className="saved-generated-report__body">
          {report.body.split(/\n{2,}/u).filter(Boolean).map((paragraph) => <p className="type-body" key={paragraph}>{paragraph}</p>)}
        </div>
        <footer className="type-meta">Saved {formatTimestamp(report.updatedAt)}</footer>
      </article>
    </main>
  );
}
