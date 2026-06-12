import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { SegmentedControl } from "./SegmentedControl";

export type FriendsPageView = "circle" | "charts" | "profile";
export type FriendsTopLevelView = Exclude<FriendsPageView, "profile">;

export function FriendsPageShell({
  activeView,
  children,
  detailVariant,
  isDetailView,
  onBackToCharts,
  onSelectView
}: {
  activeView: FriendsPageView;
  children: ReactNode;
  detailVariant?: string;
  isDetailView: boolean;
  onBackToCharts: () => void;
  onSelectView: (view: FriendsTopLevelView) => void;
}) {
  const shellClassName = [
    "friends-page page-shell manual-charts-pane",
    isDetailView ? "friend-detail-page" : "",
    isDetailView && detailVariant ? `friend-detail-page--${detailVariant}` : ""
  ].filter(Boolean).join(" ");

  return (
    <section className={shellClassName} aria-label="Friends">
      {isDetailView ? (
        <div className="page-back-row friend-back-row friend-detail-back-row">
          <button className="friends-back-button floating-back-button" type="button" onClick={onBackToCharts}>
            <ChevronLeft size={21} aria-hidden="true" />
            <span>Charts</span>
          </button>
        </div>
      ) : (
        <>
          <div className="friends-page-heading">
            <h2>friends.</h2>
          </div>
          <SegmentedControl<FriendsTopLevelView>
            value={activeView === "profile" ? "charts" : activeView}
            options={[
              { value: "circle", label: "Circle" },
              { value: "charts", label: "Charts" }
            ]}
            onChange={onSelectView}
            ariaLabel="Friends views"
            className="app-tabs profile-tabs friends-top-tabs friends-tabs"
          />
        </>
      )}

      {children}
    </section>
  );
}
