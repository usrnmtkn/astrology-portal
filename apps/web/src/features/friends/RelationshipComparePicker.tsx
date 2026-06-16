import { Check, ChevronDown, X } from "lucide-react";
import { ModalPortal } from "../../components/ModalPortal";
import type { SkySnapshot } from "../../types";

export type RelationshipComparisonOption = {
  id: string;
  displayName: string;
  initials: string;
  subtitle: string;
  natalChart: SkySnapshot | null;
  isSelf: boolean;
};

type RelationshipComparePickerProps = {
  variant: "synastry" | "composite";
  outerName?: string;
  outerInitials?: string;
  options: RelationshipComparisonOption[];
  selectedId: string;
  open: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
};

export function RelationshipComparePicker({
  variant,
  outerName,
  outerInitials,
  options,
  selectedId,
  open,
  onToggle,
  onSelect
}: RelationshipComparePickerProps) {
  const selectedOption = options.find((option) => option.id === selectedId) ?? options[0];

  if (!selectedOption) {
    return null;
  }

  return (
    <div className={`friend-compare-control friend-compare-control-${variant}`}>
      {variant === "synastry" && (
        <div className="friend-chart-legend friend-chart-legend-target" aria-label="Chart comparison legend">
          <span className="friend-chart-legend-item friend-chart-legend-item-outer">
            <b aria-hidden="true" />
            <strong>{outerName ?? outerInitials ?? "Outer"} · outer ring</strong>
          </span>
          <span className="friend-chart-legend-item friend-chart-legend-item-inner">
            <b aria-hidden="true" />
            <strong>{selectedOption.displayName} · inner ring</strong>
          </span>
        </div>
      )}
      <button
        type="button"
        className="friend-compare-pill"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className="friend-compare-pill-inner">
          <span className="friend-compare-customise">With</span>
          <span className="friend-compare-avatar" aria-hidden="true">{selectedOption.initials}</span>
          <strong>{selectedOption.displayName}</strong>
          <ChevronDown size={18} aria-hidden="true" />
        </span>
      </button>
      {open && (
        <ModalPortal
          className="friend-compare-modal-root"
          closeOnBackdrop
          onClose={onToggle}
          panelClassName="friend-compare-popover"
          titleId={`friend-compare-title-${variant}`}
          width="min(420px, calc(100vw - 48px))"
        >
          <button className="friend-compare-close modal-close" type="button" aria-label="Close compare picker" onClick={onToggle}>
            <X size={16} aria-hidden="true" />
          </button>
          <span className="eyebrow section-label">Compare with</span>
          <h3 className="sr-only" id={`friend-compare-title-${variant}`}>Compare with saved chart</h3>
          <div className="friend-compare-list">
            {options.map((option) => (
              <button
                type="button"
                role="radio"
                aria-checked={option.id === selectedOption.id}
                className={option.id === selectedOption.id ? "selected" : ""}
                key={option.id}
                onClick={() => onSelect(option.id)}
              >
                <span className="friend-compare-avatar" aria-hidden="true">{option.initials}</span>
                <span className="friend-compare-option-copy">
                  <strong>{option.displayName}</strong>
                  <small>{option.subtitle}</small>
                </span>
                {option.id === selectedOption.id && <Check size={20} aria-hidden="true" />}
              </button>
            ))}
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
