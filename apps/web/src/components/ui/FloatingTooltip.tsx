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
  content: string;
};

const VIEWPORT_GUTTER = 12;
const TOOLTIP_GAP = 10;

export function FloatingTooltip({ ariaLabel, children, className, content }: FloatingTooltipProps) {
  const id = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;

    if (!trigger || !tooltip) {
      return;
    }

    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    let placement: TooltipPosition["placement"] = "top";
    let top = triggerRect.top - tooltipRect.height - TOOLTIP_GAP;

    if (top < VIEWPORT_GUTTER) {
      placement = "bottom";
      top = triggerRect.bottom + TOOLTIP_GAP;
    }

    const minLeft = tooltipRect.width / 2 + VIEWPORT_GUTTER;
    const maxLeft = window.innerWidth - tooltipRect.width / 2 - VIEWPORT_GUTTER;
    const preferredLeft = triggerRect.left + triggerRect.width / 2;
    const left = Math.min(Math.max(preferredLeft, minLeft), Math.max(minLeft, maxLeft));

    setPosition({ left, top, placement });
  }, []);

  useLayoutEffect(() => {
    if (open) {
      updatePosition();
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

  const tooltip =
    mounted && open
      ? createPortal(
          <div
            ref={tooltipRef}
            id={id}
            role="tooltip"
            className={`floating-tooltip floating-tooltip--${position?.placement ?? "top"}`}
            style={{
              left: position?.left ?? 0,
              top: position?.top ?? 0,
              visibility: position ? "visible" : "hidden"
            }}
          >
            {content}
          </div>,
          document.body
        )
      : null;

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
      {tooltip}
    </>
  );
}
