import type { ReactNode } from "react";

/** Known content supplies wrapping only; the whole skeleton stays aria-hidden. */
export function SkeletonText({ children }: { children: ReactNode }) {
  return <span className="card-skeleton-text"><span className="card-skeleton-text__measure">{children}</span><span className="card-skeleton-text__bars" /></span>;
}

/** The zero-width space preserves the surrounding text's real line box. */
export function SkeletonBar({ title = false, short = false }: { title?: boolean; short?: boolean }) {
  return <><span className={`card-skeleton-bar${title ? " card-skeleton-bar--title" : ""}${short ? " card-skeleton-bar--short" : ""}`} />{"\u200b"}</>;
}

export function LoadingStatus({ children }: { children: string }) {
  return <span className="sr-only" role="status">{children}</span>;
}
