import { LoadingStatus, SkeletonBar } from "../CardSkeleton";

export function AspectRowSkeleton() {
  return <button className="article-related-aspect-row aspect-row aspect-row-button card-skeleton" type="button" disabled tabIndex={-1} aria-hidden="true">
    <span className="aspect-row-glyphs">
      <span className="card-skeleton-disc" /><span className="card-skeleton-disc" /><span className="card-skeleton-disc" />
    </span>
    <span className="aspect-row-copy">
      <h4><SkeletonBar title /></h4>
      <span className="aspect-row-timing"><span><SkeletonBar /></span></span>
      <p><SkeletonBar /></p>
      <span className="card-read-more"><SkeletonBar short /></span>
    </span>
    <span className="aspect-row-meta"><span><SkeletonBar short /></span></span>
  </button>;
}

export function AspectListSkeleton({ count = 3 }: { count?: number }) {
  return <div className="aspect-row-list" aria-busy="true">
    <LoadingStatus>Loading aspects…</LoadingStatus>
    {Array.from({ length: count }, (_, index) => <AspectRowSkeleton key={index} />)}
  </div>;
}
