import { Clock, MoreVertical, Pencil, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import type { ManualChart } from "../../services/manualCharts";

export type FriendChartListItem = {
  chart: ManualChart;
  initials: string;
  sun: string;
  moon: string;
  rising: string;
  needsBirthTime: boolean;
  active: boolean;
};

type FriendChartsListProps = {
  birthdayChiclet?: ReactNode;
  charts: FriendChartListItem[];
  isLoading: boolean;
  message: string;
  openChartMenuId: string | null;
  showMessage: boolean;
  onAddChart: () => void;
  onAddBirthTime: (chart: ManualChart) => void;
  onDeleteChart: (chart: ManualChart) => void;
  onEditChart: (chart: ManualChart) => void;
  onOpenChart: (chart: ManualChart) => void;
  onToggleChartMenu: (chartId: string) => void;
};

export function FriendChartsList({
  birthdayChiclet,
  charts,
  isLoading,
  message,
  openChartMenuId,
  showMessage,
  onAddChart,
  onAddBirthTime,
  onDeleteChart,
  onEditChart,
  onOpenChart,
  onToggleChartMenu
}: FriendChartsListProps) {
  return (
    <section className="manual-chart-workspace manual-chart-workspace-list-only friends-charts-view" aria-label="Friend charts">
      <div className="friends-chart-toolbar">
        {birthdayChiclet}
        <button className="manual-chart-add-button" type="button" onClick={onAddChart}>
          <span>Add chart</span>
        </button>
      </div>

      <section className="manual-chart-list" aria-label="Saved manual charts">
        {showMessage && message ? <p className="manual-chart-message">{message}</p> : null}
        {isLoading && (
          <section className="you-empty-card manual-chart-empty" aria-label="Loading charts">
            <span>Charts</span>
            <h3>Loading saved charts.</h3>
            <p>Your saved charts and comparison charts will appear here.</p>
          </section>
        )}
        {!isLoading && charts.length === 0 && (
          <section className="you-empty-card manual-chart-empty" aria-label="No manual charts">
            <span>Charts</span>
            <h3>No saved charts yet.</h3>
            <p>Add someone's birth details to compare signs, synastry contacts, house overlays, composite patterns, and current timing.</p>
          </section>
        )}
        {charts.length > 0 && (
          <div className="list you-list-card manual-chart-cards" aria-label="Manual chart list">
            {charts.map(({ chart, initials, sun, moon, rising, needsBirthTime, active }) => (
              <div className="manual-chart-row chart-row" key={chart.id}>
                <button
                  type="button"
                  className={`manual-chart-select ${active ? "active" : ""}`}
                  onClick={() => onOpenChart(chart)}
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
                      <span>↑ {rising}</span>
                    </span>
                  </span>
                </button>
                {needsBirthTime && (
                  <span className="manual-chart-row-cta">
                    <button className="manual-chart-birth-time-button" type="button" onClick={() => onAddBirthTime(chart)}>
                      <Clock size={16} aria-hidden="true" />
                      <span>Add birth time</span>
                    </button>
                  </span>
                )}
                <span className="manual-chart-actions">
                  <button
                    className="manual-chart-menu-trigger"
                    type="button"
                    aria-label={`More actions for ${chart.displayName}`}
                    aria-expanded={openChartMenuId === chart.id}
                    onClick={() => onToggleChartMenu(chart.id)}
                  >
                    <MoreVertical size={20} aria-hidden="true" />
                  </button>
                  {openChartMenuId === chart.id && (
                    <span className="manual-chart-overflow-menu" role="menu" aria-label={`${chart.displayName} actions`}>
                      <button type="button" role="menuitem" onClick={() => onEditChart(chart)}>
                        <Pencil size={17} aria-hidden="true" />
                        <span>Edit chart</span>
                      </button>
                      <button type="button" role="menuitem" className="manual-chart-delete" onClick={() => onDeleteChart(chart)}>
                        <Trash2 size={17} aria-hidden="true" />
                        <span>Delete chart</span>
                      </button>
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
