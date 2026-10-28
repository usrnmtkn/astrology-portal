import { ViewportMenu } from "../ViewportMenu";
import { getVerifiedAuthUser } from "../../services/auth";
import { FormattedProse } from "../FormattedProse";
import { Archive, Link2Off, MoreHorizontal, RotateCcw, Share2, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { SegmentedControl } from "../SegmentedControl";
import {
  deleteReport,
  listReportLibrary,
  loadGeneratedReportById,
  markReportArchived,
  markReportSeen,
  type GeneratedReportRecord,
  type ReportLibraryItem
} from "../../services/reportLibrary";
import { createReportShareLink, stopReportSharing } from "../../services/reportSharing";
import { ReportGenerationBeam } from "./ReportGenerationBeam";
import { PageLoadState } from "../PageLoading";
import { ReaderUnavailable } from "../ReaderUnavailable";
import { ModalDialog } from "../ModalDialog";
import { ReportBack, ReportStateCard } from "./ReportStateCard";
import { isFriendRelationshipHeading } from "../../../../../src/reporting/friendReportStructure";

const reportMonthNames = [
  "Jan", "Feb", "Mar", "Apr", "May", "June",
  "July", "Aug", "Sept", "Oct", "Nov", "Dec"
] as const;
const reportLibraryPollMs = 10_000;

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
  if (item.reportKind === "friend_transit_reading") return ["Friends", item.subjectLabel].filter(Boolean).join(" · ");
  if (item.reportKind === "you_day_reading") return "You · Day report";
  if (item.reportKind === "you_week_reading") return "You · Week report";
  return "You · Paid reading";
}
function reportGlyph(item: ReportLibraryItem) {
  return item.reportKind === "you_day_reading" ? "☉" : item.reportKind === "you_week_reading" ? "☽" : item.reportKind === "friend_transit_reading" ? "♀" : "✶";
}
function statusTone(label: string) {
  return label === "New" ? "success" : label === "Needs review" || label === "Needs attention" ? "warning" : label === "Could not finish" ? "error" : "info";
}

function statusLabel(item: ReportLibraryItem) {
  if (item.status === "ready") return item.seenAt ? null : "New";
  if (item.progressLabel) return item.progressLabel;
  if (item.status === "needs_attention") return "Needs attention";
  return "Preparing";
}

async function openItem(item: ReportLibraryItem) {
  const currentOwner = async () => (await getVerifiedAuthUser())?.id === item.ownerId;
  try {
    if (!await currentOwner()) return;
    if (item.status === "ready") await markReportSeen(item).catch(() => undefined);
    if (await currentOwner()) window.location.assign(item.route);
  } catch { /* Account recovery remains on the current page. */ }
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
  onDelete,
  deleting,
  onShare,
  onStopSharing
}: {
  item: ReportLibraryItem;
  onArchiveChange: (item: ReportLibraryItem, archived: boolean) => Promise<void>;
  deleting: boolean;
  onDelete: (item: ReportLibraryItem) => void;
  onShare: (item: ReportLibraryItem) => Promise<void>;
  onStopSharing: (item: ReportLibraryItem) => Promise<void>;
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
    <article className="report-library-row" data-report-status={item.status} data-report-generating={item.status === "generating" || undefined}>
      <button className="report-library-row__open" type="button" onClick={() => openItem(item)}>
        <span className="report-library-row__icon" aria-hidden="true">{reportGlyph(item)}{item.status === "ready" && !item.seenAt && <span className="report-library-row__unread"/>}</span>
        <span className="report-library-row__copy">
          <strong className="report-library-row__title type-card-title">{item.title}</strong>
          <span className="report-library-row__subtitle type-meta">{reportSubtitle(item)}<span className="report-library-row__mobile-date"> · {formatCreatedDate(item.createdAt)}</span></span>
        </span>
        <span className="report-library-row__trailing">
          {status && <span className={`report-library-status report-library-status--${statusTone(status)}`}>{status}</span>}
          <span className="report-library-row__date type-meta">{formatCreatedDate(item.createdAt)}</span>
        </span>
      </button>

      {item.status === "generating" ? <ReportGenerationBeam /> : null}
      <div className="report-library-row__actions" ref={actionRef}>
        <button
          className="report-library-row__menu-trigger"
          id={`report-options-${item.id}`}
          type="button"
          aria-label={`More options for ${item.title}`}
          disabled={deleting}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((current) => !current)}
        >
          <MoreHorizontal size={18} aria-hidden="true" />
        </button>
        {menuOpen ? (
          <ViewportMenu className="report-library-row__menu" aria-label={`Options for ${item.title}`}>
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
            {item.status === "ready" && item.isShared ? (
              <button
                className="report-library-row__menu-item"
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  void onStopSharing(item);
                }}
              >
                <Link2Off size={17} aria-hidden="true" />
                <span>Stop sharing</span>
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
            <button
              className="report-library-row__menu-item report-library-row__menu-item--danger"
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                void onDelete(item);
              }}
            >
              <Trash2 size={17} aria-hidden="true" />
              <span>Delete</span>
            </button>
          </ViewportMenu>
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
  return <div className="report-library-empty"><ReportStateCard library title={view === "archived" ? "Nothing archived" : "No reports yet"}
    message={view === "archived" ? "Reports you archive will stay available here." : "New readings will appear here as soon as they are ready."}/></div>;

}

