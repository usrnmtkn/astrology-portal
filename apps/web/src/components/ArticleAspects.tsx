import { Fragment, isValidElement, type ReactNode } from "react";
import { normalizedArticleAspectToneBucket } from "../utils/articleAspects";

type NatalPlacementAspectRow = { key: string; aspectType?: string; group?: "gifts" | "lessons"; node: ReactNode };

export function normalizeRelatedAspectRow(row: ReactNode | NatalPlacementAspectRow, index: number): NatalPlacementAspectRow {
  return row && typeof row === "object" && "node" in row && !isValidElement(row)
    ? { ...row, key: row.key || `related-aspect-${index}`, group: row.group ?? normalizedArticleAspectToneBucket(row.aspectType) }
    : { key: `related-aspect-${index}`, group: "lessons", node: row };
}

export function ArticleAspectCard({ id, label, level = "h2", children }: {
  id: string; label: string; level?: "h2" | "h3"; children: ReactNode;
}) {
  const Heading = level;
  return <>
    <Heading className="eyebrow section-label article-related-aspects__label article-related-aspects__label--outside" id={id}>{label}</Heading>
    <section className="article-card article-related-aspects article-related-aspects-card" aria-labelledby={id}>
      <div className="article-related-aspects__group">{children}</div>
    </section>
  </>;
}

/** Shared placement pattern for every natal planet in You and Friends. */
export function NatalPlacementAspects({ rows }: { rows: Array<ReactNode | NatalPlacementAspectRow> }) {
  const aspects = rows.map(normalizeRelatedAspectRow);
  return <>{([
    { key: "gifts", label: "Gifts" },
    { key: "lessons", label: "Challenges" }
  ] as const).map(group => {
    const members = aspects.filter(row => row.group === group.key);
    if (!members.length) return null;
    const headingId = `natal-aspects-${group.key}`;
    return <ArticleAspectCard key={group.key} id={headingId} label={group.label}>
          <div className="article-related-aspects__list aspect-row-list">{members.map(row => <Fragment key={row.key}>{row.node}</Fragment>)}</div>
    </ArticleAspectCard>;
  })}</>;
}
