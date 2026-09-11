import { StudioButton } from "./StudioControls";
import { ChevronDown, ChevronRight } from "lucide-react";
import { forwardRef, type ComponentPropsWithoutRef } from "react";

/** Native select behavior, shared Studio styling, and no duplicated popup state. */
export const AdminSelect = forwardRef<HTMLSelectElement, ComponentPropsWithoutRef<"select">>(
  function AdminSelect({ className = "", ...props }, ref) {
    const listbox = props.multiple || (props.size ?? 0) > 1;
    return <span className="admin-select-shell" hidden={props.hidden} data-disabled={props.disabled || undefined}>
      <select {...props} ref={ref} className={`admin-native-select ${className}`} />
      {!listbox && <ChevronDown className="admin-select-chevron" size={16} aria-hidden="true" />}
    </span>;
  }
);

/** The browser owns disclosure state and Enter/Space behavior. */
export function AdminDisclosureSummary({ children, className = "", showChevron = true, ...props }: ComponentPropsWithoutRef<"summary"> & { showChevron?: boolean }) {
  return <summary {...props} className={`admin-disclosure-summary ${className}`}>
    {showChevron && <ChevronRight className="admin-disclosure-chevron" size={16} aria-hidden="true" />}
    {children}
  </summary>;
}

export function AdminDisclosureButton({ children, className = "", ...props }: ComponentPropsWithoutRef<"button">) {
  return <StudioButton type="button" {...props} className={`admin-disclosure-button ${className}`}>
    <ChevronRight className="admin-disclosure-chevron" size={16} aria-hidden="true" />
    {children}
  </StudioButton>;
}
