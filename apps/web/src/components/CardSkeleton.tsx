/** The zero-width space preserves the surrounding text's real line box. */
export function SkeletonBar({ title = false, short = false }: { title?: boolean; short?: boolean }) {
  return <><span className={`card-skeleton-bar${title ? " card-skeleton-bar--title" : ""}${short ? " card-skeleton-bar--short" : ""}`} />{"\u200b"}</>;
}

export function LoadingStatus({ children }: { children: string }) {
  return <span className="sr-only" role="status">{children}</span>;
}
