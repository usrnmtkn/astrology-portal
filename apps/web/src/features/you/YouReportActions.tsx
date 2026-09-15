import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listReportLibrary, type ReportLibraryItem } from "../../services/reportLibrary";
import { ReportGenerationBeam } from "../../components/reports/ReportGenerationBeam";
import type { WeeklyHoroscopeAssembly } from "../../services/weeklyHoroscope";
import "../../styles/you-reports.css";
import type { DailyHoroscopeAssembly, PersonalTimingSummary } from "./YouPage";
import {
  buildYouDayReportBrief,
  buildYouWeekReportBrief,
  requestYouTransitReport,
  type YouTransitReportWindow
} from "./youTransitReports";

type ActionState = "checking" | "idle" | "loading" | "queued" | "ready" | "error";

type ReportAction = {
  state: ActionState;
  route: string | null;
  observedUpdate?: string;
};

const idleAction: ReportAction = { state: "idle", route: null };
const checkingAction: ReportAction = { state: "checking", route: null };

export type YouAccountRecovery = {
  error: string | null;
  onRetry: () => void;
  onSignIn: () => void;
};

function isPending(state: ActionState) {
  return state === "checking" || state === "loading" || state === "queued";
}

function findPersistedReport(
  items: ReportLibraryItem[],
  reportWindow: YouTransitReportWindow,
  targetDate: string | null,
  periodEnd: string | null
) {
  if (!targetDate) return null;
  const reportKind = reportWindow === "day" ? "you_day_reading" : "you_week_reading";
  return items.find((item) => (
    item.reportKind === reportKind
    && item.targetDate === targetDate
    && (reportWindow === "day" || item.periodEnd === periodEnd)
  )) ?? null;
}

function reconcileAction(current: ReportAction, item: ReportLibraryItem | null): ReportAction {
  if (current.state === "loading") return current;
  if (!item) {
    return current.state === "queued" ? current : idleAction;
  }
  if (item.status === "ready") return { state: "ready", route: item.route, observedUpdate: item.updatedAt };
  if (item.status === "generating") return { state: "queued", route: null };
  if (current.state === "queued" && current.observedUpdate === item.updatedAt) return current;
  return { state: "error", route: null, observedUpdate: item.updatedAt };
}

