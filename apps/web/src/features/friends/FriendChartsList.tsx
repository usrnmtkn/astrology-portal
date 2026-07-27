import { Clock, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { ManualChart } from "../../services/manualCharts";
import type { NatalAspectPatternPillSummary } from "../../services/natalAspectPatterns";
import { ChartPatternPill } from "./ChartPatternPill";

export type FriendChartListItem = {
  chart: ManualChart;
  initials: string;
  sun: string;
  moon: string;
  rising: string;
  needsBirthTime: boolean;
  active: boolean;
  patternSummary: NatalAspectPatternPillSummary | null;
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
  embedded?: boolean;
};

type MenuPosition = {
  top: number;
  right: number;
};

function chartSyncStatusLabel(chart: ManualChart) {
  if (chart.syncStatus === "synced") {
    return "Saved";
  }

  return "Saved locally";
}

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
  onToggleChartMenu,
  embedded = false
}: FriendChartsListProps) {
  const triggerRefs = useRef(new Map<string, HTMLButtonElement>());
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const activeMenuItem = useMemo(
    () => charts.find(({ chart }) => chart.id === openChartMenuId) ?? null,
    [charts, openChartMenuId]
  );
  const setMenuTriggerRef = useCallback(
    (chartId: string) => (node: HTMLButtonElement | null) => {
      if (node) {
        triggerRefs.current.set(chartId, node);
      } else {
        triggerRefs.current.delete(chartId);
      }
    },
    []
  );

  useEffect(() => {
    if (!openChartMenuId) {
      setMenuPosition(null);
      return undefined;
    }

    const chartId = openChartMenuId;

    function updateMenuPosition() {
      const trigger = triggerRefs.current.get(chartId);
      if (!trigger) {
        setMenuPosition(null);
        return;
      }

      const rect = trigger.getBoundingClientRect();
      const gutter = 16;
      const menuWidth = 260;
      const menuHeight = 126;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const right = Math.max(gutter, Math.min(viewportWidth - rect.right, viewportWidth - menuWidth - gutter));
      const belowTop = rect.bottom + 8;
      const top = belowTop + menuHeight > viewportHeight - gutter ? Math.max(gutter, rect.top - menuHeight - 8) : belowTop;

      setMenuPosition({ top, right });
    }

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [openChartMenuId]);

  return (
    <>
      <section
        className={embedded
          ? "friends-unified-charts"
          : "manual-chart-workspace manual-chart-workspace-list-only friends-charts-view"}
        aria-label="Friend charts"
      >
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
          {isLoading && (
            <section className="you-empty-card manual-chart-empty" aria-label="Loading charts">
              <span>Charts</span>
              <h3>Loading saved charts.</h3>
              <p>Your saved charts and comparison charts will appear here.</p>
            </section>
          )}
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
                  className={`manual-chart-row chart-row${openChartMenuId === chart.id ? " manual-chart-row--menu-open" : ""}`}
                  key={chart.id}
                >
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
                        {patternSummary ? <ChartPatternPill summary={patternSummary} /> : null}
                        <span className="manual-chart-sync-status" role="status">
                          {chartSyncStatusLabel(chart)}
                        </span>
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
                      ref={setMenuTriggerRef(chart.id)}
                      className="manual-chart-menu-trigger"
                      type="button"
                      aria-label={`More actions for ${chart.displayName}`}
                      aria-expanded={openChartMenuId === chart.id}
                      onClick={() => onToggleChartMenu(chart.id)}
                    >
                      <MoreVertical size={20} aria-hidden="true" />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
      {activeMenuItem && menuPosition && typeof document !== "undefined"
        ? createPortal(
            <span
              className="manual-chart-overflow-menu manual-chart-overflow-menu--portal"
              role="menu"
              aria-label={`${activeMenuItem.chart.displayName} actions`}
              style={{ top: menuPosition.top, right: menuPosition.right }}
            >
              <button type="button" role="menuitem" onClick={() => onEditChart(activeMenuItem.chart)}>
                <Pencil size={17} aria-hidden="true" />
                <span>Edit</span>
              </button>
              <button type="button" role="menuitem" className="manual-chart-delete" onClick={() => onDeleteChart(activeMenuItem.chart)}>
                <Trash2 size={17} aria-hidden="true" />
                <span>Delete</span>
              </button>
            </span>,
            document.body
          )
        : null}
    </>
  );
}
