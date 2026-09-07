import { useMemo, useState } from "react";
import type { WeeklyHoroscopeAssembly } from "../../services/weeklyHoroscope";
import type { DailyHoroscopeAssembly, PersonalTimingSummary } from "./YouPage";
import {
  buildYouDayReportBrief,
  buildYouWeekReportBrief,
  requestYouTransitReport,
  type YouTransitReportWindow
} from "./youTransitReports";

type ActionState = "idle" | "loading" | "queued" | "ready" | "error";

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
  const [dayState, setDayState] = useState<ActionState>("idle");
  const [weekState, setWeekState] = useState<ActionState>("idle");
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

  async function createReport(window: YouTransitReportWindow) {
    const brief = window === "day" ? dayBrief : weekBrief;
    if (!brief) return;
    const setState = window === "day" ? setDayState : setWeekState;
    setState("loading");
    setMessage("");
    try {
      const result = await requestYouTransitReport(brief);
      setState(result.status === "ready" ? "ready" : "queued");
      setMessage(result.status === "ready"
        ? `Your ${window} report is ready in Reports.`
        : `Your ${window} report is being prepared in Reports. You can leave this page.`);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : `Your ${window} report could not be started.`);
    }
  }

  if (!dayBrief && !weekBrief) return null;

  const reportStarted = [dayState, weekState].some((state) => state === "ready" || state === "queued");

  return (
    <section className="you-empty-card" aria-label="In-depth transit reports">
      <span>Reports</span>
      <h3>Day and week reports</h3>
      <p>Create a saved reading for the selected day or the current week. It will stay in Reports while it is being prepared.</p>
      <button
        type="button"
        disabled={!dayBrief || dayState === "loading"}
        onClick={() => void createReport("day")}
      >
        {dayState === "loading" ? "Starting…" : dayState === "queued" ? "Day report preparing" : dayState === "ready" ? "Day report ready" : "Create day report"}
      </button>
      <button
        type="button"
        disabled={!weekBrief || weekState === "loading"}
        onClick={() => void createReport("week")}
      >
        {weekState === "loading" ? "Starting…" : weekState === "queued" ? "Week report preparing" : weekState === "ready" ? "Week report ready" : "Create week report"}
      </button>
      {message ? <p role="status">{message}</p> : null}
      {reportStarted ? (
        <button type="button" onClick={() => window.location.assign("/reports/")}>Open Reports →</button>
      ) : null}
    </section>
  );
}
