import { useId } from "react";
import { CardReadMore } from "./CardReadMore";
import { FormattedText } from "./FormattedProse";
import "../styles/profile-overview.css";

/** The same saved reading is a desktop card and a mobile sheet row. */
export function NatalInsightCard({ glyph, meta, title, body, onOpen, href, id }: {
  glyph: string; meta?: string; title: string; body: string; onOpen?: () => void; href?: string; id?: string;
}) {
  const titleId = useId();
  const metaId = useId();
  const Tag = href ? "a" : "button";
  return <Tag id={id} href={href} type={href ? undefined : "button"} className="natal-insight-card" aria-labelledby={titleId} aria-describedby={meta ? metaId : undefined}
    onClick={event => { if (href) { if (!onOpen || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); } onOpen?.(); }} disabled={href ? undefined : !onOpen}>
    <span className="natal-insight-card__glyph" aria-hidden="true">{glyph}</span>
    <span className="natal-insight-card__copy">
      {meta && <span className="natal-insight-card__meta" id={metaId}>{meta}</span>}
      <strong className="natal-insight-card__title" id={titleId}>{title}</strong>
      <span className="natal-insight-card__preview"><FormattedText text={body}/></span>
    </span>
    <CardReadMore appearance="icon"/>
  </Tag>;
}
