import { SkeletonBar } from "./CardSkeleton";
import { LoadingHeading, LoadingLines, PageLoading, type LoadingLayout } from "./PageLoading";
import "../styles/loading-patterns.css";

/** Lists and covers travel with their deferred reader pages. */
export function ContentLoading({ message, layout, count = 3, announce = true }: { message?: string; layout: Exclude<LoadingLayout,"reading"|"prose"|"wheel">; count?: number; announce?: boolean }) {
  return <PageLoading message={message} layout={layout} announce={announce}>{Array.from({length:count},(_,index)=>
    layout === "articles" ? <span className="loading-cover" key={index}><span className="loading-cover__art"/><SkeletonBar title/><SkeletonBar short/></span> : layout === "settings" ? <span className="loading-settings-row" key={index}><SkeletonBar/><SkeletonBar short/></span> : <span className={`loading-card loading-card--${layout}`} key={index}>
      {layout === "placements" ? <SkeletonBar short/> : null}<LoadingHeading action={layout === "people"}/>{layout !== "people" ? <LoadingLines/> : null}
      {layout === "placements" ? <span className="loading-placement-arc"><svg viewBox="0 0 300 64" fill="none"><path d="M4 48 Q150 -20 296 48"/></svg><SkeletonBar short/></span> : null}
    </span>
  )}</PageLoading>;
}
