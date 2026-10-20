import { useContext, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { PortalVisibility } from "../portalVisibility";
import { createPortal } from "react-dom";

type FloatingTooltipProps = {
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
  content: ReactNode;
};

type FloatingTooltipPortalProps = {
  anchor: Element | null;
  className?: string;
  content: ReactNode;
  id?: string;
  open: boolean;
};

const VIEWPORT_GUTTER = 12;
const TOOLTIP_GAP = 10;

export function FloatingTooltipPortal({ anchor, className, content, id, open }: FloatingTooltipPortalProps) {
  const visible = useContext(PortalVisibility);
  const fallbackId = useId();
  const tooltipRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const tooltip = tooltipRef.current;
    if (!visible || !open || !anchor || !tooltip) return;
    const viewport = window.visualViewport;
    const update = (event?: Event) => {
      if (event?.type === "scroll" && event.target === tooltip) return;
      if (!anchor.isConnected) { tooltip.style.visibility = "hidden"; return; }
      const leftEdge = (viewport?.offsetLeft ?? 0) + VIEWPORT_GUTTER;
      const topEdge = (viewport?.offsetTop ?? 0) + VIEWPORT_GUTTER;
      const right = (viewport?.offsetLeft ?? 0) + (viewport?.width ?? innerWidth) - VIEWPORT_GUTTER;
      const bottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? innerHeight) - VIEWPORT_GUTTER;
      const width = Math.max(0, right - leftEdge);
      tooltip.style.maxWidth = "";
      tooltip.style.minWidth = "";
      tooltip.style.minWidth = `${Math.min(parseFloat(getComputedStyle(tooltip).minWidth) || 0, width)}px`;
      tooltip.style.maxHeight = `${Math.max(0, bottom - topEdge)}px`;
      if (tooltip.getBoundingClientRect().width > width) tooltip.style.maxWidth = `${width}px`;
      const box = tooltip.getBoundingClientRect();
      const trigger = anchor.getBoundingClientRect();
      const above = trigger.top - box.height - TOOLTIP_GAP;
      const preferredTop = above >= topEdge ? above : trigger.bottom + TOOLTIP_GAP;
      tooltip.style.top = `${Math.max(topEdge, Math.min(preferredTop, bottom - box.height))}px`;
      tooltip.style.left = `${Math.max(leftEdge + box.width / 2, Math.min(trigger.left + trigger.width / 2, right - box.width / 2))}px`;
      tooltip.style.pointerEvents = document.activeElement === anchor ? "auto" : "none";
      tooltip.style.visibility = "visible";
    };
    update();
    let resizeFrame: number | null = null;
    const observer = new ResizeObserver(() => {
      if (resizeFrame !== null) return;
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null;
        update();
      });
    });
    observer.observe(tooltip);
    observer.observe(anchor);
    const targets: EventTarget[] = viewport ? [window, viewport] : [window];
    for (const target of targets) {
      target.addEventListener("resize", update);
      target.addEventListener("scroll", update, { capture: true, passive: true });
    }
    return () => {
      observer.disconnect();
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
      for (const target of targets) {
        target.removeEventListener("resize", update);
        target.removeEventListener("scroll", update, true);
      }
    };
  }, [anchor, content, open, visible]);

  if (!visible || !open || !anchor) return null;
  return createPortal(
    <div ref={tooltipRef} id={id ?? fallbackId} role="tooltip"
      className={["floating-tooltip", className].filter(Boolean).join(" ")}
      style={{ visibility: "hidden" }}>{content}</div>,
    anchor.closest(".app-shell, .report-route-root") ?? document.body
  );
}

export function FloatingTooltip({ ariaLabel, children, className, content }: FloatingTooltipProps) {
  const id = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <span
        ref={triggerRef}
        className={className}
        aria-label={ariaLabel}
        aria-describedby={open ? id : undefined}
        tabIndex={0}
        onBlur={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onPointerEnter={() => setOpen(true)}
        onPointerLeave={() => { if (document.activeElement !== triggerRef.current) setOpen(false); }}
      >
        {children}
      </span>
      <FloatingTooltipPortal anchor={triggerRef.current} content={content} id={id} open={open} />
    </>
  );
}
