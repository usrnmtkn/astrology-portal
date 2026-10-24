import { useLayoutEffect, useRef, type ReactNode } from "react";

/** Keep complete header items visible; every destination also lives in the site menu. */
export function NavigationPill({ children }: { children: ReactNode }) {
  const pillRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const pill = pillRef.current!;
    const header = pill.closest<HTMLElement>(".topbar")!;
    const actions = header.querySelector<HTMLElement>(".topbar-actions")!;
    const nav = pill.querySelector<HTMLElement>(".site-nav")!;
    const measure = () => {
      const buttons = Array.from(nav.querySelectorAll<HTMLButtonElement>("button"));
      const focused = buttons.find(button => button === document.activeElement);
      buttons.forEach(button => { button.hidden = false; });
      const compact = getComputedStyle(nav).display === "none";
      if (compact) {
        pill.style.maxWidth = "";
        if (focused) actions.querySelector<HTMLButtonElement>(".menu-toggle")?.focus();
        return;
      }
      const style = getComputedStyle(header);
      // Desktop navigation is centered: reserve the controls and gutter on both sides.
      pill.style.maxWidth = compact ? "" : `${header.clientWidth - 2 * (
        actions.offsetWidth + parseFloat(style.paddingLeft) + parseFloat(style.columnGap)
      )}px`;
      const pillStyle = getComputedStyle(pill);
      const edge = pill.getBoundingClientRect().right - parseFloat(pillStyle.paddingRight)
        - parseFloat(pillStyle.borderRightWidth);
      // Measure all items before hiding any: shrinking the centered pill moves its edges.
      const overflow = buttons.map(button => !compact && button.getBoundingClientRect().right > edge);
      buttons.forEach((button, index) => { button.hidden = overflow[index]; });
      if (focused && (compact || focused.hidden)) actions.querySelector<HTMLButtonElement>(".menu-toggle")?.focus();
    };

    measure();
    // Observe intrinsic navigation size too, for font loads, profile links and request badges.
    const observer = new ResizeObserver(measure);
    [header, actions, pill, nav].forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return <div className="nav-pill" ref={pillRef}>{children}</div>;
}
