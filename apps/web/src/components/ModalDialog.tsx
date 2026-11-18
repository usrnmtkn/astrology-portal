import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { ModalPortal } from "./ModalPortal";

/** Shared reader, settings and confirmation shell from the modal handoff. */
export function ModalDialog({ title, titleId: suppliedTitleId, onClose, children, glyph, actions,
  variant = "reading", className = "", rootClassName = "", bodyClassName = "", closeLabel = "Close", restoreFocusId, closeOnBackdrop
}: {
  title: string; titleId?: string; onClose: () => void; children: ReactNode; glyph?: ReactNode; actions?: ReactNode;
  variant?: "reading" | "settings" | "confirm"; className?: string; rootClassName?: string; bodyClassName?: string;
  closeLabel?: string; restoreFocusId?: string;
  closeOnBackdrop?: boolean;
}) {
  const generatedId = useId();
  const titleId = suppliedTitleId ?? generatedId;
  const bodyRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const swipeStart = useRef<{ x: number; y: number; pointer: number } | null>(null);
  const [scroll, setScroll] = useState({ scrolled: false, more: false });
  function updateScroll() {
    const body = bodyRef.current;
    if (!body) return;
    const next = { scrolled: body.scrollTop > 1, more: body.scrollHeight - body.clientHeight - body.scrollTop > 1 };
    setScroll(current => current.scrolled === next.scrolled && current.more === next.more ? current : next);
  }
  useEffect(() => {
    const body = bodyRef.current, content = contentRef.current;
    if (!body || !content) return;
    const observer = new ResizeObserver(updateScroll);
    observer.observe(body); observer.observe(content); updateScroll();
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    document.getElementById(titleId)?.focus({ preventScroll: true });
    updateScroll();
  }, [title, titleId]);
  return <ModalPortal onClose={onClose} closeOnBackdrop={closeOnBackdrop ?? variant !== "confirm"} titleId={titleId}
    initialFocusId={titleId} restoreFocusId={restoreFocusId} dialogRole={variant === "confirm" ? "alertdialog" : "dialog"}
    className={`content-modal ${rootClassName}`} panelClassName={`modal-dialog modal-dialog--${variant} ${className}`}>
    <header className="modal-dialog__header" data-scrolled={scroll.scrolled || undefined}
      onPointerDown={event => {
        if (variant === "confirm" || event.pointerType === "mouse" || !window.matchMedia("(max-width: 800px)").matches
          || (event.target instanceof Element && event.target.closest("button, a, input"))) return;
        swipeStart.current = { x: event.clientX, y: event.clientY, pointer: event.pointerId };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerCancel={() => { swipeStart.current = null; }}
      onPointerUp={event => {
        const start = swipeStart.current; swipeStart.current = null;
        if (!start || start.pointer !== event.pointerId) return;
        const distance = event.clientY - start.y;
        if (distance >= 64 && distance > Math.abs(event.clientX - start.x) * 1.5) onClose();
      }}>
      <span className="modal-dialog__handle" aria-hidden="true" />
      {glyph && <span className="modal-dialog__glyph" aria-hidden="true">{glyph}</span>}
      <h2 id={titleId} tabIndex={-1}>{title}</h2>
      {variant !== "confirm" && <button type="button" className="modal-close modal-dialog__close" aria-label={closeLabel} onClick={onClose}>
        <X size={16} aria-hidden="true" />
      </button>}
    </header>
    <div className="modal-dialog__viewport" data-more={scroll.more || undefined}>
      <div className={`modal-dialog__body ${bodyClassName}`} ref={bodyRef} onScroll={updateScroll} role="region" aria-label={variant === "reading" ? "Reading text" : "Dialog content"} tabIndex={0}
        onKeyDown={event => {
          if (event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey || !["Home", "End"].includes(event.key)) return;
          // A compact header changes the scrollport height during native keyboard scrolling.
          event.preventDefault();
          event.currentTarget.scrollTo({ top: event.key === "Home" ? 0 : event.currentTarget.scrollHeight, behavior: "instant" });
        }}>
        <div className="modal-dialog__content" ref={contentRef}>{children}</div>
      </div>
    </div>
    {actions && <footer className="modal-dialog__actions">{actions}</footer>}
  </ModalPortal>;
}
