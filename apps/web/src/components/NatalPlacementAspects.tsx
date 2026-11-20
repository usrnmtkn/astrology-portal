import { Fragment, isValidElement, useId, type ReactNode } from "react";
import { aspectGiftOrLesson } from "../services/aspectGiftLesson";

type NatalPlacementAspectRow = { key: string; aspectType?: string; node: ReactNode };

/** Shared placement pattern for every natal planet in You and Friends. */
export function NatalPlacementAspects({ rows }: { rows: Array<ReactNode | NatalPlacementAspectRow> }) {
  const id = useId();
  const aspects = rows.filter((row): row is NatalPlacementAspectRow => Boolean(
    row && typeof row === "object" && "node" in row && !isValidElement(row)
  ));
  return <>{([
    { key: "gifts", label: "Gifts" },
    { key: "lessons", label: "Challenges" }
  ] as const).map(group => {
    const members = aspects.filter(row => aspectGiftOrLesson(row.aspectType) === group.key);
    if (!members.length) return null;
    const headingId = `${id}-${group.key}`;
    return <Fragment key={group.key}>
      <h2 className="eyebrow section-label article-related-aspects__label article-related-aspects__label--outside" id={headingId}>{group.label}</h2>
      <section className="article-card article-related-aspects article-related-aspects-card" aria-labelledby={headingId}>
        <div className="article-related-aspects__group">
          <div className="article-related-aspects__list aspect-row-list">{members.map(row => <Fragment key={row.key}>{row.node}</Fragment>)}</div>
        </div>
      </section>
    </Fragment>;
  })}</>;
}
