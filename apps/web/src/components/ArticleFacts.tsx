export function TransitFacts({ description }: { description?: string | null }) {
  return description ? (
    <aside className="article-section article-transit-description" aria-label="Transit details">
      <p>{description}</p>
    </aside>
  ) : null;
}

export function SkyMechanics({ caption }: { caption?: string | null }) {
  return caption ? (
    <aside className="article-section sky-detail-section sky-aspect-mechanics" aria-labelledby="sky-aspect-mechanics-title">
      <h2 id="sky-aspect-mechanics-title">What this looks like in space</h2>
      <p>{caption}</p>
    </aside>
  ) : null;
}
