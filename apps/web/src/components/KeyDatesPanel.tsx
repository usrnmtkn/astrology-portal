import { ChevronDown } from "lucide-react";
import { useId, type ComponentPropsWithoutRef, type ReactNode } from "react";
import "../styles/key-dates-panel.css";

/** Shared disclosure chrome; each reader retains its verified dates and actions. */
export function KeyDatesPanel({ children, count, pending, titleId, className = "", ...attributes }: Omit<ComponentPropsWithoutRef<"details">, "children"> & {
  children: ReactNode;
  count: number;
  pending?: boolean;
  titleId?: string;
  className?: string;
}) {
  const generatedId = useId();
  const headingId = titleId ?? generatedId;
  return <details {...attributes} className={`key-dates-panel ${className}`} aria-labelledby={headingId}
    aria-busy={pending || undefined}>
    <summary className="key-dates-panel__summary">
      <h2 id={headingId} className="key-dates-panel__title">Key dates</h2>
      {!pending && <span className="key-dates-panel__count">{count}</span>}
      <span className="key-dates-panel__chevron"><ChevronDown aria-hidden="true" /></span>
    </summary>
    <div className="key-dates-panel__content">{children}</div>
  </details>;
}
