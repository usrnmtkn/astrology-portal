import "../../styles/header-date-picker.css";
import { useEffect, useId, useState, type CSSProperties, type ReactNode, type Ref, type RefObject } from "react";
import { MapPin, Navigation, Search, X } from "lucide-react";
import { ModalPortal } from "../../components/ModalPortal";
import { SegmentedControl } from "../../components/SegmentedControl";
import SkyDatePicker from "./SkyDatePicker";
import { dateFromInput } from "../../services/skySelection";

export default function HeaderSkyControls({ value, today, tomorrow, onSelect, onClose, anchorRef, locationLabel,
  editingLocation, onEditLocation, query, onQuery, locationFormRef, locationInputRef, locationTriggerRef, results, onSubmitLocation, onCurrentLocation
}: {
  value: string; today: string; tomorrow: string; onSelect: (value: string) => void; onClose: () => void;
  anchorRef: RefObject<HTMLButtonElement | null>; locationLabel?: string; editingLocation: boolean;
  onEditLocation: () => void; query: string; onQuery: (value: string) => void;
  locationFormRef: Ref<HTMLFormElement>; locationInputRef: Ref<HTMLInputElement>; locationTriggerRef: Ref<HTMLButtonElement>; results: ReactNode;
  onSubmitLocation: () => void; onCurrentLocation: () => Promise<void>;
}) {
  const titleId = useId();
  const [tab, setTab] = useState(value === today ? "today" : value === tomorrow ? "tomorrow" : "date");
  const [draft, setDraft] = useState(value);
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const align = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (rect) setPosition({ top: rect.bottom, right: Math.max(0, innerWidth - rect.right) });
    };
    align(); window.addEventListener("resize", align);
    return () => window.removeEventListener("resize", align);
  }, [anchorRef]);
  return <ModalPortal onClose={onClose} closeOnBackdrop restoreFocusId="header-date-trigger" titleId={titleId}
    className="header-date-modal" panelClassName="header-date-panel"
    style={{ "--header-picker-top": `${position.top}px`, "--header-picker-right": `${position.right}px` } as CSSProperties}>
    <section className="mobile-sky-controls" id="mobile-sky-controls">
      <h2 id={titleId} className="sr-only">{locationLabel ? "Date and location" : "Transit date"}</h2>
      <span className="header-date-handle" aria-hidden="true" />
      <div className="header-date-sheet-heading">
        <span>{locationLabel ? "Date and place" : "Transit date"}</span>
        <button type="button" className="header-date-close" aria-label="Close date and location" onClick={onClose}><X size={18} aria-hidden="true" /></button>
      </div>
      <div className="header-date-toolbar">
        <SegmentedControl ariaLabel="Transit date shortcuts" value={tab} onChange={next => {
          setTab(next); if (next !== "date") onSelect(next === "today" ? today : tomorrow);
        }} options={[{value:"today",label:"Today"},{value:"tomorrow",label:"Tomorrow"},{value:"date",label:"Date"}]} />
        <button type="button" className="header-date-close" aria-label="Close date and location" onClick={onClose}><X size={18} aria-hidden="true" /></button>
      </div>
      {tab === "date" && <SkyDatePicker embedded value={draft} onSelect={setDraft} onClose={onClose} />}
      {locationLabel && <div className="header-date-location">
        <span className="header-date-location__label">Location</span>
        {editingLocation ? <form ref={locationFormRef} onSubmit={event => { event.preventDefault(); onSubmitLocation(); }}>
          <label className="header-date-search"><Search size={18} aria-hidden="true" /><input ref={locationInputRef} aria-label="City" placeholder="Search for a city" value={query} onChange={event => onQuery(event.target.value)} /></label>
          {results}
        </form> : <button className="mobile-sky-controls__location" ref={locationTriggerRef} type="button" onClick={onEditLocation}><MapPin size={20} aria-hidden="true" /><span>{locationLabel}</span></button>}
        <button type="button" className="header-date-geolocate" disabled={locating} onClick={async () => {
          setLocating(true); setError("");
          try { await onCurrentLocation(); } catch { setError("Could not get your location. Search for a city instead."); }
          finally { setLocating(false); }
        }}><Navigation size={18} aria-hidden="true" />{locating ? "Finding your location…" : "Use my current location"}</button>
        {error && <p role="alert">{error}</p>}
      </div>}
      {tab === "date" && <button className="header-date-apply" type="button" onClick={() => onSelect(draft)}>Show {dateFromInput(draft).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</button>}
    </section>
  </ModalPortal>;
}
