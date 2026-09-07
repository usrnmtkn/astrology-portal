import { useCallback, useEffect, useMemo, useState } from "react";
import { listReportLibrary, type ReportLibraryItem } from "../../services/reportLibrary";
import type { WeeklyHoroscopeAssembly } from "../../services/weeklyHoroscope";
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
};

const idleAction: ReportAction = { state: "idle", route: null };
const checkingAction: ReportAction = { state: "checking", route: null };

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
  if (!item) {
    return current.state === "loading" || current.state === "queued" ? current : idleAction;
  }
  if (item.status === "ready") return { state: "ready", route: item.route };
  if (item.status === "generating") return { state: "queued", route: null };
  return { state: "error", route: null };
}

export function YouReportActions({
  dailyHoroscopeAssembly,
  dailyUpdateSummary,
  weeklyHoroscopeAssembly,
  transitDateLabel
}: {
  dailyHoroscopeAssembly?: DailyHoroscopeAssembly | null;
  dailyUpdateSummary?: PersonalTimingSummary | null;
  weeklyHoroscopeAssembly?: WeeklyHoroscopeAssembly | null;
  transitDateLabel: string;
}) {
  const [dayAction, setDayAction] = useState<ReportAction>(checkingAction);
  const [weekAction, setWeekAction] = useState<ReportAction>(checkingAction);
  const [message, setMessage] = useState("");
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
    const items = await listReportLibrary();
    const dayItem = findPersistedReport(items, "day", dayTargetDate, dayTargetDate);
    const weekItem = findPersistedReport(items, "week", weekTargetDate, weekPeriodEnd);
    setDayAction((current) => reconcileAction(current, dayItem));
    setWeekAction((current) => reconcileAction(current, weekItem));
  }, [dayTargetDate, weekPeriodEnd, weekTargetDate]);

  useEffect(() => {
    setDayAction(dayTargetDate ? checkingAction : idleAction);
    setWeekAction(weekTargetDate ? checkingAction : idleAction);
    setMessage("");
    void reconcilePersistedReports().catch(() => undefined);
  }, [dayTargetDate, reconcilePersistedReports, weekTargetDate]);

  const shouldPoll = isPending(dayAction.state) || isPending(weekAction.state);
  useEffect(() => {
    if (!shouldPoll) return undefined;
    const interval = window.setInterval(() => {
      void reconcilePersistedReports().catch(() => undefined);
    }, 2_000);
    return () => window.clearInterval(interval);
  }, [reconcilePersistedReports, shouldPoll]);

  async function createReport(reportWindow: YouTransitReportWindow) {
    const brief = reportWindow === "day" ? dayBrief : weekBrief;
    if (!brief) return;
    const setAction = reportWindow === "day" ? setDayAction : setWeekAction;
    setAction({ state: "loading", route: null });
    setMessage("");
    try {
      const result = await requestYouTransitReport(brief);
      setAction({ state: result.status === "ready" ? "checking" : "queued", route: null });
      setMessage(result.status === "ready"
        ? `Your ${reportWindow} report is ready.`
        : `Your ${reportWindow} report is being prepared. You can leave this page.`);
      await reconcilePersistedReports();
    } catch (error) {
      setAction({ state: "error", route: null });
      setMessage(error instanceof Error ? error.message : `Your ${reportWindow} report could not be started.`);
    }
  }

  function reportButton(reportWindow: YouTransitReportWindow, action: ReportAction, available: boolean) {
    const pending = available && isPending(action.state);
    const ready = available && action.state === "ready" && Boolean(action.route);
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
        disabled={!available || pending}
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

  if (!dayBrief && !weekBrief) return null;

  return (
    <section className="you-empty-card you-report-actions" aria-label="In-depth transit reports">
      <span>Reports</span>
      <h3>Day and week reports</h3>
      <p>Your day and week readings stay in Reports while they are being prepared and after they are ready.</p>
      <div className="you-report-actions__buttons">
        {reportButton("day", dayAction, Boolean(dayBrief))}
        {reportButton("week", weekAction, Boolean(weekBrief))}
      </div>
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
