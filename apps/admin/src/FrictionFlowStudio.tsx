import { useState } from "react";
import { AdminSelect } from "./AdminNativeControls";
import { StudioButton } from "./StudioControls";
import { frictionFlowFields } from "../../web/src/content/frictionFlowCatalog";

export function FrictionFlowStudio({ onEdit, busy }: { onEdit: (key: string) => void; busy: boolean }) {
  const groups = [...new Set(frictionFlowFields.map(field => field.group))];
  const [group, setGroup] = useState("Status explanations");
  const [key, setKey] = useState("cms/friction-flow/explanation/easy");
  const selected = frictionFlowFields.find(field => field.key === key)!;
  return <section className="admin-editor-guidance" aria-label="Friction and flow writing">
    <h2>Friction and flow writing</h2>
    <p>Edit status explanations, annual profections, method explanations, aspect labels and feed controls. Personal Transits and Connection Activations remain their existing shared sources.</p>
    <label>Writing group<AdminSelect value={group} onChange={event => {
      setGroup(event.target.value);
      setKey(frictionFlowFields.find(field => field.group === event.target.value)!.key);
    }}>{groups.map(value => <option key={value}>{value}</option>)}</AdminSelect></label>
    <label>Writing source<AdminSelect value={key} onChange={event => setKey(event.target.value)}>{frictionFlowFields.filter(field => field.group === group).map(field => <option key={field.key} value={field.key}>{field.label}</option>)}</AdminSelect></label>
    <p><code>{selected.key}</code></p>
    <p>Existing app default:</p><p>{selected.body}</p>
    {selected.allowedSlots.length > 0 && <p>Calculated variables: {selected.allowedSlots.map(slot => `{${slot}}`).join(", ")}. Keep each once; the app supplies the values.</p>}
    <p>Open the source to load its saved version. Save keeps a draft; Save &amp; publish updates the reader. This changes writing, not the feed design or astrology calculations.</p>
    <StudioButton type="button" disabled={busy} onClick={() => onEdit(key)}>Edit Friction/Flow writing</StudioButton>
  </section>;
}
