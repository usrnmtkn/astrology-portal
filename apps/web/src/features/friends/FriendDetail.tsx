import { PortalVisibility } from "../../components/portalVisibility";
import { ViewportMenu } from "../../components/ViewportMenu";
import { Check, ChevronDown, MoreVertical } from "lucide-react";
import { useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { ProfileAvatar } from "../../components/ProfileAvatar";
import "../../styles/friends-detail.css";
import "../../styles/profile-overview.css";

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
  editButtonId?: string;
  onTabChange: (tab: FriendDetailTab) => void;
  onTabIntent?: (tab: FriendDetailTab) => void;
  rising: string;
  subtitle?: string;
  sun: string;
  tabs?: FriendDetailTabOption[];
};

const FRIEND_TAB_DESCRIPTIONS: Record<FriendDetailTab, string> = {
  compatibility: "The bottom line on you two.",
  transits: "What is moving through their life right now.",
  natal: "Their individual chart and blueprint.",
  synastry: "Chart-to-chart connections between you.",
  composite: "How the relationship acts when you're together."
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
  editButtonId,
  onTabChange,
  onTabIntent,
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
  const portalsVisible = useContext(PortalVisibility);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const overflowTabs = tabs.filter(({ value }) => (
    value === "synastry" || value === "composite"
  ));
  const overflowActive = overflowTabs.some(({ value }) => value === activeTab);

  useEffect(() => {
    if (!moreOpen || !portalsVisible) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!moreRef.current?.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMoreOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [moreOpen, portalsVisible]);

  function selectTab(tab: FriendDetailTab) {
    setMoreOpen(false);
    onTabChange(tab);
  }

  return (
    <section className={className} aria-label={ariaLabel}>
      <header className="profile-heading friend-profile-heading">
        <div className="friend-hero-card friend-profile-card">
          <ProfileAvatar
            avatarUrl={avatarUrl}
            className="friend-profile-avatar"
            email=""
            name={name || initials}
            size="large"
          />
          <div className="friend-hero-copy">
            <h1>{name}</h1>
            {subtitle ? <span className="friend-profile-handle">{subtitle}</span> : null}
            <span className="manual-chart-signatures sr-only">
              <span>☉ {sun}</span>
              <span>☽ {moon}</span>
              <span>↑ {rising}</span>
            </span>
          </div>
        </div>
        <div className="friend-profile-controls">
        {!isEventChart ? (
          <div
            className="profile-tabs friend-tabs friend-view-tabs friend-chart-tabs"
            role="tablist"
            aria-label="Chart profile sections"
          >
            {tabs.map((tab) => {
              const isActive = tab.value === activeTab;

              return (
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`friend-view-tab${overflowTabs.some(item => item.value === tab.value) ? " friend-view-tab--extended" : ""}${isActive ? " friend-view-tab--active" : ""}`}
                  key={tab.value}
                  onFocus={() => onTabIntent?.(tab.value)}
                  onClick={() => selectTab(tab.value)}
                  onPointerEnter={() => onTabIntent?.(tab.value)}
                >
                  {tab.label}
                </button>
              );
            })}

            {overflowTabs.length ? (
              <div className="friend-view-more" ref={moreRef}>
                <button
                  type="button"
                  className={`friend-view-tab friend-view-more-trigger${overflowActive ? " friend-view-tab--active" : ""}`}
                  aria-label={`More, ${overflowTabs.length} sections`}
                  aria-haspopup="menu"
                  aria-expanded={moreOpen}
                  aria-controls="friend-view-more-menu"
                  onClick={() => setMoreOpen((current) => !current)}
                >
                  <span>More</span>
                  <span className="friend-view-more-count" aria-hidden="true">
                    {overflowTabs.length}
                  </span>
                  <ChevronDown
                    className={moreOpen ? "friend-view-more-chevron friend-view-more-chevron--open" : "friend-view-more-chevron"}
                    size={16}
                    aria-hidden="true"
                  />
                </button>

                {moreOpen ? (
                  <ViewportMenu
                    className="friend-view-more-menu"
                    id="friend-view-more-menu"
                    aria-label="More chart profile sections"
                  >
                    {overflowTabs.map((tab) => {
                      const isActive = tab.value === activeTab;

                      return (
                        <button
                          type="button"
                          role="menuitemradio"
                          aria-checked={isActive}
                          className={isActive ? "friend-view-more-option friend-view-more-option--active" : "friend-view-more-option"}
                          key={tab.value}
                          onFocus={() => onTabIntent?.(tab.value)}
                          onClick={() => selectTab(tab.value)}
                          onPointerEnter={() => onTabIntent?.(tab.value)}
                        >
                          <span className="friend-view-more-option-copy">
                            <strong>{tab.label}</strong>
                            <small>{FRIEND_TAB_DESCRIPTIONS[tab.value]}</small>
                          </span>
                          {isActive ? <Check size={20} aria-hidden="true" /> : null}
                        </button>
                      );
                    })}
                  </ViewportMenu>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
        {onEdit ? (
          <button id={editButtonId} className="friend-kebab" type="button" aria-label={`Edit ${name}`} onClick={onEdit}>
            <MoreVertical size={24} aria-hidden="true" />
          </button>
        ) : null}
        </div>
      </header>
      <div className="relationship-detail-right friend-detail-content-column friend-detail-main chart-layout__content">
        {children}
      </div>

      {chartRail}
    </section>
  );
}
