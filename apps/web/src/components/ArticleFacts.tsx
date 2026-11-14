export function TransitFacts({ description }: { description?: string | null }) {
  return description ? (
    <aside className="article-section article-transit-description" aria-label="Transit details">
      <p>{description}</p>
    </aside>
  ) : null;
}

export function SkyMechanics({ caption, compact = false }: { caption?: string | null; compact?: boolean }) {
  return caption ? (
    <aside className={`article-section sky-detail-section sky-aspect-mechanics${compact ? " article-transit-description" : ""}`} aria-labelledby={compact ? undefined : "sky-aspect-mechanics-title"} aria-label={compact ? "Aspect details" : undefined}>
      {!compact ? <h2 id="sky-aspect-mechanics-title">What this looks like in space</h2> : null}
      <p>{caption}</p>
    </aside>
  ) : null;
}
