import { useEffect, useRef, useState } from "react";
import { StudioButton, StudioInput, StudioTextarea, StudioStatusBadge } from "./StudioControls";
import { adminCredentialHeaders } from "./adminSecret";
import { calendarFeedCategories, type CalendarFeedEvent, type CalendarFeedEventRecord } from "../../web/src/features/calendar/calendarSubscription";

const emptyEvent = (): CalendarFeedEvent => ({ title: "", description: "", start: "", end: "", allDay: false, category: "key", url: "" });
const categoryLabels: Record<CalendarFeedEvent["category"], string> = { lunations: "New & Full Moons", "moon-signs": "Moon sign changes", seasons: "Season changes", ingresses: "Planet ingresses", retrogrades: "Retrograde stations", key: "Key events", weekly: "Weekly forecasts", aspects: "All aspects" };
function localInput(value: string, allDay: boolean) {
  if (!value || allDay) return value;
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
async function request(secret: string, method: string, body?: unknown, signal?: AbortSignal) {
  const response = await fetch("/api/admin/calendar-feed-events", { method, headers: { ...adminCredentialHeaders(secret), "content-type": "application/json" },
    signal: signal ?? AbortSignal.timeout(20000), ...(body ? { body: JSON.stringify(body) } : {}) });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok || method === "GET" && !Array.isArray(payload.events) || method !== "GET" && !payload.event?.updated_at) throw new Error(payload?.error ?? "The calendar operation could not be confirmed. Your draft is still here.");
  return payload;
}
export default function CalendarSubscriptionEvents({ secret, dirtyRef }: { secret: string; dirtyRef: { current: boolean } }) {
  const [events, setEvents] = useState<CalendarFeedEventRecord[]>([]);
  const [selected, setSelected] = useState<CalendarFeedEventRecord | null>(null);
  const [draft, setDraft] = useState<CalendarFeedEvent>(emptyEvent);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const operation = useRef(false);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const dirty = editing && JSON.stringify(draft) !== JSON.stringify(selected?.draft ?? emptyEvent());
  dirtyRef.current = dirty || busy;
  useEffect(() => () => { dirtyRef.current = false; }, [dirtyRef]);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    void request(secret, "GET", undefined, controller.signal).then(data => { if (!controller.signal.aborted) setEvents(data.events); })
      .catch(reason => { if (!controller.signal.aborted) setError(reason.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [secret, attempt]);
  function open(event: CalendarFeedEventRecord | null) {
    if (busy || dirty && !window.confirm("Discard the unsaved event changes?")) return;
    setSelected(event); setDraft(event?.draft ?? emptyEvent()); setEditing(true); setMessage(""); setError("");
  }
  async function save(action: "draft" | "publish" | "cancel") {
    if (operation.current) return;
    operation.current = true; setBusy(true); setError(""); setMessage("");
    try {
      const data = await request(secret, selected ? "PATCH" : "POST", { action, event: draft,
        ...(selected ? { id: selected.id, expectedUpdatedAt: selected.updated_at } : {}) });
      setSelected(data.event); setDraft(data.event.draft);
      setEvents(current => [data.event, ...current.filter(item => item.id !== data.event.id)]);
      setMessage(action === "draft" ? "Draft saved. Subscribers still receive the last published version." : action === "cancel" ? "Event cancelled. Calendar apps will receive the cancellation on refresh." : "Event published. Existing subscription links now include this version.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The event could not be saved."); }
    finally { operation.current = false; setBusy(false); }
  }
  function setDate(field: "start" | "end", value: string) {
    setDraft(current => ({ ...current, [field]: !value || current.allDay ? value : new Date(value).toISOString() }));
  }
  return <section className="admin-template-page" aria-label="Subscription events">
    <header className="admin-composition-detail-header"><div><h2>Subscription events</h2>
      <p>Add events and publish changes to existing calendar subscriptions. Saved drafts remain private.</p></div>
      <StudioButton className="admin-primary-button" disabled={busy} onClick={() => open(null)}>Add event</StudioButton>
    </header>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <StudioButton disabled={loading || busy} onClick={() => setAttempt(value => value + 1)}>Refresh events</StudioButton>
    {loading ? <p role="status">Loading subscription events…</p> : <div className="admin-workbench">
      <aside className="admin-list-panel" aria-label="Saved subscription events">
        {!events.length && <p>No subscription events yet. Calculated calendar events are included automatically.</p>}
        {events.map(event => <div key={event.id} className="admin-review-status-bar">
          <StudioButton onClick={() => open(event)} disabled={busy}>{event.draft.title}</StudioButton>
          <StudioStatusBadge tone={event.cancelled ? "retired" : event.published ? "live" : "draft"}>{event.cancelled ? "Cancelled" : event.published ? "Published" : "Draft"}</StudioStatusBadge>
        </div>)}
      </aside>
      {editing && <form className="admin-post-editor" onSubmit={event => { event.preventDefault(); void save("draft"); }}>
        <label>Event title<StudioInput required value={draft.title} maxLength={300} disabled={busy} onChange={event => setDraft(current => ({ ...current, title: event.target.value }))} /></label>
        <label>Description<StudioTextarea formatting={false} rows={8} value={draft.description} disabled={busy} onChange={event => setDraft(current => ({ ...current, description: event.target.value }))} /></label>
        <label>Category<select value={draft.category} disabled={busy} onChange={event => setDraft(current => ({ ...current, category: event.target.value as CalendarFeedEvent["category"] }))}>{calendarFeedCategories.map(category => <option key={category} value={category}>{categoryLabels[category]}</option>)}</select></label>
        <label><StudioInput type="checkbox" checked={draft.allDay} disabled={busy} onChange={event => setDraft(current => ({ ...current, allDay: event.target.checked, start: "", end: "" }))} />All day</label>
        <p className="admin-field-hint">{draft.allDay ? "The end date is the first day after the event." : `Times in ${Intl.DateTimeFormat().resolvedOptions().timeZone}.`}</p>
        <label>Starts<StudioInput required type={draft.allDay ? "date" : "datetime-local"} value={localInput(draft.start, draft.allDay)} disabled={busy} onChange={event => setDate("start", event.target.value)} /></label>
        <label>Ends<StudioInput required type={draft.allDay ? "date" : "datetime-local"} value={localInput(draft.end, draft.allDay)} disabled={busy} onChange={event => setDate("end", event.target.value)} /></label>
        <label>Event link (optional)<StudioInput type="url" value={draft.url} placeholder="https://" disabled={busy} onChange={event => setDraft(current => ({ ...current, url: event.target.value }))} /></label>
        <div className="admin-template-actions">
          <StudioButton type="submit" disabled={busy}>Save draft</StudioButton>
          <StudioButton className="admin-primary-button" disabled={busy || !draft.title || !draft.start || !draft.end} onClick={() => void save("publish")}>Save &amp; publish</StudioButton>
          {selected?.published && !selected.cancelled && <StudioButton disabled={busy || dirty} onClick={() => void save("cancel")}>Cancel event</StudioButton>}
          <StudioButton disabled={busy} onClick={() => { if (!dirty || window.confirm("Discard the unsaved event changes?")) setEditing(false); }}>Close event</StudioButton>
        </div>
      </form>}
    </div>}
  </section>;
}
