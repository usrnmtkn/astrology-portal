import { Archive, ChevronLeft, FileText, MoreHorizontal, RotateCcw, Share2 } from "lucide-react";
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
import { createReportShareLink } from "../../services/reportSharing";

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

export function formatReadingWindowDates(startValue: string | null, endValue: string | null = startValue) {
  const start = parseReportCalendarDate(startValue);
  const end = parseReportCalendarDate(endValue ?? startValue);
  if (!start) return "";
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

function formatReadingWindow(item: ReportLibraryItem) {
  return formatReadingWindowDates(item.targetDate, item.periodEnd ?? item.targetDate) || item.subtitle;
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

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const input = document.createElement("textarea");
  input.value = value;
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  input.remove();
}

async function shareLink(item: ReportLibraryItem) {
  const url = await createReportShareLink(item);
  if (navigator.share) {
    try {
      await navigator.share({ title: item.title, url });
      return "shared" as const;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled" as const;
    }
  }
  await copyText(url);
  return "copied" as const;
}

function ReportLibraryRow({
  item,
  onArchiveChange,
  onShare
}: {
  item: ReportLibraryItem;
  onArchiveChange: (item: ReportLibraryItem, archived: boolean) => Promise<void>;
  onShare: (item: ReportLibraryItem) => Promise<void>;
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
            {item.status === "ready" ? (
              <button
                className="report-library-row__menu-item"
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  void onShare(item);
                }}
              >
                <Share2 size={17} aria-hidden="true" />
                <span>Share</span>
              </button>
            ) : null}
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
  const [shareNotice, setShareNotice] = useState("");

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

  async function shareReport(item: ReportLibraryItem) {
    try {
      const result = await shareLink(item);
      if (result === "cancelled") return;
      setShareNotice(result === "copied" ? "Share link copied." : "Report shared.");
      window.setTimeout(() => setShareNotice(""), 2600);
    } catch {
      setShareNotice("This report could not be shared right now.");
      window.setTimeout(() => setShareNotice(""), 3200);
    }
  }

  return (
    <main className="report-library-page">
      <section className="report-library-shell" aria-labelledby="report-library-title">
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
            <ReportLibraryRow key={item.id} item={item} onArchiveChange={changeArchive} onShare={shareReport} />
          )) : null}
        </section>
      </section>
      {shareNotice ? <div className="report-library-share-toast" role="status" aria-live="polite">{shareNotice}</div> : null}
    </main>
  );
}

function GeneratedReportState({ message, backHref = "/reports/" }: { message: string; backHref?: string }) {
  return (
    <section className="article-page sky-detail-page saved-generated-report saved-generated-report--state">
      <button
        className="sky-detail-back floating-back-button"
        type="button"
        aria-label="Back"
        onClick={() => window.location.assign(backHref)}
      >
        <ChevronLeft size={18} aria-hidden="true" />
        <span>Back</span>
      </button>
      <article className="article-shell sky-detail-article">
        <div className="article-card sky-detail-card saved-generated-report__state-card">
          <p className="report-library-loading type-body-muted">{message}</p>
        </div>
      </article>
    </section>
  );
}

export function GeneratedReportArticle({
  report,
  backHref = "/reports/"
}: {
  report: GeneratedReportRecord;
  backHref?: string;
}) {
  const readingWindow = formatReadingWindowDates(report.targetDate);
  const paragraphs = report.body.split(/\n{2,}/u).map((paragraph) => paragraph.trim()).filter(Boolean);

  return (
    <section
      className="article-page sky-detail-page saved-generated-report"
      aria-label={`${report.headline ?? "Saved reading"} article`}
      aria-labelledby="saved-generated-report-title"
    >
      <button
        className="sky-detail-back floating-back-button"
        type="button"
        aria-label="Back"
        onClick={() => window.location.assign(backHref)}
      >
        <ChevronLeft size={18} aria-hidden="true" />
        <span>Back</span>
      </button>

      <article className="article-shell sky-detail-article saved-generated-report__article">
        <div className="article-card sky-detail-card saved-generated-report__card">
          <header className="article-id sky-detail-id saved-generated-report__header">
            <div className="article-eyebrow" aria-label="Friends paid reading">
              <span>Friends</span>
              <span className="article-eyebrow__slash" aria-hidden="true">/</span>
              <span>Paid reading</span>
            </div>
            <h1 className="article-title" id="saved-generated-report-title">{report.headline ?? "Saved reading"}</h1>
            {readingWindow ? <p className="article-duration">{readingWindow}</p> : null}
            {report.summary ? (
              <div className="article-tldr">
                <span className="ui-pill ui-pill--neutral article-tldr__label">TLDR</span>
                <p className="article-sub article-tldr__copy">{report.summary}</p>
              </div>
            ) : null}
          </header>

          {paragraphs.length > 0 ? <hr className="article-rule" /> : null}

          {paragraphs.length > 0 ? (
            <div className="article-body-card sky-detail-body saved-generated-report__body">
              <div className="article-body-inner">
                <section className="article-section sky-detail-section">
                  {paragraphs.map((paragraph, index) => (
                    <p key={`${report.id}-paragraph-${index}`}>{paragraph}</p>
                  ))}
                </section>
                <p className="saved-generated-report__created type-meta">Created {formatCreatedDate(report.createdAt)}</p>
                <div className="sky-detail-end" aria-hidden="true">✦</div>
              </div>
            </div>
          ) : null}
        </div>
      </article>
    </section>
  );
}

export function GeneratedReportDeliveryView({ reportId: reportIdProp }: { reportId?: string } = {}) {
  const pathReportId = useMemo(generatedReportIdFromPath, []);
  const reportId = reportIdProp ?? pathReportId;
  const [report, setReport] = useState<GeneratedReportRecord | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    if (!reportId) {
      setStatus("error");
      return () => { cancelled = true; };
    }
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
  return <GeneratedReportArticle report={report} />;
}
