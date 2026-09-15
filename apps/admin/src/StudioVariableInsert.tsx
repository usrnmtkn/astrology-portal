import { useState } from "react";
import { AdminDisclosureSummary, AdminSelect } from "./AdminNativeControls";
import { StudioButton, StudioInput } from "./StudioControls";
import type { CustomVariable } from "./studioCustomVariableClient";
import { studioVariableValue } from "../../web/src/content/studioCustomVariables.mjs";

export default function StudioVariableInsert({ variables, context, onInsert, disabled = false }: { variables: CustomVariable[]; context: Record<string, any>; onInsert: (token: string) => void; disabled?: boolean }) {
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const filtered = variables.filter(item => [item.name, item.label, ...(item.tags ?? [])].join(" ").toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const selected = filtered.find(item => item.name === name);
  const resolved = selected ? studioVariableValue(selected, context) : null;
  return <details className="studio-variable-usage"><AdminDisclosureSummary>My variables</AdminDisclosureSummary><div className="studio-section">
    <p>Insert your saved writing at the cursor. The token stays in the editor; previews use the matching value.</p>
    <label><span>Find my variable</span><StudioInput type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Name or tag" /></label>
    <div className="studio-variable-source"><label><span>Variable</span><AdminSelect aria-label="Variable" value={selected?.name ?? ""} onChange={event => setName(event.target.value)}><option value="">Choose a variable</option>{filtered.map(item => <option key={item.id} value={item.name}>{item.label} {`{{${item.name}}}`}</option>)}</AdminSelect></label><StudioButton disabled={disabled || !selected} onClick={() => selected && onInsert(`{{${selected.name}}}`)}>Insert variable</StudioButton></div>
    {resolved && <div className="studio-variable-description"><span className="admin-field-hint">{resolved.scope} value</span><p className="studio-variable-value">{resolved.value || "No value written yet. Complete it in Variables before publishing."}</p></div>}
  </div></details>;
}
