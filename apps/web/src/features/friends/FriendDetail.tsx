import { MoreVertical } from "lucide-react";
import type { ReactNode } from "react";
import { SegmentedControl } from "../../components/SegmentedControl";

export type FriendDetailTab = "compatibility" | "transits" | "natal" | "synastry" | "composite";
export type FriendDetailTabOption = {
  value: FriendDetailTab;
  label: string;
};

type FriendDetailProps = {
  activeTab: FriendDetailTab;
  ariaLabel: string;
  chartRail: ReactNode;
  children: ReactNode;
  className: string;
  initials: string;
  isEventChart: boolean;
  moon: string;
  name: string;
  onEdit: () => void;
  onTabChange: (tab: FriendDetailTab) => void;
  rising: string;
  sun: string;
  tabs?: FriendDetailTabOption[];
};

export function FriendDetail({
  activeTab,
  ariaLabel,
  chartRail,
  children,
  className,
  initials,
  isEventChart,
  moon,
  name,
  onEdit,
  onTabChange,
  rising,
  sun,
  tabs = [
    { value: "compatibility", label: "Compatibility" },
    { value: "transits", label: "Transits" },
    { value: "natal", label: "Natal" },
    { value: "synastry", label: "Synastry" },
    { value: "composite", label: "Composite" }
  ]
}: FriendDetailProps) {
  return (
    <section className={className} aria-label={ariaLabel}>
      <div className="relationship-detail-right friend-detail-content-column friend-detail-main chart-layout__content">
        <div className="friend-hero-card friend-profile-card">
          <span className="manual-chart-avatar friend-profile-avatar" aria-hidden="true">
            {initials}
          </span>
          <div className="friend-hero-copy">
            <h2>{name}</h2>
            <span className="manual-chart-signatures">
              <span>☉ {sun}</span>
              <span>☽ {moon}</span>
              <span>↑ {rising}</span>
            </span>
          </div>
          <button className="friend-kebab" type="button" aria-label={`Edit ${name}`} onClick={onEdit}>
            <MoreVertical size={24} aria-hidden="true" />
          </button>
        </div>

        {!isEventChart ? (
          <SegmentedControl<FriendDetailTab>
            value={activeTab}
            options={tabs}
            onChange={onTabChange}
            ariaLabel="Chart profile sections"
            className="app-tabs profile-tabs friend-tabs friend-view-tabs friend-chart-tabs"
            scroll
          />
        ) : null}

        {children}
      </div>

      {chartRail}
    </section>
  );
}