export function YouReportActions({
  accountId,
  accountRecovery,
  dailyHoroscopeAssembly,
  dailyUpdateSummary,
  weeklyHoroscopeAssembly,
  transitDateLabel
}: {
  accountId: string | null | undefined;
  accountRecovery?: YouAccountRecovery;
  dailyHoroscopeAssembly?: DailyHoroscopeAssembly | null;
  dailyUpdateSummary?: PersonalTimingSummary | null;
  weeklyHoroscopeAssembly?: WeeklyHoroscopeAssembly | null;
  transitDateLabel: string;
}) {
  const [dayAction, setDayAction] = useState<ReportAction>(checkingAction);
  const [weekAction, setWeekAction] = useState<ReportAction>(checkingAction);
  const [message, setMessage] = useState("");
  // The page owns auth recovery. A second subscription can disagree with the
  // account already displayed by the app; requests still verify the session.
  const session = {
    status: accountId === undefined ? "checking" : accountId ? "ready" : accountRecovery?.error ? "error" : "signed_out",
    userId: accountId ?? null
  };
  const scope = `${session.userId ?? session.status}:${transitDateLabel}`;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const requestVersion = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; ++requestVersion.current; };
  }, []);
  const dayBrief = useMemo(() => buildYouDayReportBrief({
    dateLabel: transitDateLabel,
    dailySummary: dailyUpdateSummary,
    dailyAssembly: dailyHoroscopeAssembly
  }), [dailyHoroscopeAssembly, dailyUpdateSummary, transitDateLabel]);
  const weekBrief = useMemo(() => buildYouWeekReportBrief({
    dateLabel: transitDateLabel,
    weeklyAssembly: weeklyHoroscopeAssembly
  }), [transitDateLabel, weeklyHoroscopeAssembly]);

  const dayTargetDate = dayBrief?.targetDate ?? null;
  const weekTargetDate = weekBrief?.targetDate ?? null;
  const weekPeriodEnd = weekBrief?.periodEnd ?? null;

  const reconcilePersistedReports = useCallback(async () => {
    if (session.status !== "ready" || !session.userId) return;
    const version = ++requestVersion.current;
    const items = await listReportLibrary({ expectedUserId: session.userId });
    if (version !== requestVersion.current || scopeRef.current !== scope) return;
    // A temporarily rebuilding brief is not an empty report library.
    if (dayTargetDate) setDayAction((current) => reconcileAction(current, findPersistedReport(items, "day", dayTargetDate, dayTargetDate)));
    if (weekTargetDate) setWeekAction((current) => reconcileAction(current, findPersistedReport(items, "week", weekTargetDate, weekPeriodEnd)));
  }, [dayTargetDate, weekPeriodEnd, weekTargetDate, session.status, session.userId, scope]);

  useEffect(() => {
    ++requestVersion.current;
    setDayAction(checkingAction);
    setWeekAction(checkingAction);
    setMessage("");
  }, [scope]);

  const shouldPoll = isPending(dayAction.state) || isPending(weekAction.state);
  const generating = session.status === "ready" && [dayAction.state, weekAction.state].some((state) => state === "loading" || state === "queued");
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function check() {
      try {
        await reconcilePersistedReports();
      } catch {
        // Preserve the last known buttons during temporary network/auth errors.
      }
      if (!cancelled && shouldPoll) timer = setTimeout(check, 2_000);
    }
    if (session.status === "ready") void check();
    return () => { cancelled = true; clearTimeout(timer); ++requestVersion.current; };
  }, [reconcilePersistedReports, session.status, shouldPoll]);

  async function createReport(reportWindow: YouTransitReportWindow) {
    const brief = reportWindow === "day" ? dayBrief : weekBrief;
    if (!brief || session.status !== "ready" || !session.userId) return;
    const requestScope = scope;
    ++requestVersion.current;
    const setAction = reportWindow === "day" ? setDayAction : setWeekAction;
    setAction((current) => ({ ...current, state: "loading", route: null }));
    setMessage("");
    try {
      const result = await requestYouTransitReport(brief, session.userId);
      if (!mounted.current || scopeRef.current !== requestScope) return;
      ++requestVersion.current;
      setAction((current) => ({ ...current, state: result.status === "ready" ? "checking" : "queued", route: null }));
      setMessage(result.status === "ready"
        ? `Your ${reportWindow} report is ready.`
        : `Your ${reportWindow} report is being prepared. You can leave this page.`);
      await reconcilePersistedReports().catch(() => undefined);
    } catch (error) {
      if (!mounted.current || scopeRef.current !== requestScope) return;
      ++requestVersion.current;
      setAction({ state: "error", route: null });
      setMessage(error instanceof Error ? error.message : `Your ${reportWindow} report could not be started.`);
    }
  }

  function reportButton(reportWindow: YouTransitReportWindow, action: ReportAction, available: boolean) {
    const pending = session.status === "checking" || (session.status === "ready" && isPending(action.state));
    const ready = session.status === "ready" && action.state === "ready" && Boolean(action.route);
    const label = reportWindow === "day" ? "day" : "week";
    const buttonLabel = ready
      ? `Read ${label} report`
      : action.state === "error"
        ? `Try ${label} report again`
        : `Create ${label} report`;

    return (
      <button
        type="button"
        className={`you-report-actions__button${ready ? " is-ready" : ""}${pending ? " is-loading" : ""}${!available ? " is-unavailable" : ""}`}
        disabled={session.status !== "ready" || (!available && !ready) || pending}
        aria-label={pending ? `${label === "day" ? "Day" : "Week"} report is loading` : undefined}
        onClick={() => {
          if (ready && action.route) {
            window.location.assign(action.route);
            return;
          }
          void createReport(reportWindow);
        }}
      >
        {pending ? (
          <span className="you-report-actions__loading-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        ) : buttonLabel}
      </button>
    );
  }

  return (
    <section className="you-empty-card you-report-actions" aria-label="In-depth transit reports" data-report-generating={generating || undefined}>
      <span>Reports</span>
      <h3>Day and week reports</h3>
      <p>Your day and week readings stay in Reports while they are being prepared and after they are ready.</p>
      <div className="you-report-actions__buttons">
        {reportButton("day", dayAction, Boolean(dayBrief))}
        {reportButton("week", weekAction, Boolean(weekBrief))}
      </div>
      {session.status === "error" ? (
        <>
          <p role="status">{accountRecovery?.error}</p>
          <button type="button" onClick={accountRecovery?.onRetry}>Try again</button>
        </>
      ) : session.status === "signed_out" ? (
        <>
          <p role="status">Sign in to create or read your reports.</p>
          {accountRecovery ? <button type="button" onClick={accountRecovery.onSignIn}>Sign in</button> : null}
        </>
      )
        : message ? <p role="status">{message}</p> : null}
      {generating ? <ReportGenerationBeam /> : null}
    </section>
  );
}
