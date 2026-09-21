import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function CalendarSlideout({
  labelledBy,
  label,
  onClose,
  children,
  leading,
  variant = "event"
}: {
  labelledBy?: string;
  label: string;
  onClose: () => void;
  children: ReactNode;
  leading?: ReactNode;
  variant?: "day" | "event" | "sheet" | "checkin";
}) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onCloseRef.current();
    }

    document.addEventListener("keydown", onKeyDown);
    window.scrollTo(scrollX, scrollY);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return createPortal(
    <div className={`calendar-slideout calendar-slideout--${variant}`} data-screen-label={label}>
      <button
        aria-label="Close overlay"
        className="calendar-slideout__scrim"
        onClick={onClose}
        type="button"
      />
      <aside
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : label}
        aria-modal="true"
        className="calendar-slideout__panel"
        role="dialog"
      >
        {variant === "sheet" ? null : (
          <div className="calendar-slideout__toolbar">
            {leading}
            <button
              aria-label="Close"
              className="calendar-slideout__close"
              onClick={onClose}
              type="button"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        )}
        {children}
      </aside>
    </div>,
    document.body
  );
}
