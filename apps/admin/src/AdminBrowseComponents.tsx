import { StudioButton, StudioInput } from "./StudioControls";
import { AdminDisclosureButton } from "./AdminNativeControls";
import { Search, SlidersHorizontal } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

type AdminFilterBarProps = {
  label: string;
  searchLabel: string;
  query: string;
  placeholder: string;
  onQueryChange: (query: string) => void;
  tabs?: ReactNode;
  filters: ReactNode;
  actions: ReactNode;
  secondary?: ReactNode;
  activeFilterCount: number;
};

/** A consistent search-first layout; each workspace owns its filtering rules. */
export function AdminFilterBar({ label, searchLabel, query, placeholder, onQueryChange, tabs, filters, actions, secondary, activeFilterCount }: AdminFilterBarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersId = useId();
  return (
    <section className="admin-content-filters admin-browse-filters" aria-label={label}>
      {tabs}
      <div className="admin-browse-search-row">
        <label className="admin-browse-search">
          <span className="sr-only">{searchLabel}</span>
          <Search size={18} aria-hidden="true" />
          <StudioInput type="search" aria-label={searchLabel} value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={placeholder} />
        </label>
        <div className="admin-browse-actions">
          <StudioButton className="admin-browse-filter-toggle" type="button" aria-expanded={filtersOpen} aria-controls={filtersId} onClick={() => setFiltersOpen(open => !open)}>
            <SlidersHorizontal size={16} aria-hidden="true" />
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </StudioButton>
          {actions}
        </div>
      </div>
      <div className="admin-browse-filter-options" id={filtersId} data-expanded={filtersOpen}>
        <div className="admin-browse-filter-fields">{filters}</div>
        {secondary && <div className="admin-browse-secondary">{secondary}</div>}
      </div>
    </section>
  );
}

export type AdminBrowseRow = {
  id: string;
  title: string;
  kind: string;
  contentKey: string;
  status: ReactNode;
  details: ReactNode;
  destination?: { label: string; detail: string } | null;
  selected: boolean;
  checked: boolean;
  onSelect: () => void;
  onOpen?: () => void;
};

function AdminContentTableRow({ row }: { row: AdminBrowseRow }) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  return (
    <tbody className="admin-content-row-group" data-expanded={expanded}>
    <tr className={`admin-content-row ${row.selected ? "selected" : ""}`} onClick={row.onOpen}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget || !["Enter", " "].includes(event.key)) return;
        event.preventDefault();
        row.onOpen?.();
      }} tabIndex={row.onOpen ? 0 : undefined}>
      <td className="admin-col-select" onClick={(event) => event.stopPropagation()}>
        <label className="admin-content-row-check">
          <StudioInput type="checkbox" checked={row.checked} onChange={row.onSelect} aria-label={`Select ${row.title}`} />
        </label>
      </td>
      <td className="admin-content-title-cell admin-col-content">
        <span className="admin-content-row-title">{row.title}</span>
        <span className="sr-only">{row.contentKey}</span>
        <small className="admin-content-type-label admin-field-hint">{row.kind}</small>
        <span className="admin-content-mobile-status">{row.status}</span>
      </td>
      <td className="admin-col-visibility">{row.status}</td>
      {row.destination && <td className="admin-content-location admin-col-destination">
        <strong>{row.destination.label}</strong><small>{row.destination.detail}</small>
      </td>}
      <td className="admin-col-source" onClick={(event) => event.stopPropagation()}>
        <AdminDisclosureButton aria-expanded={expanded} aria-controls={detailsId} onClick={() => setExpanded(value => !value)}>
          Details<span className="sr-only"> for {row.title}</span>
        </AdminDisclosureButton>
      </td>
      <td className="admin-col-edit">
        {row.onOpen && <StudioButton className="admin-edit-row-button" type="button" onClick={(event) => { event.stopPropagation(); row.onOpen?.(); }}>Edit</StudioButton>}
      </td>
    </tr>
    <tr className="admin-content-expanded-row" hidden={!expanded}>
      <td colSpan={row.destination ? 5 : 4}>
        <div id={detailsId} className="admin-content-expanded-body" role="region" aria-label={`Details for ${row.title}`}>
          <code className="admin-content-row-key">{row.contentKey}</code>
          {row.details}
        </div>
      </td>
    </tr>
    </tbody>
  );
}

export function AdminContentTable({ rows, showDestination, emptyMessage }: { rows: AdminBrowseRow[]; showDestination: boolean; emptyMessage: string }) {
  return (
    <div className="admin-content-table-scroll admin-browse-table">
      <table className="admin-content-table admin-content-table--browse">
        <caption className="sr-only">Content rows. Open a row to edit its writing.</caption>
        <thead className="admin-content-table-head"><tr>
          <th className="admin-col-select" scope="col">Select</th>
          <th className="admin-col-content" scope="col">Content</th>
          <th className="admin-col-visibility" scope="col">Status</th>
          {showDestination && <th className="admin-col-destination" scope="col">App destination</th>}
          <th className="admin-col-source" scope="col">Details</th>
          <th className="admin-col-edit" scope="col"><span className="sr-only">Edit</span></th>
        </tr></thead>
        {rows.map((row) => <AdminContentTableRow key={row.id} row={row} />)}
      </table>
      {rows.length === 0 && <p className="admin-empty" role="status">{emptyMessage}</p>}
    </div>
  );
}

/** Shared presentation for operational tables that retain their own workflow cells. */
export function AdminDataTable({ columns, children, className = "", label }: { columns: string[]; children: ReactNode; className?: string; label: string }) {
  return <div className="admin-data-table-shell">
    <table className={`admin-content-table admin-data-table ${columns.length > 6 ? "admin-data-table--wide" : ""} ${className}`}>
      <caption className="sr-only">{label}</caption>
      <thead><tr>{columns.map(column => <th key={column} scope="col">{column}</th>)}</tr></thead>
      <tbody>{children}</tbody>
    </table>
  </div>;
}
