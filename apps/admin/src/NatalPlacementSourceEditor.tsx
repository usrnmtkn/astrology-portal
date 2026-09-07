import { useEffect, useState } from "react";
import { effectivePackageRecord } from "./skyFallbackWorkspace";

export type NatalSourceEdits = Record<string, string>;
export type NatalEditableRow = { id?: string | null; content_key: string; body: string | null; sections: unknown; updated_at?: string | null };

export function natalSourceFields(row: NatalEditableRow): NatalSourceEdits {
  const record = effectivePackageRecord(row.sections);
  const fields: NatalSourceEdits = {};
  for (const field of ["body", "body_you", "body_they", "text"]) {
    if (typeof record[field] === "string") fields[field] = record[field];
  }
  return Object.keys(fields).length ? fields : { body: row.body ?? "" };
}

export default function NatalPlacementSourceEditor({ row, label, disabled, onDirtyChange, onSave }: {
  row: NatalEditableRow;
  label: string;
  disabled: boolean;
  onDirtyChange: (key: string, dirty: boolean) => void;
  onSave: (row: NatalEditableRow, edits: NatalSourceEdits, publish: boolean) => Promise<boolean>;
}) {
  const [edits, setEdits] = useState<NatalSourceEdits | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [baseline, setBaseline] = useState(row);
  const fields = edits ?? natalSourceFields(row);
  const dirty = edits !== null && JSON.stringify(edits) !== JSON.stringify(natalSourceFields(baseline));
  useEffect(() => {
    onDirtyChange(row.content_key, dirty);
    return () => onDirtyChange(row.content_key, false);
  }, [row.content_key, dirty, onDirtyChange]);
  async function save(publish: boolean) {
    setSaving(true);
    setFeedback("");
    try {
      if (await onSave(edits ? baseline : row, fields, publish)) {
        setEdits(null);
        setFeedback(publish ? "Published. The reader preview will refresh." : "Revision saved. Publish when ready.");
      } else {
        setFeedback("Could not save. Your edits are still here; check the error notification for details.");
      }
    } finally { setSaving(false); }
  }
  return (
    <div className="admin-natal-source-editor">
      {Object.entries(fields).map(([field, value]) => (
        <label key={field}>
          <span>{field === "body_they" ? "Friend view copy" : "You view copy"}</span>
          <textarea aria-label={`${label}: ${field === "body_they" ? "Friend" : "You"} copy`} rows={row.content_key.includes("placement-sign-final/") ? 14 : 4} value={value} disabled={disabled || saving}
            onChange={(event) => {
              if (!edits) setBaseline(row);
              setEdits({ ...fields, [field]: event.target.value });
              setFeedback("");
            }} />
        </label>
      ))}
      <div className="admin-natal-source-actions">
        <button type="button" disabled={disabled || saving || !dirty} onClick={() => void save(false)}>Save revision</button>
        <button type="button" disabled={disabled || saving || (!dirty && !(row.sections as { packageDraft?: unknown })?.packageDraft)} onClick={() => void save(true)}>Save &amp; publish</button>
        {dirty && <button type="button" disabled={saving} onClick={() => { setEdits(null); setFeedback(""); }}>Cancel edits</button>}
      </div>
      <p className="admin-field-hint" role="status">{saving ? "Saving…" : feedback || (dirty ? "Unsaved changes" : "")}</p>
    </div>
  );
}
