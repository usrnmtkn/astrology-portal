import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/** Preserve the normal on-screen glyph size when extra rows enlarge a wheel. */
export function RelationshipWheelViewport({ outerRadius, enabled = true, children }: { outerRadius: number; enabled?: boolean; children: ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null);
  const extra = Math.max(0, outerRadius - 284);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    element.scrollLeft = (element.scrollWidth - element.clientWidth) / 2;
    element.scrollTop = (element.scrollHeight - element.clientHeight) / 2;
  }, [extra]);
  if (!enabled) return children;
  return (
    <div className="relationship-wheel-viewport" ref={viewport} tabIndex={extra ? 0 : undefined}
      role={extra ? "region" : undefined} aria-label={extra ? "Chart wheel; scroll to explore" : undefined}
      style={{ "--relationship-wheel-expansion": (648 + extra * 2) / 648 } as CSSProperties}>
      {children}
    </div>
  );
}
