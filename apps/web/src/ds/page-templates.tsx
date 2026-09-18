import type { ReactNode } from "react";

export function ReadingPage({ children }: { children: ReactNode }) {
  return <div className="detail-panel">{children}</div>;
}

export function ArticlePage({ children }: { children: ReactNode }) {
  return <div className="article-page">{children}</div>;
}
