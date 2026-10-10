import { useLayoutEffect, useRef, type ReactNode } from "react";

/** Keep complete navigation items in the header; every destination also lives in the site menu. */
export function NavigationPill({ children }: { children: ReactNode }) {
  const pillRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<(() => void) | null>(null);

  useLayoutEffect(() => {
    const pill = pillRef.current;
    const header = pill?.closest(".topbar");
    const actions = header?.querySelector<HTMLElement>(".topbar-actions");
    const nav = pill?.querySelector<HTMLElement>(".site-nav");
    if (!pill || !header || !actions || !nav) return;

    const measure = () => {
      const buttons = Array.from(nav.querySelectorAll<HTMLButtonElement>(":scope > button"));
      const focusedButton = buttons.find(button => button === document.activeElement);
      buttons.forEach(button => { button.hidden = false; });

      // Compact layouts already put all destinations in the overflow menu.
      if (getComputedStyle(nav).display === "none") {
        pill.style.removeProperty("max-width");
        if (focusedButton) actions.querySelector<HTMLButtonElement>(".menu-toggle")?.focus();
        return;
      }

      const headerStyle = getComputedStyle(header);
      const pillStyle = getComputedStyle(pill);
      const contentWidth = header.clientWidth - parseFloat(headerStyle.paddingLeft) - parseFloat(headerStyle.paddingRight);
      const actionSpace = actions.getBoundingClientRect().width + parseFloat(headerStyle.columnGap);
      // The desktop pill is centered, so reserve the action width on both sides.
      const availableWidth = Math.max(0, contentWidth - actionSpace * (pillStyle.gridColumnStart === "2" ? 2 : 1));
      pill.style.maxWidth = `${availableWidth}px`;

      const fixedChildren = Array.from(pill.children).filter(child => child !== nav);
      const brandWidth = fixedChildren.reduce((sum, child) => sum + child.getBoundingClientRect().width, 0);
      const visibleBrandCount = fixedChildren.filter(child => child.getBoundingClientRect().width > 0).length;
      const navSpace = availableWidth - brandWidth - visibleBrandCount * parseFloat(pillStyle.columnGap)
        - parseFloat(pillStyle.paddingLeft) - parseFloat(pillStyle.paddingRight)
        - parseFloat(pillStyle.borderLeftWidth) - parseFloat(pillStyle.borderRightWidth);
      const gap = parseFloat(getComputedStyle(nav).columnGap);
      const widths = buttons.map(button => button.getBoundingClientRect().width);
      let usedWidth = 0;
      let overflow = false;
      buttons.forEach((button, index) => {
        usedWidth += widths[index] + (index > 0 ? gap : 0);
        overflow ||= usedWidth > navSpace;
        button.hidden = overflow;
      });

      if (focusedButton?.hidden) actions.querySelector<HTMLButtonElement>(".menu-toggle")?.focus();
    };

    measureRef.current = measure;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    observer.observe(actions);
    observer.observe(pill);
    window.addEventListener("resize", measure);
    document.fonts.addEventListener("loadingdone", measure);
    return () => {
      measureRef.current = null;
      observer.disconnect();
      window.removeEventListener("resize", measure);
      document.fonts.removeEventListener("loadingdone", measure);
    };
  }, []);

  // Profile links, request badges, and accessibility font settings can change after mount.
  useLayoutEffect(() => { measureRef.current?.(); }, [children]);

  return <div className="nav-pill" ref={pillRef}>{children}</div>;
}
