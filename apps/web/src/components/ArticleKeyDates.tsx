import type { ReactNode } from "react";
import { KeyDatesPanel } from "./KeyDatesPanel";

export type ArticleKeyDate = {
  date: string;
  label: string;
  occursAt?: string;
  href?: string;
  detail?: string;
  relative?: string;
  current?: boolean;
};

export function ArticleKeyDates({ dates, intro, titleId }: { dates: ArticleKeyDate[]; intro?: ReactNode; titleId: string }) {
  if (!dates.length) return null;
  return <KeyDatesPanel className="article-key-dates" titleId={titleId} count={dates.length} open>
    {intro}
    <ol className="article-key-dates__list">
      {dates.map((entry) => {
        const content = <>
          <span className="article-key-dates__date"><time dateTime={entry.occursAt}>{entry.date}</time>{entry.relative ? <span>{entry.relative}</span> : null}</span>
          <span className="article-key-dates__copy"><span className="article-key-dates__label">{entry.label}{entry.current ? <span className="ui-pill house-transit-term-tag">Now</span> : null}</span>{entry.detail ? <span className="article-key-dates__detail">{entry.detail}</span> : null}</span>
        </>;
        return <li key={`${entry.label}-${entry.occursAt ?? entry.date}`} className={entry.current ? "is-current" : undefined}>
          {entry.href ? <a className="article-key-dates__row" href={entry.href}>{content}</a> : <div className="article-key-dates__row">{content}</div>}
        </li>;
      })}
    </ol>
  </KeyDatesPanel>;
}
