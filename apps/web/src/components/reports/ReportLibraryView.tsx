import { Archive, ChevronLeft, FileText, MoreHorizontal, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SegmentedControl } from "../SegmentedControl";
import {
  listReportLibrary,
  loadGeneratedReportById,
  markReportArchived,
  markReportSeen,
  type GeneratedReportRecord,
  type ReportLibraryItem
} from "../../services/reportLibrary";

const reportMonthNames = [
  "Jan", "Feb", "Mar", "Apr", "May", "June",
  "July", "Aug", "Sept", "Oct", "Nov", "Dec"
] as const;

type ReportCalendarDate = {
  year: number;
  month: number;
  day: number;
};

function generatedReportIdFromPath() {
  return window.location.pathname.match(/^\/reports\/generated\/([^/]+)$/u)?.[1] ?? "";
}

function ordinalSuffix(day: number) {
  const remainder100 = day % 100;
  if (remainder100 >= 11 && remainder100 <= 13) return "th";
  const remainder10 = day % 10;
  if (remainder10 === 1) return "st";
  if (remainder10 === 2) return "nd";
  if (remainder10 === 3) return "rd";
  return "th";
}

function parseReportCalendarDate(value: string | null): ReportCalendarDate | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/u);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function sameReportCalendarDate(left: ReportCalendarDate, right: ReportCalendarDate) {
  return left.year === right.year && left.month === right.month && left.day === right.day;
}

function isToday(date: ReportCalendarDate) {
  const today = new Date();
  return date.year === today.getFullYear()
    && date.month === today.getMonth() + 1
    && date.day === today.getDate();
}

function formatCalendarDay(date: ReportCalendarDate, includeYear = false) {
  const base = `${reportMonthNames[date.month - 1]} ${date.day}${ordinalSuffix(date.day)}`;
  return includeYear ? `${base}, ${date.year}` : base;
}

function formatReadingWindow(item: ReportLibraryItem) {
  const start = parseReportCalendarDate(item.targetDate);
  const end = parseReportCalendarDate(item.periodEnd ?? item.targetDate);
  if (!start) return item.subtitle;
  if (!end || sameReportCalendarDate(start, end)) {
    return `${isToday(start) ? "Today, " : ""}${formatCalendarDay(start)}`;
  }
  if (start.year === end.year && start.month === end.month) {
    return `${reportMonthNames[start.month - 1]} ${start.day}${ordinalSuffix(start.day)}–${end.day}${ordinalSuffix(end.day)}`;
  }
  if (start.year === end.year) {
    return `${formatCalendarDay(start)}–${formatCalendarDay(end)}`;
  }
  return `${formatCalendarDay(start, true)}–${formatCalendarDay(end, true)}`;
}

function formatCreatedDate(value: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${reportMonthNames[parsed.getMonth()]} ${parsed.getDate()}`;
}

function reportSubtitle(item: ReportLibraryItem) {
  const readingWindow = formatReadingWindow(item);
  if (item.reportKind === "friend_transit_reading") {
    return ["Friends", readingWindow].filter(Boolean).join(" · ");
  }
  return readingWindow;
}

function statusLabel(item: ReportLibraryItem) {
  if (item.status === "ready") return item.seenAt ? null : "New";
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
  const status = statusLabel(item);
  const [menuOpen, setMenuOpen] = useState(false);
  const actionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || actionRef.current?.contains(event.target)) return;
      setMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <article className="report-library-row" data-report-status={item.status}>
      <button className="report-library-row__open" type="button" onClick={() => openItem(item)}>
        <span className="report-library-row__icon" aria-hidden="true"><FileText size={20} /></span>
        <span className="report-library-row__copy">
          <span className="report-library-row__title-line">
            <strong className="type-card-title">{item.title}</strong>
            {status ? (
              <span className={`report-library-status ui-pill ui-pill--neutral report-library-status--${item.status}`}>{status}</span>
            ) : null}
          </span>
          <span className="report-library-row__subtitle type-meta">{reportSubtitle(item)}</span>
          <span className="report-library-row__date type-meta">Created {formatCreatedDate(item.createdAt)}</span>
        </span>
      </button>

      <div className="report-library-row__actions" ref={actionRef}>
        <button
          className="report-library-row__menu-trigger"
          type="button"
          aria-label={`More options for ${item.title}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((current) => !current)}
        >
          <MoreHorizontal size={18} aria-hidden="true" />
        </button>
        {menuOpen ? (
          <div className="report-library-row__menu" role="menu" aria-label={`Options for ${item.title}`}>
            <button
              className="report-library-row__menu-item"
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                void onArchiveChange(item, !archived);
              }}
            >
              {archived ? <RotateCcw size={17} aria-hidden="true" /> : <Archive size={17} aria-hidden="true" />}
              <span>{archived ? "Restore" : "Archive"}</span>
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function ReportTabLabel({ label, count }: { label: string; count: number }) {
  return (
    <span className="report-library-tab-label">
      <span>{label}</span>
      <span className="report-library-tab-count">{count}</span>
    </span>
  );
}

