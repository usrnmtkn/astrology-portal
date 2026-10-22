import { useId, useState } from "react";
import { X } from "lucide-react";
import { ModalPortal } from "../../components/ModalPortal";
import { aspectGlyph } from "../../components/charts/chartAssets";
import type { ConnectionTransitFacts } from "../../services/connectionTransitContext";
import "../../styles/connection-transit-disclosure.css";

export function ConnectionTransitDisclosure({ heading, facts, description }: {
  heading: string;
  facts: ConnectionTransitFacts;
  description: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <>
    <button type="button" className="social-secondary-button connection-facts-trigger" id={`${id}-trigger`}
      aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
      {heading}
    </button>
    {open && <ModalPortal titleId={`${id}-title`} restoreFocusId={`${id}-trigger`}
      panelClassName="connection-facts live-ds-text live-ds-stack" width="var(--container-article)" closeOnBackdrop onClose={() => setOpen(false)}>
      <button type="button" className="modal-close connection-facts__close" aria-label="Close connection details"
        autoFocus onClick={() => setOpen(false)}><X size={16} aria-hidden="true" /></button>
      <header className="connection-facts__header">
        <h2 id={`${id}-title`} className="type-page-title">{heading}</h2>
        <p className="type-page-title">{facts.summary}</p>
      </header>
      <div className="live-ds-stack" data-gap="lg">
      {facts.groups.map(group => <section className="connection-facts__group" key={group.key} aria-labelledby={`${id}-${group.key}`}>
        <h3 id={`${id}-${group.key}`} className="live-ds-text">{group.heading}</h3>
        <ul>
          {group.rows.map(row => <li className="connection-facts__row" key={row.key}>
            <span className="connection-facts__badge astro-glyph" data-tone={row.aspect === "conjunction" ? "union" : ["trine", "sextile"].includes(row.aspect) ? "soft" : "hard"} aria-hidden="true">{aspectGlyph(row.aspect)}</span>
            <span className="connection-facts__title">{row.title}</span>
            <span className="connection-facts__orb live-ds-text" data-size="meta" data-tone="secondary"><span className="sr-only">Orb </span>{row.orb}</span>
          </li>)}
        </ul>
      </section>)}
      </div>
      <footer className="connection-facts__footer live-ds-stack" data-gap="md">
        {facts.caution && <p>{facts.caution}</p>}
        {description && <p>{description}</p>}
      </footer>
    </ModalPortal>}
  </>;
}
