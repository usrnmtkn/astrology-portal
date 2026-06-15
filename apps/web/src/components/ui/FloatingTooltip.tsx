import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type TooltipPosition = {
  left: number;
  top: number;
  placement: "top" | "bottom";
};

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
  const fallbackId = useId();
  const tooltipId = id ?? fallbackId;
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    const tooltip = tooltipRef.current;

    if (!anchor || !tooltip) {
      return;
    }

    const triggerRect = anchor.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    let placement: TooltipPosition["placement"] = "top";
    const topPlacement = triggerRect.top - tooltipRect.height - TOOLTIP_GAP;
    const bottomPlacement = triggerRect.bottom + TOOLTIP_GAP;
    let top = topPlacement;

    if (topPlacement < VIEWPORT_GUTTER) {
      placement = "bottom";
      top = bottomPlacement;
    }

    if (top + tooltipRect.height > window.innerHeight - VIEWPORT_GUTTER && topPlacement >= VIEWPORT_GUTTER) {
      placement = "top";
      top = topPlacement;
    }

    top = Math.min(Math.max(top, VIEWPORT_GUTTER), Math.max(VIEWPORT_GUTTER, window.innerHeight - tooltipRect.height - VIEWPORT_GUTTER));

    const minLeft = tooltipRect.width / 2 + VIEWPORT_GUTTER;
    const maxLeft = window.innerWidth - tooltipRect.width / 2 - VIEWPORT_GUTTER;
    const preferredLeft = triggerRect.left + triggerRect.width / 2;
    const left = Math.min(Math.max(preferredLeft, minLeft), Math.max(minLeft, maxLeft));

    setPosition({ left, top, placement });
  }, [anchor]);

  useLayoutEffect(() => {
    if (open) {
      updatePosition();
    } else {
      setPosition(null);
    }
  }, [content, open, updatePosition]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  if (!mounted || !open || !anchor) {
    return null;
  }

  return createPortal(
    <div
      ref={tooltipRef}
      id={tooltipId}
      role="tooltip"
      className={["floating-tooltip", className, `floating-tooltip--${position?.placement ?? "top"}`].filter(Boolean).join(" ")}
      style={{
        left: position?.left ?? 0,
        top: position?.top ?? 0,
        visibility: position ? "visible" : "hidden"
      }}
    >
      {content}
    </div>,
    document.body
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
        onPointerLeave={() => setOpen(false)}
      >
        {children}
      </span>
      <FloatingTooltipPortal anchor={triggerRef.current} content={content} id={id} open={open} />
    </>
  );
}