function ReportLibraryEmpty({ view }: { view: "active" | "archived" }) {
  return (
    <div className="report-library-empty">
      <span className="report-library-empty__icon" aria-hidden="true"><FileText size={20} /></span>
      <strong className="type-card-title">{view === "archived" ? "Nothing archived" : "No reports yet"}</strong>
      <p className="type-body-muted">
        {view === "archived"
          ? "Reports you archive will stay available here."
          : "New readings will appear here as soon as they are ready."}
      </p>
    </div>
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
  const activeCount = useMemo(() => items.filter((item) => !item.archivedAt).length, [items]);
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
      <section className="report-library-shell" aria-labelledby="report-library-title">
        <div className="report-library-toolbar">
          <button className="report-library-back floating-back-button" type="button" onClick={() => window.location.assign("/")}>
            <ChevronLeft size={18} aria-hidden="true" />
            <span>TLDR Astro</span>
          </button>
        </div>

        <header className="report-library-header">
          <p className="type-section-label">Your library</p>
          <h1 className="type-page-title" id="report-library-title">Reports</h1>
          <p className="type-body">Your readings are saved here, so you can return to them anytime.</p>
        </header>

        <SegmentedControl
          id="report-library-tabs"
          panelId="report-library-panel"
          className="report-library-tabs"
          value={view}
          ariaLabel="Report library"
          onChange={setView}
          options={[
            { value: "active", label: <ReportTabLabel label="Reports" count={activeCount} /> },
            { value: "archived", label: <ReportTabLabel label="Archived" count={archivedCount} /> }
          ]}
        />

        <section
          className="report-library-list"
          id="report-library-panel"
          role="tabpanel"
          aria-labelledby={`report-library-tabs-${view}-tab`}
          aria-live="polite"
        >
          {status === "loading" ? <p className="report-library-loading type-body-muted">Loading your reports…</p> : null}
          {status === "error" ? <p className="report-library-loading type-body-muted">Your reports could not be loaded right now.</p> : null}
          {status === "ready" && visible.length === 0 ? <ReportLibraryEmpty view={view} /> : null}
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
      <div className="saved-generated-report__toolbar">
        <button className="report-library-back floating-back-button" type="button" onClick={() => window.location.assign("/reports/")}>
          <ChevronLeft size={18} aria-hidden="true" />
          <span>Reports</span>
        </button>
      </div>
      <p className="report-library-loading type-body-muted">{message}</p>
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
      <div className="saved-generated-report__toolbar">
        <button className="report-library-back floating-back-button" type="button" onClick={() => window.location.assign("/reports/")}>
          <ChevronLeft size={18} aria-hidden="true" />
          <span>Reports</span>
        </button>
      </div>
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
        <footer className="type-meta">Created {formatCreatedDate(report.createdAt)}</footer>
      </article>
    </main>
  );
}
