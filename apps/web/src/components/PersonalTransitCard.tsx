import type { MouseEvent } from "react";
import { FormattedText } from "./FormattedProse";
import { CardReadMore } from "./CardReadMore";
import { normalizeAspectType, pointGlyph } from "./charts/chartAssets";

export function PersonalTransitIcon({ aspect, planet }: { aspect: string; planet: string }) {
  const type = normalizeAspectType(aspect);
  return <span className="personal-transit-icon" data-aspect={type} aria-hidden="true">
    <svg viewBox="0 0 34 34" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {type === "trine" ? <path d="M17 6 29 27H5Z" />
        : type === "sextile" ? <path d="M17 4v26M5.74 10.5l22.52 13M5.74 23.5l22.52-13" />
        : type === "square" ? <path d="M6 6h22v22H6Z" />
        : type === "opposition" ? <><circle cx="8" cy="26" r="4" /><circle cx="26" cy="8" r="4" /><path d="m11 23 12-12" /></>
        : <><circle cx="11" cy="23" r="7" /><path d="m16 18 12-12" /></>}
    </svg>
    <span className="personal-transit-icon__planet"><span>{pointGlyph(planet)}</span></span>
  </span>;
}

export function PersonalTransitCard({ aspect, planet, aspectName, headline, time, orb, body, href, onOpen, background }: {
  aspect: string; planet: string; aspectName: string; headline?: string; time: string; orb: string;
  body: string; href?: string; onOpen: () => void; background: boolean;
}) {
  const customHeadline = headline && headline !== aspectName ? headline : "";
  const content = <>
    <PersonalTransitIcon aspect={aspect} planet={planet} />
    <h3 className="updates-aspect-row__title">{customHeadline || aspectName}</h3>
    <span className="updates-aspect-row__meta-line">{time}<span aria-hidden="true"> · </span><span className="updates-aspect-row__orb">{orb}</span></span>
    {body ? <span className="updates-aspect-row__description transit-card-preview"><FormattedText text={body} /></span> : null}
    {customHeadline ? <span className="personal-transit-card__aspect-name">{aspectName}</span> : null}
    {href ? <CardReadMore appearance="icon" /> : null}
  </>;
  const className = `updates-aspect-row updates-aspect-row--personal personal-transit-card${background ? " updates-aspect-row--background" : ""}`;
  function open(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onOpen();
  }
  return href
    ? <a className={className} data-aspect={aspect} data-aspect-name={aspectName} href={href} onClick={open}>{content}</a>
    : <article className={className} data-aspect={aspect} data-aspect-name={aspectName}>{content}</article>;
}
