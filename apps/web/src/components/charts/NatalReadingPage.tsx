import { useId, type ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

/** The editorial shell is shared by You and Friends; copy remains owned by Studio. */
export function NatalReadingPage({ title, children, onClose, backLabel, audience = "you" }: {
  title: string; children: ReactNode; onClose?: () => void; backLabel: string; audience?: "you" | "friend";
}) {
  const titleId = useId();
  return <section className="article-page sky-detail-page natal-reading-page" aria-labelledby={titleId}>
    {onClose && <button className="sky-detail-back floating-back-button" onClick={onClose} aria-label={backLabel} type="button">
      <ChevronLeft size={18} aria-hidden="true" />
      <span>Back</span>
    </button>}
    <article className="article-shell article-card natal-reading-article">
      <header className="natal-reading-header">
        <div className="natal-reading-measure">
          <p className="natal-reading-label">{audience === "you" ? "Your natal chart" : "Their natal chart"}</p>
          <h1 className="article-title" id={titleId}>{title === "Your approach to life" ? `${title}.` : title}</h1>
        </div>
      </header>
      {children}
    </article>
  </section>;
}
