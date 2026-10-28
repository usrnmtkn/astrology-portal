import { useContext, useEffect, useRef } from "react";
import { PortalVisibility } from "./portalVisibility";
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
  style?: CSSProperties;
  restoreFocusId?: string;
  initialFocusId?: string;
  dialogRole?: "dialog" | "alertdialog";
};

let openModalCount = 0;
let initialModalFocus: HTMLElement | null = null;
const modalStack: HTMLDivElement[] = [];
const inertBackground = new Map<HTMLElement, { count: number; inert: boolean }>();

export function ModalPortal({
  children,
  className = "",
  closeOnBackdrop = false,
  onClose,
  panelClassName = "",
  titleId,
  restoreFocusId,
  initialFocusId,
  dialogRole = "dialog",
  width,
  style
}: ModalPortalProps) {
  const visible = useContext(PortalVisibility);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusIdRef = useRef(restoreFocusId);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
    restoreFocusIdRef.current = restoreFocusId;
  }, [onClose, restoreFocusId]);

  useEffect(() => {
    if (!visible) return;
    if (!restoreFocusRef.current) restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (openModalCount === 0) initialModalFocus = restoreFocusRef.current;
    openModalCount += 1;
    document.body.classList.add("modal-open");
    const panel = panelRef.current;
    const host = panel?.closest(".modal-root")?.parentElement;
    const background = Array.from(document.body.children)
      .filter((element): element is HTMLElement => element instanceof HTMLElement && element !== host);
    background.forEach(element => {
      const state = inertBackground.get(element) ?? { count: 0, inert: element.inert };
      state.count++;
      inertBackground.set(element, state);
      element.inert = true;
    });
    if (panel) modalStack.push(panel);

    const focusTimer = window.setTimeout(() => {
      (lastFocusedRef.current?.isConnected ? lastFocusedRef.current : initialFocusId
        ? panel?.querySelector<HTMLElement>(`#${CSS.escape(initialFocusId)}`) ?? panel : panel)?.focus({ preventScroll: true });
    }, 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (modalStack.at(-1) !== panel) return;
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

      if (!focusable.includes(document.activeElement as HTMLElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
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
      if (panel) modalStack.splice(modalStack.indexOf(panel), 1);
      background.forEach(element => {
        const state = inertBackground.get(element)!;
        if (--state.count === 0) {
          element.inert = state.inert;
          inertBackground.delete(element);
        }
      });
      openModalCount = Math.max(0, openModalCount - 1);
      if (openModalCount === 0) {
        document.body.classList.remove("modal-open");
      }
      const target = (restoreFocusIdRef.current ? document.getElementById(restoreFocusIdRef.current) : null)
        ?? (restoreFocusRef.current?.isConnected ? restoreFocusRef.current : openModalCount === 0 ? initialModalFocus : null);
      if (target?.isConnected && !target.closest("[hidden], [inert]")) target.focus();
      if (openModalCount === 0) initialModalFocus = null;
    };
  }, [visible]);

  return createPortal(
    <div hidden={!visible} inert={!visible}>
    <div className={`modal-root${className ? ` ${className}` : ""}`}>
      <div className="modal-overlay" role="presentation" />
      <div
        className="modal-positioner"
        onMouseDown={(event) => {
          if (closeOnBackdrop && event.target === event.currentTarget) {
            // Keep the backdrop's default mouse focus from overriding restoration.
            event.preventDefault();
            onCloseRef.current();
          }
        }}
      >
        <div
          className={`modal-panel${panelClassName ? ` ${panelClassName}` : ""}`}
          role={dialogRole}
          aria-modal="true"
          aria-labelledby={titleId}
          ref={panelRef}
          onFocusCapture={event => { if (event.target instanceof HTMLElement) lastFocusedRef.current = event.target; }}
          style={{ ...(width ? { "--modal-width": width } : {}), ...style } as CSSProperties}
          tabIndex={-1}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>
    </div>,
    document.body
  );
}
