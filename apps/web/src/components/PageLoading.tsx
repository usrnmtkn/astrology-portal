import { useState, type ComponentProps, type ReactNode } from "react";
import { LoadingStatus, SkeletonBar } from "./CardSkeleton";
import { PageLoadBoundary as SharedPageLoadBoundary } from "../../../../src/shared/components/PageLoading.js";
import { LoadError, LoadErrorState } from "./LoadError";
export { reloadReaderRouteOnce } from "../../../../src/shared/components/PageLoading.js";
type ErrorStateProps = ComponentProps<typeof LoadErrorState>;
export function PageLoadState(props: ErrorStateProps) {
  return <LoadErrorState {...props}/>;
}
export function PageLoadError({ message, onRetry, ...props }: Omit<ErrorStateProps, "failed" | "pending"> & { message?: string }) {
  return <PageLoadState {...props} message={message} onRetry={onRetry} failed pending={false}/>;
}
export function PageLoadBoundary(props: ComponentProps<typeof SharedPageLoadBoundary>) {
  const [attempts, setAttempts] = useState(0);
  return <SharedPageLoadBoundary {...props} renderFallback={props.renderFallback ?? ((detail, retry) => <LoadError scope="page" what="This page" cause={detail} attempts={attempts}
    onRetry={() => {
      setAttempts(value => value + 1);
      // The root fallback previously offered Reload page. A cached rejected
      // React.lazy import needs fresh HTML; route boundaries own their retry.
      if (props.recoveryHref) retry(); else window.location.reload();
    }}/>)}/>;
}

export type LoadingLayout = "reading" | "prose" | "placements" | "people" | "feed" | "articles" | "settings" | "wheel";
export function LoadingLines({ count = 3 }: { count?: number }) {
  return <span className="loading-lines">{Array.from({length:count},(_,index)=><SkeletonBar short={index===count-1} key={index}/>)}</span>;
}
export function LoadingHeading({ action = false }: { action?: boolean }) {
  return <span className="loading-card__heading"><span className="card-skeleton-disc"/><span><SkeletonBar title/><SkeletonBar short/></span>{action?<span className="loading-person-action"/>:null}</span>;
}
/** Reader content keeps its place while data arrives. Startup owns the orbit. */
export function PageLoading({ message = "Loading page…", compact = false, announce = true, layout, children }: {
  message?: string; compact?: boolean; announce?: boolean; layout?: LoadingLayout; children?: ReactNode;
}) {
  const kind = layout ?? (compact ? "prose" : "reading");
  return <div className={`app-loading app-loading--skeleton loading-pattern loading-pattern--${kind}`} aria-busy="true" aria-label={announce ? message : undefined}>
    {announce ? <LoadingStatus>{message}</LoadingStatus> : null}
    <div className="loading-pattern__items card-skeleton" aria-hidden="true">{children ?? (kind === "wheel" ? <span className="loading-wheel-ring"/> : kind === "prose" ? <LoadingLines count={5}/> : <span className="loading-card loading-card--reading"><LoadingHeading/><LoadingLines count={4}/></span>)}</div>
    {kind === "wheel" ? <span className="loading-wheel-label" aria-hidden="true">{message}</span> : null}
  </div>;
}
