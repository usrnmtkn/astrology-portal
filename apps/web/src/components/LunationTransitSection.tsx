import { AspectBadge } from "./charts/AspectBadge";
import "../styles/lunation-transit.css";
import "../styles/you-transits.css";
import { useId, useState, type ReactNode } from "react";
import type { WeeklyHoroscopeAssembly, WeeklyHoroscopeReading } from "../services/weeklyHoroscope";
import { FormattedProse } from "./FormattedProse";
import { CardReadMore } from "./CardReadMore";

export function lunationTransitReading(assembly?: WeeklyHoroscopeAssembly | null) {
  if (assembly?.status !== "ready") return undefined;
  return [assembly.horoscope, ...assembly.aspects].find(reading => reading.source === "lunation" && reading.body.trim());
}

function LunationMacroView({ body }: { body: string }) {
  const [expanded, setExpanded] = useState(false);
  const bodyId = useId();
  const hasMore = body.length > 575;
  const preview = hasMore ? `${body.slice(0, 575).replace(/\s+\S*$/u, "").trimEnd()}…` : body;
  return (
    <article className="weekly-horoscope__macro daily-horoscope-summary you-horoscope-card">
      <span className="eyebrow section-label">The macro view</span>
      <div id={bodyId} className="weekly-horoscope__macro-body">
        {(expanded ? body : preview).split(/\n{2,}/).map((paragraph, index) => <FormattedProse key={index} text={paragraph} />)}
      </div>
      {hasMore ? <button type="button" className="card-read-more weekly-horoscope__toggle" aria-expanded={expanded} aria-controls={bodyId} onClick={() => setExpanded(current => !current)}>
        {expanded ? "Read less" : "Read more"}
      </button> : null}
    </article>
  );
}

export type LunationTransitCardProps = {
  reading: WeeklyHoroscopeReading;
  preview: string;
  house?: number | null;
  onOpen: () => void;
  displayTitle?: string;
  glyph?: string;
  aspect?: string;
  timingLabel?: string;
};

export function LunationTransitCard({ reading, preview, house = reading.house, onOpen, displayTitle, glyph = "○", aspect, timingLabel }: LunationTransitCardProps) {
  const isLunation = reading.source === "lunation";
  const title = isLunation ? reading.headline : displayTitle || reading.headline;
  return <button type="button" className="updates-aspect-row weekly-transit-row" onClick={onOpen} aria-label={`Open full entry for ${title}`}>
    {aspect ? <AspectBadge aspect={aspect} className="updates-aspect-row__glyphs" /> : <span className="updates-aspect-row__glyphs" aria-hidden="true">
      <span className="planet-glyph">{isLunation ? "○" : glyph}</span>
      {isLunation && house ? <span className="lunation-transit__house">{house}H</span> : null}
    </span>}
    <span className="updates-aspect-row__title">{title}</span>
    {!isLunation && timingLabel ? <span className="updates-aspect-row__meta-line">{timingLabel}</span> : null}
    {preview ? <span className="updates-aspect-row__description transit-card-preview">{preview}</span> : null}
    <CardReadMore appearance="icon" />
    {!isLunation && (house || typeof reading.orb === "number") ? <span className="updates-aspect-row__meta">
      <span className="updates-aspect-row__dot" aria-hidden="true" />
      <span className="updates-aspect-row__orb">{house ?? `${Math.round(Math.max(0, reading.orb ?? 0))}°`}</span>
    </span> : null}
  </button>;
}

export function LunationTransitSection({ assembly, children }: {
  assembly?: WeeklyHoroscopeAssembly | null;
  children?: ReactNode;
}) {
  const titleId = useId();
  const reading = lunationTransitReading(assembly);
  if (assembly?.status !== "ready" || (!reading && !assembly.macro?.body.trim())) return null;
  const title = assembly.macro?.headline || reading?.driverLabel || assembly.chip;
  const date = assembly.macro?.dayLabel || reading?.dayLabel;
  return <section className="lunation-transit you-transit-group" aria-labelledby={titleId}>
    <div className="you-transit-group__header">
      <h2 id={titleId}>{title}</h2>
      {date ? <span className="lunation-transit__date">{date}</span> : null}
    </div>
    <div className={`lunation-transit__content${assembly.macro && children ? " lunation-transit__content--paired" : ""}`}>
      {assembly.macro ? <LunationMacroView key={`${assembly.weekStart}:${assembly.macro.body}`} body={assembly.macro.body} /> : null}
      {children ? <div className="updates-aspect-list you-transit-grid lunation-transit__personal">{children}</div> : null}
    </div>
  </section>;
}
