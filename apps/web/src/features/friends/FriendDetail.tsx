import { MoreVertical } from "lucide-react";
import type { ReactNode } from "react";
import { ProfileAvatar } from "../../components/ProfileAvatar";
import { SegmentedControl } from "../../components/SegmentedControl";

export type FriendDetailTab = "compatibility" | "transits" | "natal" | "synastry" | "composite";
export type FriendDetailTabOption = {
  value: FriendDetailTab;
  label: string;
};

type FriendDetailProps = {
  activeTab: FriendDetailTab;
  ariaLabel: string;
  avatarUrl?: string;
  chartRail: ReactNode;
  children: ReactNode;
  className: string;
  initials: string;
  isEventChart: boolean;
  moon: string;
  name: string;
  onEdit?: () => void;
  onTabChange: (tab: FriendDetailTab) => void;
  rising: string;
  subtitle?: string;
  sun: string;
  tabs?: FriendDetailTabOption[];
};

export function FriendDetail({
  activeTab,
  ariaLabel,
  avatarUrl,
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
  subtitle,
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
          <ProfileAvatar
            avatarUrl={avatarUrl}
            className="friend-profile-avatar"
            email=""
            name={name || initials}
            size="large"
          />
          <div className="friend-hero-copy">
            <h2>{name}</h2>
            {subtitle ? <span className="friend-profile-handle">{subtitle}</span> : null}
            <span className="manual-chart-signatures">
              <span>☉ {sun}</span>
              <span>☽ {moon}</span>
              <span>↑ {rising}</span>
            </span>
          </div>
          {onEdit ? (
            <button className="friend-kebab" type="button" aria-label={`Edit ${name}`} onClick={onEdit}>
              <MoreVertical size={24} aria-hidden="true" />
            </button>
          ) : null}
        </div>

        {!isEventChart ? (
          <SegmentedControl<FriendDetailTab>
            value={activeTab}
            options={tabs}
            onChange={onTabChange}
            ariaLabel="Chart profile sections"
            className="app-tabs profile-tabs friend-tabs friend-view-tabs friend-chart-tabs"
          />
        ) : null}

        {children}
      </div>

      {chartRail}
    </section>
  );
}
