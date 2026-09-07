import { FileText } from "lucide-react";
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

  return (
    <section className="you-report-offer you-horoscope-card" aria-label="In-depth transit reports">
      <div className="you-report-offer__icon" aria-hidden="true"><FileText size={18} /></div>
      <div className="you-report-offer__copy">
        <span className="eyebrow section-label">In-depth reports</span>
        <h3>Your transits, pulled together.</h3>
        <p>Create a saved reading for the selected day or the current week. It will stay in Reports while it is being prepared.</p>
      </div>
      <div className="you-report-offer__actions">
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
      </div>
      {message ? (
        <div className={`you-report-offer__message${dayState === "error" || weekState === "error" ? " is-error" : ""}`} role="status">
          <span>{message}</span>
          {dayState === "ready" || dayState === "queued" || weekState === "ready" || weekState === "queued" ? (
            <button type="button" onClick={() => window.location.assign("/reports/")}>Open Reports</button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