export function ReportLibraryView({ accessFallback }: { accessFallback?: ReactNode } = {}) {
  const [items, setItems] = useState<ReportLibraryItem[]>([]);
  const [view, setView] = useState<"active" | "archived">("active");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [shareNotice, setShareNotice] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<ReportLibraryItem | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const refreshVersion = useRef(0);

  async function refresh() {
    const version = ++refreshVersion.current;
    try {
      const nextItems = await listReportLibrary();
      if (version !== refreshVersion.current) return;
      setItems(nextItems);
      setStatus("ready");
    } catch {
      if (version === refreshVersion.current) setStatus("error");
    }
  }

  useEffect(() => {
    if (accessFallback) return;
    void refresh();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, reportLibraryPollMs);
    return () => { ++refreshVersion.current; window.clearInterval(interval); };
  }, []);

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

  async function removeReport(item: ReportLibraryItem) {
    if (deletingId) return;
    setDeleteError("");
    setDeletingId(item.id);
    try {
      await deleteReport(item);
      ++refreshVersion.current;
      setItems((current) => current.filter((report) => report.id !== item.id));
      setDeleteCandidate(null);
      setShareNotice("Report deleted.");
    } catch {
      setDeleteError("This report could not be deleted. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  async function shareReport(item: ReportLibraryItem) {
    try {
      const result = await shareLink(item);
      if (result === "cancelled") return;
      await refresh();
      setShareNotice(result === "copied" ? "Share link copied." : "Report shared.");
      window.setTimeout(() => setShareNotice(""), 2600);
    } catch {
      setShareNotice("This report could not be shared right now.");
      window.setTimeout(() => setShareNotice(""), 3200);
    }
  }

  async function stopSharingReport(item: ReportLibraryItem) {
    try {
      await stopReportSharing(item);
      await refresh();
      setShareNotice("Sharing stopped.");
      window.setTimeout(() => setShareNotice(""), 2600);
    } catch {
      setShareNotice("Sharing could not be stopped right now.");
      window.setTimeout(() => setShareNotice(""), 3200);
    }
  }

  return (
    <main className="report-library-page">
      <section className="report-library-shell" aria-labelledby="report-library-title">
        <header className="report-library-header">
          <ReportBack href="/#you" className="report-library-back"/>
          <h1 className="type-page-title" id="report-library-title" tabIndex={-1}>Reports</h1>

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
        </header>

        <section
          className="report-library-list"
          id="report-library-panel"
          role="tabpanel"
          aria-labelledby={`report-library-tabs-${view}-tab`}
          aria-live="polite"
        >
          {accessFallback}
          {!accessFallback && <PageLoadState scope="page" message="Your reports could not be loaded right now." failed={status === "error"} pending={status === "loading"} onRetry={() => { setStatus("loading"); return refresh(); }}>
            {status === "loading" ? <ReportStateCard library loading message="Loading your reports…"/> : null}
          </PageLoadState>}
          {!accessFallback && status === "ready" && visible.length === 0 ? <ReportLibraryEmpty view={view} /> : null}
          {!accessFallback && status === "ready" ? visible.map((item) => (
            <ReportLibraryRow
              key={item.id}
              item={item}
              onArchiveChange={changeArchive}
              onDelete={item => { setDeleteError(""); setDeleteCandidate(item); }}
              deleting={deletingId !== null}
              onShare={shareReport}
              onStopSharing={stopSharingReport}
            />
          )) : null}
        </section>
      </section>
      {deleteCandidate && <ModalDialog variant="confirm" title={`Delete “${deleteCandidate.title}”?`}
        onClose={() => { if (!deletingId) setDeleteCandidate(null); }}
        restoreFocusId={deletingId ? "report-library-title" : `report-options-${deleteCandidate.id}`}
        actions={<>
          <button className="modal-action" type="button" disabled={Boolean(deletingId)} onClick={() => setDeleteCandidate(null)}>Cancel</button>
          <button className="modal-action modal-action--danger" type="button" disabled={Boolean(deletingId)} onClick={() => void removeReport(deleteCandidate)}>{deletingId ? "Deleting…" : "Delete"}</button>
        </>}>
        <p>This removes it from your reports and archive. Shared links will stop working. You cannot restore it from the library.</p>
        {deleteError && <p role="alert">{deleteError}</p>}
      </ModalDialog>}
      {shareNotice ? <div className="report-library-share-toast" role="status" aria-live="polite">{shareNotice}</div> : null}
    </main>
  );
}

function GeneratedReportState({ message, backHref = "/reports/" }: { message: string; backHref?: string }) {
  return <ReportStateCard title={message === "Loading report…" ? "Preparing your report" : message} loading={message === "Loading report…"} backHref={backHref}
    action={message === "Loading report…" ? undefined : {label:"Back to Reports",href:backHref}}/>;
}

export function GeneratedReportArticle({
  report,
  backHref = "/reports/"
}: {
  report: GeneratedReportRecord;
  backHref?: string;
}) {
  const readingWindow = formatReadingWindowDates(report.targetDate, report.periodEnd ?? report.targetDate);
  const paragraphs = report.body.split(/\n{2,}/u).map((paragraph) => paragraph.trim()).filter(Boolean);
  const isFriendsReading = report.subjectType === "friend_transit_reading";
  const reportLabel = report.subjectType === "you_week_reading" ? "Week report" : report.subjectType === "you_day_reading" ? "Day report" : "Paid reading";
  const surfaceLabel = isFriendsReading ? "Friends" : "You";

  return (
    <section
      className="article-page sky-detail-page saved-generated-report"
      aria-label={`${report.headline ?? "Saved reading"} article`}
      aria-labelledby="saved-generated-report-title"
    >
      <ReportBack href={backHref}/>

      <article className="article-shell sky-detail-article saved-generated-report__article">
        <div className="article-card sky-detail-card saved-generated-report__card">
          <header className="article-id sky-detail-id saved-generated-report__header report-cover">
            <div className="report-label" aria-label={`${surfaceLabel} ${reportLabel}`}>
              <span>{surfaceLabel}</span>
              <span className="article-eyebrow__slash" aria-hidden="true">/</span>
              <span>{reportLabel}</span>
            </div>
            <h1 className="article-title" id="saved-generated-report-title">{report.headline ?? "Saved reading"}</h1>
            {readingWindow ? <p className="report-cover__meta">{readingWindow}</p> : null}
            {report.summary ? (
              <div className="article-tldr">
                <FormattedProse className="report-cover__subtitle article-tldr__copy" text={report.summary} />
              </div>
            ) : null}
          </header>

          {paragraphs.length > 0 ? <hr className="article-rule" /> : null}

          {paragraphs.length > 0 ? (
            <div className="report-chapter saved-generated-report__body">
              <div className="article-body-inner report-chapter__copy">
                <section className="article-section sky-detail-section">
                  {paragraphs.map((paragraph, index) => (
                    isFriendsReading && isFriendRelationshipHeading(paragraph, report.subjectLabel)
                      ? <h2 key={`${report.id}-paragraph-${index}`}>{paragraph.slice(3)}</h2>
                      : <FormattedProse key={`${report.id}-paragraph-${index}`} text={paragraph} />
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
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "missing">("loading");
  const [attempt, setAttempt] = useState(0);
  const [failure, setFailure] = useState<unknown>();

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    if (!reportId) {
      setStatus("missing");
      return () => { cancelled = true; };
    }
    void loadGeneratedReportById(reportId).then(async (value) => {
      if (cancelled) return;
      if (!value) {
        setStatus("missing");
        return;
      }
      setReport(value);
      setStatus("ready");
      try {
        await markReportSeen({ sourceKind: "generated_interpretation", sourceId: value.id });
      } catch {
        // The saved reading remains readable even if its notification state cannot update.
      }
    }).catch(error => {
      if (!cancelled) { setFailure(error); setStatus("error"); }
    });
    return () => { cancelled = true; };
  }, [reportId, attempt]);

  if (status === "loading" || status === "error") return <PageLoadState scope="page" what="This report" cause={failure} failed={status === "error"} pending={status === "loading"} onRetry={() => setAttempt(value => value + 1)}><GeneratedReportState message="Loading report…" /></PageLoadState>;
  if (status === "missing" || !report) return <ReaderUnavailable kind="report"/>;
  return <GeneratedReportArticle report={report} />;
}
