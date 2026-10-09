import type { ReactNode } from "react";
import { AdminSelect } from "./AdminNativeControls";
import { StudioButton } from "./StudioControls";
import ContentLiveStatusBadge from "./ContentLiveStatus";
import type { AdminGeneratedContentRow } from "./GeneratedContentAdminDashboard";
import { calendarPlanets, calendarPlanetarySigns, calendarPlanetaryListIdentity, calendarPlanetaryTitle,
  calendarPlanetaryDraft, planetaryName, type CalendarPlanetaryKind, type CalendarPlanetarySelection } from "./calendarPlanetarySources";

export default function CalendarPlanetaryWorkspace({ kind, rows, selection, onSelection, busy, onOpen, onEdit, editor }: {
  kind: CalendarPlanetaryKind; rows: AdminGeneratedContentRow[]; selection: CalendarPlanetarySelection;
  onSelection: (value: CalendarPlanetarySelection) => void; busy: boolean;
  onOpen: () => void; onEdit: (row: AdminGeneratedContentRow) => void; editor: ReactNode;
}) {
  const label = kind === "ingress" ? "Planetary ingresses" : "Planetary stations";
  const entries = rows.flatMap(row => {
    const identity = calendarPlanetaryListIdentity(row.content_key);
    return identity?.kind === kind && (!selection.planet || identity.planet === selection.planet)
      && (!selection.sign || !identity.sign || identity.sign === selection.sign)
      && (kind === "ingress" || identity.direction === selection.direction) ? [{ row, identity }] : [];
  }).sort((a, b) => a.row.content_key.localeCompare(b.row.content_key));
  return <section className="admin-template-page" aria-label={label}>
    <p>{kind === "ingress" ? "Edit the write-ups shown when a planet enters a sign. Sun season readings and Moon ingresses have their own tabs."
      : "Edit station write-ups and retrograde-period passages. General planet readings and sign-specific writing are listed together."}</p>
    <div className="admin-review-filter-grid studio-surface">
      <label><span>Planet or point</span><AdminSelect aria-label="Planet or point" value={selection.planet} onChange={event => onSelection({ ...selection, planet: event.target.value })}>
        <option value="">All planets and points</option>{calendarPlanets.map(planet => <option key={planet} value={planet}>{planetaryName(planet)}</option>)}
      </AdminSelect></label>
      <label><span>{kind === "ingress" ? "Enters sign" : "Station sign"}</span><AdminSelect aria-label={kind === "ingress" ? "Enters sign" : "Station sign"} value={selection.sign} onChange={event => onSelection({ ...selection, sign: event.target.value })}>
        <option value="">All signs</option>{calendarPlanetarySigns.map(sign => <option key={sign} value={sign}>{planetaryName(sign)}</option>)}
      </AdminSelect></label>
      {kind === "station" && <label><span>Station direction</span><AdminSelect aria-label="Station direction" value={selection.direction} onChange={event => onSelection({ ...selection, direction: event.target.value as CalendarPlanetarySelection["direction"] })}>
        <option value="retrograde">Retrograde</option><option value="direct">Direct</option>
      </AdminSelect></label>}
      <StudioButton disabled={busy || !calendarPlanetaryDraft(kind, selection)} onClick={onOpen}>Open write-up</StudioButton>
    </div>
    <p>Choose a planet and sign to open its saved write-up or start an empty draft.{kind === "ingress" && " A dated ingress write-up takes priority over the reusable sign reading; open dated entries from the list below."}</p>
    {editor}
    <section className="admin-template-page" aria-label={`Saved ${label.toLowerCase()}`}>
      <p role="status">{busy ? "Loading saved write-ups…" : `${entries.length} saved ${entries.length === 1 ? "write-up" : "write-ups"}`}</p>
      <div className="admin-data-table-shell"><table className="admin-data-table admin-season-transition-table" aria-label={`${label} write-ups`}>
        <thead><tr><th scope="col">Event</th><th scope="col">Content key</th><th scope="col" className="admin-col-visibility">Publication</th><th scope="col" className="admin-col-edit"><span className="sr-only">Edit</span></th></tr></thead>
        <tbody>{entries.map(({ row, identity }) => <tr key={row.id}>
          <td data-label="Event">{calendarPlanetaryTitle(identity)}{identity.date && <small className="admin-field-hint">{identity.date}</small>}{!identity.sign && <small className="admin-field-hint">General wording for this planet</small>}</td>
          <td data-label="Content key">{row.content_key}</td>
          <td data-label="Publication"><ContentLiveStatusBadge row={row} /></td>
          <td className="admin-col-edit"><StudioButton disabled={busy} aria-label={`Edit ${row.content_key}`} onClick={() => onEdit(row)}>Edit</StudioButton></td>
        </tr>)}</tbody>
      </table></div>
      {!busy && !entries.length && <div className="admin-empty"><p>No saved write-ups match this selection. Start a draft above to add one.</p></div>}
    </section>
  </section>;
}
