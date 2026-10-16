import { useLayoutEffect, useRef, useState, type HTMLAttributes } from "react";
import { createPortal } from "react-dom";

// Render under the application root to escape card clipping while retaining
// theme selectors. The hidden marker keeps the trigger in its original place.
export function ViewportMenu({ children, ...props }: Omit<HTMLAttributes<HTMLDivElement>, "style" | "onPointerDown" | "role">) {
  const [marker, setMarker] = useState<HTMLSpanElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const trigger = marker?.previousElementSibling;
    if (!panel || !trigger) return;
    const viewport = window.visualViewport;
    const update = () => {
      const styles = getComputedStyle(document.documentElement);
      const gutter = parseFloat(styles.getPropertyValue("--space-4")) || 0;
      const gap = parseFloat(styles.getPropertyValue("--space-2")) || 0;
      const left = (viewport?.offsetLeft ?? 0) + gutter;
      const top = Math.max(viewport?.offsetTop ?? 0,
        document.querySelector(".topbar")?.getBoundingClientRect().bottom ?? 0) + gutter;
      const right = (viewport?.offsetLeft ?? 0) + (viewport?.width ?? innerWidth) - gutter;
      const bottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? innerHeight) - gutter;
      panel.style.maxWidth = `${Math.max(0, right - left)}px`;
      panel.style.maxHeight = `${Math.max(0, bottom - top)}px`;
      const box = panel.getBoundingClientRect();
      const anchor = trigger.getBoundingClientRect();
      let y = anchor.bottom + gap;
      if (y + box.height > bottom) y = anchor.top - box.height - gap;
      panel.style.top = `${Math.max(top, Math.min(y, bottom - box.height))}px`;
      panel.style.left = `${Math.max(left, Math.min(anchor.right - box.width, right - box.width))}px`;
    };
    update();
    panel.querySelector<HTMLElement>("button:not([disabled])")?.focus({ preventScroll: true });
    const observer = new ResizeObserver(update);
    observer.observe(panel);
    const targets: EventTarget[] = viewport ? [window, viewport] : [window];
    for (const target of targets) {
      target.addEventListener("resize", update);
      target.addEventListener("scroll", update, { capture: true, passive: true });
    }
    return () => {
      observer.disconnect();
      for (const target of targets) {
        target.removeEventListener("resize", update);
        target.removeEventListener("scroll", update, true);
      }
      if (panel.contains(document.activeElement) && trigger instanceof HTMLElement) trigger.focus({ preventScroll: true });
    };
  }, [marker]);

  return <>
    <span hidden ref={setMarker} />
    {marker && createPortal(
      <div {...props} role="menu" ref={panelRef} style={{ position: "fixed", inset: "auto", margin: 0, overflowY: "auto", overflowWrap: "anywhere" }}
        onPointerDown={(event) => event.stopPropagation()}>{children}</div>,
      marker.closest(".app-shell, .report-route-root") ?? document.body
    )}
  </>;
}
