import { useLayoutEffect, useRef } from "react";

// Geometry only: never retain reader copy or content eligibility in this cache.
const layouts = new Map<string, number[]>();
const maxLayouts = 64;

/** Reuse the last resolved geometry only at the same width and typography. */
export function useSkeletonGeometry(key: string, loading: boolean, selector: string, resolvedSelector = selector) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const container = ref.current;
    if (!container) return;
    const measure = () => {
      const style = getComputedStyle(container);
      const identity = [key, container.getBoundingClientRect().width, style.fontFamily, style.fontSize, style.lineHeight, style.letterSpacing, document.fonts.status,
        document.documentElement.dataset.theme, document.documentElement.dataset.dyslexiaFont].join("|");
      const cards = [...container.querySelectorAll<HTMLElement>(loading ? selector : resolvedSelector)];
      if (loading) {
        const saved = layouts.get(identity);
        const heights = saved?.length === cards.length ? saved : undefined;
        cards.forEach((card, index) => {
          const height = card.hasAttribute("data-skeleton-measurable") ? undefined : heights?.[index];
          if (height === undefined) {
            card.style.removeProperty("--lazy-measured-height");
            delete card.dataset.measuredSkeleton;
          } else {
            card.style.setProperty("--lazy-measured-height", `${height}px`);
            card.dataset.measuredSkeleton = "";
          }
        });
      } else if (cards.length && cards.every(card => !card.classList.contains("card-skeleton"))) {
        layouts.delete(identity);
        layouts.set(identity, cards.map(card => card.getBoundingClientRect().height));
        if (layouts.size > maxLayouts) layouts.delete(layouts.keys().next().value!);
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    const typography = new MutationObserver(measure);
    typography.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-dyslexia-font"] });
    document.fonts.addEventListener("loadingdone", measure);
    return () => {
      observer.disconnect();
      typography.disconnect();
      document.fonts.removeEventListener("loadingdone", measure);
    };
  }, [key, loading, selector, resolvedSelector]);
  return ref;
}
