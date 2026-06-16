import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties, ReactNode } from "react";

type ModalPortalProps = {
  children: ReactNode;
  className?: string;
  closeOnBackdrop?: boolean;
  onClose: () => void;
  panelClassName?: string;
  titleId?: string;
  width?: string;
};

let openModalCount = 0;

export function ModalPortal({
  children,
  className = "",
  closeOnBackdrop = false,
  onClose,
  panelClassName = "",
  titleId,
  width
}: ModalPortalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    openModalCount += 1;
    document.body.classList.add("modal-open");

    const focusTimer = window.setTimeout(() => {
      panelRef.current?.focus();
    }, 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
        )
      ).filter((element) => !element.hasAttribute("disabled") && element.offsetParent !== null);

      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      openModalCount = Math.max(0, openModalCount - 1);
      if (openModalCount === 0) {
        document.body.classList.remove("modal-open");
      }
      restoreFocusRef.current?.focus();
    };
  }, []);

  return createPortal(
    <div className={`modal-root${className ? ` ${className}` : ""}`}>
      <div className="modal-overlay" role="presentation" />
      <div
        className="modal-positioner"
        onMouseDown={(event) => {
          if (closeOnBackdrop && event.target === event.currentTarget) {
            onCloseRef.current();
          }
        }}
      >
        <div
          className={`modal-panel${panelClassName ? ` ${panelClassName}` : ""}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          ref={panelRef}
          style={width ? { "--modal-width": width } as CSSProperties : undefined}
          tabIndex={-1}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
