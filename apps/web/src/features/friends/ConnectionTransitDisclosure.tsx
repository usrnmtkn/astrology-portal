import { useId, useState } from "react";
import { ModalDialog } from "../../components/ModalDialog";
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
    {open && <ModalDialog title={heading} titleId={`${id}-title`} restoreFocusId={`${id}-trigger`}
      className="connection-facts" closeLabel="Close connection details" onClose={() => setOpen(false)}>
      <p className="connection-facts__summary">{facts.summary}</p>
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
    </ModalDialog>}
  </>;
}
