import { useId, useRef, useState } from "react";
import { AdminSelect, AdminDisclosureSummary } from "./AdminNativeControls";
import { StudioButton, StudioInput, StudioTextarea } from "./StudioControls";
import { customVariableRequest, type CustomVariable, type CustomVariableInput, type CustomVariableOverride } from "./studioCustomVariableClient";
import { VARIABLE_PLANETS, VARIABLE_SIGNS, studioVariableValue } from "../../web/src/content/studioCustomVariables.mjs";

const title = (value: string) => value.split("-").map(word => word[0].toUpperCase() + word.slice(1)).join(" ");
const emptyVariable = (): CustomVariableInput => ({ name: "", label: "", description: "", value: "", tags: [], overrides: [] });
const tokenColor = (name: string) => String([...name].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 0) % 6 + 1);

function VariableForm({ initial, secret, onCancel, onSave }: { initial: CustomVariable | null; secret: string; onCancel: () => void; onSave: (variable: CustomVariable) => void }) {
  const helpId = useId();
  const [draft, setDraft] = useState<CustomVariableInput>(initial ?? emptyVariable);
  const [tags, setTags] = useState(initial?.tags.join(", ") ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [planet, setPlanet] = useState("");
  const [sign, setSign] = useState("");
  const editor = useRef<HTMLFormElement>(null);
  const update = (field: keyof CustomVariableInput, value: any) => setDraft(current => ({ ...current, [field]: value }));
  const override = (index: number, patch: Partial<CustomVariableOverride>) => update("overrides", draft.overrides.map((item, position) => position === index ? { ...item, ...patch } : item));
  const resolved = studioVariableValue(draft, { planet, sign });
  async function save() {
    setBusy(true); setError("");
    try {
      const data = await customVariableRequest(secret, initial ? "PATCH" : "POST", { ...(initial ? { id: initial.id, expectedUpdatedAt: initial.updatedAt } : {}), variable: { ...draft, tags: tags.split(",").map(tag => tag.trim()).filter(Boolean) } });
      onSave(data.variable);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save the variable."); }
    finally { setBusy(false); }
  }
  return <form ref={editor} className="studio-surface studio-section studio-variable-card" aria-label={initial ? `Edit ${initial.label}` : "Create variable"} onSubmit={event => { event.preventDefault(); void save(); }}>
    <header className="studio-section-header"><h2>{initial ? "Edit variable" : "Create variable"}</h2><StudioButton disabled={busy} onClick={onCancel}>Cancel</StudioButton></header>
    <div className="admin-filter-form">
      <label><span>Name</span><StudioInput autoFocus required maxLength={160} value={draft.label} onChange={event => update("label", event.target.value)} placeholder="A name that makes sense to you" /></label>
      <label><span>Token name</span><StudioInput aria-label="Token name" aria-describedby={`${helpId}-token`} required maxLength={64} pattern="[A-Za-z][A-Za-z0-9_]*" value={draft.name} onChange={event => update("name", event.target.value)} placeholder="myOpening" /><span id={`${helpId}-token`} className="admin-field-hint">{`Use {{${draft.name || "myOpening"}}} in your writing.`}</span></label>
    </div>
    {initial && draft.name !== initial.name && <p role="status">Renaming changes the token for future use. Update drafts that use {`{{${initial.name}}}`} before publishing them. Existing published writing retains its approved value.</p>}
    <label><span>Description</span><StudioTextarea rows={2} maxLength={2000} value={draft.description} onChange={event => update("description", event.target.value)} placeholder="What this variable means and how you use it" /></label>
    <label><span>Tags</span><StudioInput aria-label="Tags" aria-describedby={`${helpId}-tags`} value={tags} onChange={event => setTags(event.target.value)} placeholder="Your tags, separated by commas" /><span id={`${helpId}-tags`} className="admin-field-hint">Choose any tags you want. Tags organize the library; they do not change the value.</span></label>
    <label><span>Shared value</span><StudioTextarea aria-label="Shared value" aria-describedby={`${helpId}-value`} rows={4} maxLength={20000} value={draft.value} onChange={event => update("value", event.target.value)} placeholder="Write the reusable words or prose" /><span id={`${helpId}-value`} className="admin-field-hint">Used when no override matches. Values can be left unfinished while drafting; every used value must be complete before publication.</span></label>
    <section className="studio-section" aria-label="Context overrides">
      <div className="studio-section-header"><div><h3>Overrides</h3><p>Use different writing for a planet, sign, or placement. Priority: placement, planet, sign, shared value.</p></div><StudioButton onClick={() => update("overrides", [...draft.overrides, { scope: "placement", planet: "sun", sign: "aries", value: "" }])}>Add override</StudioButton></div>
      {draft.overrides.map((item, index) => <fieldset key={index} className="studio-section"><legend>Override {index + 1}</legend>
        <div className="admin-filter-form admin-filter-form--three">
          <label><span>Applies to</span><AdminSelect aria-label="Applies to" value={item.scope} onChange={event => override(index, { scope: event.target.value as CustomVariableOverride["scope"], planet: item.planet || "sun", sign: item.sign || "aries" })}><option value="placement">Placement</option><option value="planet">Planet</option><option value="sign">Sign</option></AdminSelect></label>
          {item.scope !== "sign" && <label><span>Planet</span><AdminSelect aria-label="Planet" value={item.planet} onChange={event => override(index, { planet: event.target.value })}>{VARIABLE_PLANETS.map((value: string) => <option key={value} value={value}>{title(value)}</option>)}</AdminSelect></label>}
          {item.scope !== "planet" && <label><span>Sign</span><AdminSelect aria-label="Sign" value={item.sign} onChange={event => override(index, { sign: event.target.value })}>{VARIABLE_SIGNS.map((value: string) => <option key={value} value={value}>{title(value)}</option>)}</AdminSelect></label>}
        </div>
        <label><span>Override value</span><StudioTextarea rows={3} maxLength={20000} value={item.value} onChange={event => override(index, { value: event.target.value })} /></label>
        <StudioButton onClick={() => update("overrides", draft.overrides.filter((_, position) => index !== position))}>Remove override {index + 1}</StudioButton>
      </fieldset>)}
    </section>
    <details className="studio-variable-usage"><AdminDisclosureSummary>Preview a value</AdminDisclosureSummary><div className="studio-section">
      <div className="admin-filter-form"><label><span>Preview planet</span><AdminSelect aria-label="Preview planet" value={planet} onChange={event => setPlanet(event.target.value)}><option value="">No planet</option>{VARIABLE_PLANETS.map((value: string) => <option key={value} value={value}>{title(value)}</option>)}</AdminSelect></label><label><span>Preview sign</span><AdminSelect aria-label="Preview sign" value={sign} onChange={event => setSign(event.target.value)}><option value="">No sign</option>{VARIABLE_SIGNS.map((value: string) => <option key={value} value={value}>{title(value)}</option>)}</AdminSelect></label></div>
      <p className="admin-field-hint">Using {resolved.scope} value</p><p className="studio-variable-value">{resolved.value || "No value written yet."}</p>
    </div></details>
    {error && <p role="alert">{error}</p>}
    <div className="admin-new-actions"><StudioButton type="submit" className="primary" disabled={busy}>{busy ? "Saving…" : "Save variable"}</StudioButton><p className="admin-field-hint">Save updates the library. Articles use new values when you save, review, and publish their drafts.</p></div>
  </form>;
}

export default function StudioCustomVariables({ variables, secret, query, tag, onChange, createRequest = 0, onCreateHandled }: { variables: CustomVariable[]; secret: string; query: string; tag: string; onChange: (variables: CustomVariable[]) => void; createRequest?: number; onCreateHandled: () => void }) {
  const [editing, setEditing] = useState<CustomVariable | null | undefined>(undefined);
  const [deleting, setDeleting] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");
  const terms = query.trim().toLocaleLowerCase().replace(/[{}]/gu, "").split(/\s+/u).filter(Boolean);
  const filtered = variables.filter(variable => (!tag || variable.tags.includes(tag)) && terms.every(term => [variable.name, variable.label, variable.description, variable.value, ...variable.tags, ...variable.overrides.flatMap(item => [item.planet, item.sign, item.value])].join(" ").toLocaleLowerCase().includes(term)));
  const creating = Boolean(createRequest);
  const close = () => { setEditing(undefined); onCreateHandled(); };
  async function remove(variable: CustomVariable) {
    setBusy(true); setError("");
    try { await customVariableRequest(secret, "DELETE", { id: variable.id, expectedUpdatedAt: variable.updatedAt }); onChange(variables.filter(item => item.id !== variable.id)); setDeleting(""); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not delete variable."); }
    finally { setBusy(false); }
  }
  if (creating || editing !== undefined) return <VariableForm key={creating ? "new" : editing?.id} initial={creating ? null : editing ?? null} secret={secret} onCancel={close} onSave={variable => { onChange([...variables.filter(item => item.id !== variable.id), variable].sort((a, b) => a.name.localeCompare(b.name))); close(); }} />;
  return <div className="studio-section studio-variable-list">
    {!filtered.length && <div className="studio-surface studio-section studio-variable-card"><h2>{variables.length ? "No matching variables" : "Create your first variable"}</h2><p>{variables.length ? "Try another search or tag." : "Name a reusable piece of writing, give it a value, and organize it with your own tags."}</p></div>}
    {filtered.map(variable => <article key={variable.id} className="studio-surface studio-section studio-variable-card" aria-label={variable.label}>
      <header className="admin-template-card-header"><div className="studio-variable-description"><h2>{variable.label}</h2><code data-variable-name={variable.name} data-variable-color={tokenColor(variable.name)}>{`{{${variable.name}}}`}</code></div><div className="admin-new-actions"><StudioButton onClick={() => setEditing(variable)}>Edit</StudioButton><StudioButton onClick={async () => { try { await navigator.clipboard.writeText(`{{${variable.name}}}`); setCopied(variable.id); } catch { setError("Copy unavailable. Select the token to copy it manually."); } }}>{copied === variable.id ? "Copied" : "Copy token"}</StudioButton></div></header>
      {variable.description && <p>{variable.description}</p>}
      {variable.tags.length > 0 && <ul className="admin-new-actions studio-variable-tags" aria-label="Tags">{variable.tags.map(value => <li key={value} className="ui-pill">{value}</li>)}</ul>}
      <div className="studio-variable-description"><span className="admin-field-hint">Shared value</span><p className="studio-variable-value">{variable.value || "No value written yet."}</p></div>
      {variable.overrides.length > 0 && <details className="studio-variable-usage"><AdminDisclosureSummary>{variable.overrides.length} {variable.overrides.length === 1 ? "override" : "overrides"}</AdminDisclosureSummary><ul>{variable.overrides.map(item => <li key={`${item.scope}/${item.planet}/${item.sign}`}><strong>{[item.planet, item.sign].filter(Boolean).map(title).join(" in ")}</strong><p className="studio-variable-value">{item.value || "No value written yet."}</p></li>)}</ul></details>}
      {deleting === variable.id ? <div className="studio-section" role="group" aria-label={`Delete ${variable.label}`}><p>Delete {`{{${variable.name}}}`} from your library? Existing publications keep their approved values. Drafts using this token must be updated before publishing.</p><div className="admin-new-actions"><StudioButton disabled={busy} onClick={() => void remove(variable)}>Confirm delete</StudioButton><StudioButton disabled={busy} onClick={() => setDeleting("")}>Cancel</StudioButton></div>{error && <p role="alert">{error}</p>}</div> : <StudioButton onClick={() => { setError(""); setDeleting(variable.id); }}>Delete variable</StudioButton>}
    </article>)}
    {error && !deleting && <p role="alert">{error}</p>}
  </div>;
}
