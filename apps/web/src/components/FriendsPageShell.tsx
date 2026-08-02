import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

export type FriendsPageView = "circle" | "charts" | "requests" | "profile";
export type FriendsTopLevelView = Exclude<FriendsPageView, "profile">;

export type FriendsPageShellProps = {
  activeView: FriendsPageView;
  beforeTabs?: ReactNode;
  children: ReactNode;
  detailVariant?: string;
  isDetailView: boolean;
  onBackToCharts: () => void;
};

export function FriendsPageShell({
  activeView,
  beforeTabs,
  children,
  detailVariant,
  isDetailView,
  onBackToCharts,
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
          <button className="friends-back-button floating-back-button" type="button" onClick={onBackToCharts}>
            <ChevronLeft size={21} aria-hidden="true" />
            <span>Charts</span>
          </button>
        </div>
      ) : (
        <>
          <div className="friends-page-heading">
            <h1>friends.</h1>
          </div>
          {beforeTabs}
        </>
      )}

      {children}
    </section>
  );
}
