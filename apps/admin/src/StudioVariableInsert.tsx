import { useState } from "react";
import { AdminDisclosureSummary, AdminSelect } from "./AdminNativeControls";
import { StudioButton, StudioInput } from "./StudioControls";
import { PageLoading } from "../../../src/shared/components/PageLoading";
import { variableMatches } from './variablePresentation';
import type { CustomVariable } from "./studioCustomVariableClient";
import { studioVariableValue } from "../../web/src/content/studioCustomVariables.mjs";

export default function StudioVariableInsert({ variables, context, onInsert, disabled = false, loading = false, error = "", onRetry }: {
  variables: CustomVariable[];
  context: Record<string, any>;
  onInsert: (token: string) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const filtered = variables.filter(item => variableMatches(query, item.name, item.label, item.description ?? "", ...(item.tags ?? [])));
  const selected = filtered.find(item => item.name === name);
  const resolved = selected ? studioVariableValue(selected, context) : null;
  return <details className="studio-variable-usage" onToggle={event => setOpen(event.currentTarget.open)}><AdminDisclosureSummary>My variables</AdminDisclosureSummary>{open && <div className="studio-section">
    <p>Insert writing you saved on the Variables page. These are your tokens, not calculated Sky facts or Writing Library phrases.</p>
    {loading ? <PageLoading compact message="Loading your variables…" />
      : error ? <div role="alert"><p>{error}</p>{onRetry && <StudioButton type="button" onClick={onRetry}>Retry my variables</StudioButton>}</div>
      : !variables.length ? <p className="admin-field-hint">No saved variables yet. Create one on the Variables page, then it will appear here to insert at the cursor.</p>
      : <>
        <label><span>Find my variable</span><StudioInput type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Name or tag" /></label>
        {filtered.length ? <div className="studio-variable-source"><label><span>Variable</span><AdminSelect aria-label="Variable" value={selected?.name ?? ""} onChange={event => setName(event.target.value)}><option value="">Choose a variable</option>{filtered.map(item => <option key={item.id} value={item.name}>{item.label} {`{{${item.name}}}`}</option>)}</AdminSelect></label><StudioButton disabled={disabled || !selected} onClick={() => selected && onInsert(`{{${selected.name}}}`)}>Insert variable</StudioButton></div>
          : <p className="admin-field-hint">No saved variables match that search.</p>}
        {resolved && <div className="studio-variable-description studio-context-panel"><span className="admin-field-hint">Value used here · {resolved.scope === "shared" ? "Shared writing" : `${resolved.scope} override`}</span><p><code>{`{{${selected!.name}}}`}</code></p>{selected?.description && <p>{selected.description}</p>}<p className="studio-variable-value studio-preview-canvas">{resolved.value || "No value is available for this context. You can insert the token into a draft; add its writing in Variables before publishing."}</p></div>}
      </>}
  </div>}</details>;
}
