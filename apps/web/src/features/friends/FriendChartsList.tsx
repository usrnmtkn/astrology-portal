import { ChevronRight, Clock } from "lucide-react";
import type { ReactNode } from "react";
import type { ManualChart } from "../../services/manualCharts";
import { ChartPatternPill } from "./ChartPatternPill";
import { ContentLoading as PageLoading } from "../../components/LoadingPatterns";
import type { FriendChartListItem } from "./friendChartModel";

export type FriendChartsListProps = {
  birthdayChiclet?: ReactNode;
  charts: FriendChartListItem[];
  isLoading: boolean;
  message: string;
  showMessage: boolean;
  onAddChart: () => void;
  onAddBirthTime: (chart: ManualChart) => void;
  onChartIntent: (chart: ManualChart) => void;
  onOpenChart: (chart: ManualChart) => void;
  embedded?: boolean;
};

export function FriendChartsList({
  birthdayChiclet,
  charts,
  isLoading,
  message,
  showMessage,
  onAddChart,
  onAddBirthTime,
  onChartIntent,
  onOpenChart,
  embedded = false
}: FriendChartsListProps) {
  return (
      <section
        className={embedded
          ? "friends-unified-charts"
          : "manual-chart-workspace manual-chart-workspace-list-only friends-charts-view"}
        aria-label="Friend charts"
      >
        <h2 className="friends-directory-title">Saved charts <span>{charts.length}</span></h2>
        {!embedded && <div className="friends-chart-toolbar">
          <span className="friends-chart-toolbar-copy">
            <span className="eyebrow section-label">Private charts</span>
            <small>Birth details you add manually are visible only to you.</small>
          </span>
          {birthdayChiclet}
          <button className="manual-chart-add-button" type="button" onClick={onAddChart}>
            <span>Add private chart</span>
          </button>
        </div>}

        <section className={embedded ? "friends-unified-chart-list" : "manual-chart-list"} aria-label="Saved charts">
          {showMessage && message ? <p className="manual-chart-message">{message}</p> : null}
          {isLoading && charts.length === 0 && <PageLoading layout="people" message="Loading saved charts…" />}
          {!isLoading && charts.length === 0 && (
            <section className={embedded ? "friends-unified-empty" : "you-empty-card manual-chart-empty"} aria-label="No charts">
              <h3>{embedded ? "No charts yet." : "No private charts yet."}</h3>
              <p>
                {embedded
                  ? "Add someone's birth details to compare charts. Only you can see it."
                  : "Add someone's birth details to compare signs, synastry contacts, house overlays, composite patterns, and current timing."}
              </p>
              {embedded && (
                <button className="social-primary-button" type="button" onClick={onAddChart}>
                  Add a chart
                </button>
              )}
            </section>
          )}
          {charts.length > 0 && (
            <div className="list you-list-card manual-chart-cards" aria-label="Chart list">
              {charts.map(({ chart, initials, sun, moon, rising, needsBirthTime, active, patternSummary }) => (
                <div
                  className="manual-chart-row chart-row"
                  key={chart.id}
                >
                  <button
                    type="button"
                    className={`manual-chart-select ${active ? "active" : ""}`}
                    onClick={() => onOpenChart(chart)}
                    onFocus={() => onChartIntent(chart)}
                    onPointerDown={() => onChartIntent(chart)}
                    onPointerEnter={() => onChartIntent(chart)}
                    aria-label={`Open ${chart.displayName}`}
                  >
                    <span className="manual-chart-avatar" aria-hidden="true">
                      {initials}
                    </span>
                    <span className="crb">
                      <span className="crt">{chart.displayName}</span>
                      <span className="manual-chart-signatures">
                        <span>☉ {sun}</span>
                        <span>☽ {moon}</span>
                        {!needsBirthTime && <span>↑ {rising}</span>}
                        {patternSummary ? <ChartPatternPill summary={patternSummary} /> : null}
                      </span>
                    </span>
                    <span className="manual-chart-open" aria-hidden="true"><ChevronRight size={18} /></span>
                  </button>
                  {needsBirthTime && (
                    <span className="manual-chart-row-cta">
                      <button className="manual-chart-birth-time-button" type="button" onClick={() => onAddBirthTime(chart)}>
                        <Clock size={16} aria-hidden="true" />
                        <span>Add birth time</span>
                      </button>
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
  );
}
