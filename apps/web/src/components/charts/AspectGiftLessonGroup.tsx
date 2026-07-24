import type { ReactNode } from "react";
import type { AspectGiftLessonLabel } from "../../services/aspectGiftLesson";

export function AspectGiftLessonGroup({
  ariaLabel,
  children,
  label,
  listAriaLabel,
  listClassName = ""
}: {
  ariaLabel: string;
  children: ReactNode;
  label: AspectGiftLessonLabel;
  listAriaLabel?: string;
  listClassName?: string;
}) {
  return (
    <section className="friend-natal-aspect-group" aria-label={ariaLabel}>
      <span className="eyebrow section-label friend-section-label">{label}</span>
      <div
        className={`list you-aspects-list aspect-row-list ${listClassName}`.trim()}
        aria-label={listAriaLabel}
      >
        {children}
      </div>
    </section>
  );
}
