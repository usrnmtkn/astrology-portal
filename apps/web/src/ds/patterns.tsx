import type { ReactNode } from "react";
export { SegmentedControl as Tabs } from "./components";
export { PageLoading as LoadingState } from "./components";
export { ArticlePills as MetaPills } from "./components";

export function ReadingCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <article className={["article-card", className].filter(Boolean).join(" ")}>{children}</article>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="you-empty-card">{children}</div>;
}
