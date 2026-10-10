import { useEffect, useState } from "react";
import { StudioButton, StudioTextarea } from "./StudioControls";
import { requestStudioJson } from "./generatedContentClient";

export type PersonalizedReadingRow = {
  id: string; content_key: string; body: string | null; status: string; updated_at?: string | null;
};

/** Private rows use the private admin endpoint, never the public CMS library. */
export function PersonalizedReadingEditor({ row, secret, onSaved, onClose, onStateChange }: {
  row: PersonalizedReadingRow; secret: string;
  onSaved: (row: PersonalizedReadingRow) => void; onClose: () => void;
  onStateChange: (state: { dirty: boolean; busy: boolean }) => void;
}) {
  const [body, setBody] = useState(row.body ?? "");
  const [status, setStatus] = useState(row.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [reloadRequired, setReloadRequired] = useState(false);
  const dirty = body !== (row.body ?? "") || status !== row.status;
  useEffect(() => {
    onStateChange({ dirty, busy });
    return () => onStateChange({ dirty: false, busy: false });
  }, [dirty, busy, onStateChange]);
  async function save() {
    setBusy(true); setError(""); setSaved(false);
    try {
      const payload = await requestStudioJson("/api/admin/user-generated-content", secret, {
        method: "PATCH", body: JSON.stringify({ id: row.id, expectedUpdatedAt: row.updated_at, body, status })
      });
      const rows = payload.rows as PersonalizedReadingRow[] | undefined;
      const next = rows?.[0];
      if (!next || next.id !== row.id || next.body !== body || next.status !== status || !next.updated_at) {
        throw new Error("The saved reading could not be verified. Reload before trying again.");
      }
      onSaved(next); setSaved(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "The reading could not be saved.");
      setReloadRequired(true);
    } finally { setBusy(false); }
  }
  return <section className="admin-template-page" aria-label="Edit personalized reading">
    <h3>Edit personalized reading</h3>
    <p className="admin-content-row-key"><code>{row.content_key}</code></p>
    <label className="admin-field-wide">Full write-up<StudioTextarea disabled={busy} value={body} onChange={event => { setBody(event.target.value); setSaved(false); }} rows={18} /></label>
    <label className="admin-field-wide">Status<select aria-label="Status" disabled={busy} value={status} onChange={event => { setStatus(event.target.value); setSaved(false); }}>
      <option value="DRAFT">Draft</option><option value="REVIEWED">Reviewed</option><option value="LIVE">Live — approved for this reader</option><option value="ARCHIVED">Archived</option><option value="ERROR">Error</option>
    </select></label>
    <p>Only Live readings appear on the chart’s topic page. Save the complete approved write-up before setting it Live.</p>
    {error && <p role="alert">{error}</p>}
    {reloadRequired && <p>Keep a copy of your edits, then reload the saved reading before trying again.</p>}
    {saved && <p role="status">Reading saved.</p>}
    <StudioButton disabled={busy || reloadRequired || !dirty || !row.updated_at || (status === "LIVE" && !body.trim())} onClick={() => void save()}>{busy ? "Saving…" : "Save reading"}</StudioButton>
    <StudioButton disabled={busy} onClick={() => { if (!dirty || window.confirm("Discard unsaved changes to this reading?")) onClose(); }}>Close editor</StudioButton>
  </section>;
}
