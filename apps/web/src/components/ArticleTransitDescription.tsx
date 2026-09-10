export function ArticleTransitDescription({ description }: { description?: string | null }) {
  return description ? (
    <aside className="article-section article-transit-description" aria-label="Transit details">
      <p>{description}</p>
    </aside>
  ) : null;
}
