import { X } from "lucide-react";
import type { ReactNode } from "react";
import { ModalPortal } from "../../components/ModalPortal";
import { RelationshipComparePicker, type RelationshipComparisonOption } from "./RelationshipComparePicker";

export type RelationshipChartFullscreenMode = "synastry" | "composite";

type RelationshipChartFullscreenProps = {
  children: ReactNode;
  comparisonOptions: RelationshipComparisonOption[];
  comparisonPickerOpen: boolean;
  comparisonSelectedId: string;
  mode: RelationshipChartFullscreenMode;
  outerInitials?: string;
  outerName?: string;
  title: string;
  onClose: () => void;
  onComparisonSelect: (id: string) => void;
  onComparisonToggle: () => void;
};

export function RelationshipChartFullscreen({
  children,
  comparisonOptions,
  comparisonPickerOpen,
  comparisonSelectedId,
  mode,
  outerInitials,
  outerName,
  title,
  onClose,
  onComparisonSelect,
  onComparisonToggle
}: RelationshipChartFullscreenProps) {
  const titleId = `relationship-chart-fullscreen-title-${mode}`;

  return (
    <ModalPortal
      className="chart-fullscreen-modal-root"
      panelClassName="chart-fullscreen-panel"
      titleId={titleId}
      width="1240px"
      onClose={onClose}
    >
      <div className="chart-fullscreen-overlay">
        <div className="chart-fullscreen-header">
          <h2 className="chart-fullscreen-title" id={titleId}>{title}</h2>
          <button className="chart-fullscreen-close" type="button" aria-label="Close full-screen chart" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="chart-fullscreen-wheel-wrap">
          <div className="chart-shell chart-shell--fullscreen">
            <div className="wheel natal-wheel friend-wheel chart-frame" aria-label={title}>
              {children}
            </div>
          </div>
        </div>

        <div className="chart-fullscreen-footer">
          {mode === "composite" ? (
            <div className="friend-chart-legend chart-fullscreen-legend" aria-label="Composite chart label">
              <span>Composite chart</span>
            </div>
          ) : null}

          <div className="chart-fullscreen-controls">
            <RelationshipComparePicker
              variant={mode}
              outerName={mode === "synastry" ? outerName : undefined}
              outerInitials={mode === "synastry" ? outerInitials : undefined}
              options={comparisonOptions}
              selectedId={comparisonSelectedId}
              open={comparisonPickerOpen}
              onToggle={onComparisonToggle}
              onSelect={onComparisonSelect}
            />
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
