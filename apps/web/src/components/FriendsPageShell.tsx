import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

export type FriendsPageView = "feed" | "circle" | "charts" | "requests" | "profile";
export type FriendsTopLevelView = Exclude<FriendsPageView, "profile">;

export type FriendsPageShellProps = {
  activeView: FriendsPageView;
  beforeTabs?: ReactNode;
  children: ReactNode;
  detailVariant?: string;
  isDetailView: boolean;
  onBackToCharts: () => void;
  backLabel?: string;
};

export function FriendsPageShell({
  activeView,
  beforeTabs,
  children,
  detailVariant,
  isDetailView,
  onBackToCharts,
  backLabel = "Charts",
}: FriendsPageShellProps) {
  const shellClassName = [
    "friends-page page-shell manual-charts-pane",
    isDetailView ? "friend-detail-page" : "",
    isDetailView && detailVariant ? `friend-detail-page--${detailVariant}` : ""
  ].filter(Boolean).join(" ");

  return (
    <section className={shellClassName} aria-label="Friends" data-view={activeView}>
      {isDetailView ? (
        <div className="page-back-row friend-back-row friend-detail-back-row">
          <button className="friends-back-button floating-back-button" type="button" onClick={onBackToCharts} aria-label={backLabel}>
            <ChevronLeft size={21} aria-hidden="true" />
            <span>{backLabel}</span>
          </button>
        </div>
      ) : (
        <>
          {beforeTabs}
        </>
      )}

      {children}
    </section>
  );
}
