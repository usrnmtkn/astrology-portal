import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StudioButton, StudioInput, StudioTabs, StudioTextarea } from "./StudioControls";
import { AdminSelect } from "./AdminNativeControls";
import { adminCredentialHeaders } from "./adminSecret";
import { calendarVariableColor } from "./calendarOverviewTemplate";
import { composeWriting, validVariableName, type WritingTemplate, type PhraseValues, type WritingDefinition, type PhraseDefinition } from "../../../src/content-studio/phraseTemplates";
import { monthlyTemplateContext, type MonthlyFacts, type MonthlySelection, type EventSuggestion } from "../../../src/content-studio/monthlyComposition";
import type { CalendarMemoryReceipt, CalendarPhraseReceipt, CalendarPhraseSourceSupport } from "../../../src/content-studio/calendarWritingTypes";

type Loaded = { facts: MonthlyFacts; factsHash: string; template: WritingTemplate; sharedTemplate: WritingTemplate; selection: MonthlySelection;
  values: PhraseValues; templateVersion: string | null; editionVersion: string | null; suggestions: EventSuggestion[]; memory: CalendarMemoryReceipt | null; memoryError: string | null; sourceSupport: CalendarPhraseSourceSupport; receipts: CalendarPhraseReceipt[]; factsChanged: boolean };
type Tab = "highlights" | "patterns" | "phrases" | "preview" | "sources";
const tabOptions: { value: Tab; label: string }[] = [
  { value: "highlights", label: "Selected highlights" }, { value: "patterns", label: "Template patterns" }, { value: "phrases", label: "Phrase variables" },
  { value: "preview", label: "Assembled preview" }, { value: "sources", label: "Memory support" }
];
const editionSnapshot = (state: Loaded) => JSON.stringify({ template: state.template, selection: state.selection, values: state.values, receipts: state.receipts });

export default function MonthlyPhraseStudio({ credential, onClose, registerCloseGuard }: {
  credential: string; onClose: () => void; registerCloseGuard?: (guard: (() => boolean) | null) => void;
}) {
  const [month, setMonth] = useState(() => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; });
  const [timeZone, setTimeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [state, setState] = useState<Loaded | null>(null);
  const [tab, setTab] = useState<Tab>("highlights");
  const [definitionName, setDefinitionName] = useState("monthlyOverview");
  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState<"phrase" | "template">("phrase");
  const [requested, setRequested] = useState<string[]>([]);
  const [proposals, setProposals] = useState<Record<string, string>>({});
  const [proposalBaseline, setProposalBaseline] = useState("");
  const [proposalReceipt, setProposalReceipt] = useState<CalendarPhraseReceipt | null>(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const baseline = useRef("");
  const sharedBaseline = useRef("");
  const dirtyRef = useRef(false);
  const busyRef = useRef(false);
  const stateRef = useRef<Loaded | null>(state);
  stateRef.current = state;
  const requestController = useRef<AbortController | null>(null);
  const dirty = !!state && editionSnapshot(state) !== baseline.current;
  dirtyRef.current = dirty;
  busyRef.current = Boolean(busy);
  const composition = useMemo(() => state ? composeWriting(state.template, monthlyTemplateContext(state.facts, state.selection), state.values) : null, [state]);
  const canClose = useCallback(() => !busyRef.current && (!dirtyRef.current || window.confirm("Discard the unsaved monthly phrase draft?")), []);
  useEffect(() => { registerCloseGuard?.(canClose); return () => registerCloseGuard?.(null); }, [registerCloseGuard, canClose]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirtyRef.current || busyRef.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => { window.removeEventListener("beforeunload", warn); requestController.current?.abort(); };
  }, []);

  async function request<T>(body: unknown): Promise<T> {
    requestController.current?.abort();
    const controller = new AbortController(); requestController.current = controller;
    const timer = window.setTimeout(() => controller.abort(), 305_000);
    try {
      const response = await fetch("/api/admin/calendar-phrase-writing", { method: "POST", cache: "no-store", signal: controller.signal,
        headers: { "content-type": "application/json", ...adminCredentialHeaders(credential) }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || `Calendar request failed (${response.status}).`);
      return result as T;
    } catch (e) {
      if (controller.signal.aborted) throw new Error("The request was not confirmed. No automatic retry was made. Reload before retrying a save.");
      throw e;
    } finally { window.clearTimeout(timer); }
  }
  const inputs = (current: Loaded) => ({ month: current.facts.month, timeZone: current.facts.timeZone, factsHash: current.factsHash,
    template: current.template, selection: current.selection, values: current.values, receipts: current.receipts });
  const clearProposal = () => { setProposals({}); setProposalBaseline(""); setProposalReceipt(null); };
  function edit(update: (current: Loaded) => Loaded) {
    clearProposal(); setError(""); setMessage("");
    setState(current => current ? update(current) : null);
  }
  async function loadMonth() {
    if (!canClose()) return;
    setBusy("Loading calculated month and writing sources…"); setError(""); setMessage("");
    try {
      const result = await request<Loaded>({ action: "load", month, timeZone });
      baseline.current = editionSnapshot(result); sharedBaseline.current = JSON.stringify(result.sharedTemplate);
      setState(result); clearProposal();
      const preview = composeWriting(result.template, monthlyTemplateContext(result.facts, result.selection), result.values);
      setRequested(preview.phrases.filter(use => !result.values[use.key]?.text && !result.values[use.key]?.locked && result.sourceSupport[use.key]?.status === "ready").map(use => use.key));
      setTab("highlights");
      setMessage(result.editionVersion ? "Saved monthly draft restored. Nothing has been published." : "Month prepared. Review the highlights before generating phrase values.");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(""); }
  }
  async function checkSources() {
    if (!state) return;
    setBusy("Checking the active variables’ astrology sources…"); setError("");
    try {
      const result = await request<{ sourceSupport: CalendarPhraseSourceSupport }>({ action: "checkSources", ...inputs(state) });
      setState(current => current ? { ...current, sourceSupport: result.sourceSupport } : null);
      setRequested(current => current.filter(key => result.sourceSupport[key]?.status === "ready"));
      setMessage("Source coverage refreshed. Missing-source phrases remain editable but are not AI draft targets.");
    } catch (e) { setError((e as Error).message); } finally { setBusy(""); }
  }
  async function generate() {
    if (!state || !composition) return;
    const snapshot = editionSnapshot(state);
    const active = new Set(composition.phrases.filter(use => !state.values[use.key]?.locked && state.sourceSupport[use.key]?.status !== "needs-source").map(use => use.key));
    const chosen = requested.filter(key => active.has(key));
    if (!chosen.length) { setError("Select at least one active, unlocked phrase."); return; }
    if (chosen.length > 24) { setError("Select up to 24 phrases per generation."); return; }
    setBusy("Drafting selected phrase values using governed evidence…"); setError(""); clearProposal();
    try {
      const result = await request<{ proposals: Record<string, string>; memory: CalendarMemoryReceipt; receipt: CalendarPhraseReceipt }>({ action: "generate", ...inputs(state), requested: chosen });
      if (!stateRef.current || editionSnapshot(stateRef.current) !== snapshot) { setMessage("The draft changed during generation. Suggestions were not applied."); return; }
      setProposals(result.proposals); setProposalBaseline(snapshot); setProposalReceipt(result.receipt);
      setState(current => current ? { ...current, memory: result.memory, memoryError: null } : null);
      setTab("phrases"); setMessage("AI suggestions are ready for review. Apply a suggestion to its phrase field; your patterns have not changed.");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(""); }
  }
  function applyProposal(key: string) {
    if (!state || !proposalReceipt || state.values[key]?.locked || !Object.hasOwn(proposals, key)) return;
    if (editionSnapshot(state) !== proposalBaseline) { setError("These suggestions were based on an older draft. Generate again before applying them."); return; }
    const next = { ...state, receipts: [...state.receipts.filter(receipt => receipt.id !== proposalReceipt.id), proposalReceipt], values: { ...state.values, [key]: { text: proposals[key], origin: "ai-draft" as const, locked: false, sourceId: proposalReceipt.id } } };
    setState(next); setProposalBaseline(editionSnapshot(next));
    setProposals(current => { const result = { ...current }; delete result[key]; return result; });
    setMessage("Suggestion applied to the editable draft. Save does not approve or publish it.");
  }
  async function save(kind: "saveTemplate" | "saveEdition") {
    if (!state) return;
    if (kind === "saveTemplate" && !window.confirm("Save these reusable template definitions? Existing monthly editions and the earlier Calendar template will not change.")) return;
    const snapshot = editionSnapshot(state);
    setBusy(kind === "saveTemplate" ? "Saving reusable template definitions…" : "Saving this monthly draft…"); setError("");
    try {
      const result = await request<{ updatedAt: string }>({ action: kind, ...inputs(state), expectedUpdatedAt: kind === "saveTemplate" ? state.templateVersion : state.editionVersion });
      if (stateRef.current && editionSnapshot(stateRef.current) === snapshot) {
        if (kind === "saveEdition") baseline.current = snapshot;
        else sharedBaseline.current = JSON.stringify(state.template);
        setState(current => current ? { ...current, ...(kind === "saveTemplate" ? { templateVersion: result.updatedAt, sharedTemplate: state.template } : { editionVersion: result.updatedAt }) } : null);
      }
      setMessage(kind === "saveTemplate" ? "Reusable template definitions saved as a draft. Existing editions remain unchanged." : "Monthly draft saved. It is not published.");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(""); }
  }
  function updateDefinition(name: string, definition: WritingDefinition) {
    edit(current => ({ ...current, template: { ...current.template, definitions: { ...current.template.definitions, [name]: definition } } }));
  }
  function addDefinition() {
    if (!state || !validVariableName(newName) || newName.includes(".") || Object.hasOwn(state.template.definitions, newName)
      || Object.hasOwn(monthlyTemplateContext(state.facts, state.selection), newName)) { setError("Choose a new alphanumeric variable name that is not a calculated fact."); return; }
    updateDefinition(newName, newKind === "template" ? { kind: "template", pattern: "" }
      : { kind: "phrase", grammar: "noun-phrase", source: "edition", description: "" });
    setDefinitionName(newName); setNewName("");
  }
  function setSource(definition: PhraseDefinition, field: "source" | "grammar" | "description", value: string) {
    updateDefinition(definitionName, { ...definition, [field]: value } as PhraseDefinition);
  }
  const selectedDefinition = state?.template.definitions[definitionName];
  const activeRequested = requested.filter(key => composition?.phrases.some(use => use.key === key && !state?.values[key]?.locked && state?.sourceSupport[key]?.status !== "needs-source"));
  return <section className="admin-editor-guidance studio-surface" aria-label="Monthly phrase composer">
    <header className="admin-section-heading-row"><div><h3>Monthly writing composer</h3><p>Choose month → Review selected highlights → Generate draft → Edit and approve → Publish.</p></div>
      <StudioButton onClick={() => { if (canClose()) onClose(); }} disabled={!!busy}>Back to existing template</StudioButton></header>
    <p>Write reusable sentence patterns and nested definitions, then draft selected phrases. This workspace saves private drafts only; it does not publish or change your existing Calendar template.</p>
    <fieldset disabled={!!busy}><legend>Selected month</legend><div className="admin-daily-glance-context-form">
      <label><span>Month and year</span><StudioInput type="month" value={month} onChange={event => setMonth(event.target.value)} /></label>
      <label><span>Editorial timezone</span><StudioInput value={timeZone} onChange={event => setTimeZone(event.target.value)} /></label>
      <StudioButton onClick={() => void loadMonth()}>Load selected month</StudioButton>
    </div></fieldset>
    {busy && <p role="status">{busy}</p>}{error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    {state && <>
      <p>{state.facts.month} · {state.facts.timeZone} · {state.facts.calculationSource} · {dirty ? "Unsaved changes" : "Draft unchanged"}</p>
      {state.factsChanged && <p role="alert">The calculated context changed since this draft was saved. Review its phrases against the refreshed facts.</p>}
      <div className="admin-new-actions">
        <StudioButton disabled={!!busy || !!composition?.errors.length || !activeRequested.length} onClick={() => void generate()}>Generate selected phrases ({activeRequested.length})</StudioButton>
        <StudioButton disabled={!!busy || !!composition?.errors.length} onClick={() => void save("saveEdition")}>Save monthly draft</StudioButton>
        <StudioButton disabled={!!busy || !!composition?.errors.length || JSON.stringify(state.template) === sharedBaseline.current} onClick={() => void save("saveTemplate")}>Save reusable template</StudioButton>
      </div>
      <StudioTabs label="Monthly writing views" tabs={tabOptions} value={tab} onValueChange={setTab}>
        <fieldset disabled={!!busy}><legend className="sr-only">Monthly writing controls</legend>
        {tab === "highlights" && <div className="admin-editor-guidance">
          <p>Opening season: <strong>{state.facts.openingSeasonSign}</strong>. Closing season: <strong>{state.facts.closingSeasonSign || "No change"}</strong>. Seasonal focuses are independent of monthly themes.</p>
          <label><span>Number of event-supported monthly themes</span><AdminSelect value={state.selection.themeCount} onChange={event => edit(current => ({ ...current, selection: { ...current.selection, themeCount: Number(event.target.value) as 0 | 1 | 2 } }))}>
            <option value={0}>Season-led; no additional monthly theme</option><option value={1}>One monthly theme</option><option value={2}>Two concurrent monthly themes</option></AdminSelect></label>
          <label><span>Lead planetary event</span><AdminSelect value={state.selection.leadEventId ?? ""} onChange={event => edit(current => ({ ...current, selection: { ...current.selection, leadEventId: event.target.value || null,
            supportingEventIds: current.selection.supportingEventIds.filter(id => id !== event.target.value) } }))}><option value="">No lead event</option>
            {state.suggestions.map(suggestion => { const event = state.facts.events.find(row => row.id === suggestion.eventId)!; return <option value={event.id} key={event.id}>{event.dateKey} · {event.title}</option>; })}</AdminSelect></label>
          <p>Select up to two supporting developments. These are editorial suggestions, not an objective importance score. New Moons, Full Moons and eclipses have separate sections.</p>
          {state.suggestions.map(suggestion => { const event = state.facts.events.find(row => row.id === suggestion.eventId)!; const selected = state.selection.supportingEventIds.includes(event.id);
            return <label className="studio-surface" key={event.id}><span><StudioInput type="checkbox" checked={selected} disabled={event.id === state.selection.leadEventId || !selected && state.selection.supportingEventIds.length >= 2}
              onChange={() => edit(current => ({ ...current, selection: { ...current.selection, supportingEventIds: selected ? current.selection.supportingEventIds.filter(id => id !== event.id) : [...current.selection.supportingEventIds, event.id] } }))} /> {event.dateKey} · {event.title}</span><small>{suggestion.reason}</small></label>; })}
        </div>}
        {tab === "patterns" && <div className="admin-editor-guidance">
          <label><span>Monthly article pattern</span><StudioTextarea rows={8} value={state.template.pattern} onChange={event => edit(current => ({ ...current, template: { ...current.template, pattern: event.target.value } }))} /></label>
          <p>Only registered template definitions expand recursively. Phrase values stay literal. Conditional sections use the calculated or reviewed context; event collections bind their own event values.</p>
          <label><span>Definition to edit</span><AdminSelect value={definitionName} onChange={event => setDefinitionName(event.target.value)}>{Object.entries(state.template.definitions).map(([name, def]) => <option key={name} value={name}>{name} · {def.kind}</option>)}</AdminSelect></label>
          {selectedDefinition?.kind === "template" && <label><span>{`{{${definitionName}}}`} · Template definition</span><StudioTextarea rows={9} value={selectedDefinition.pattern} onChange={event => updateDefinition(definitionName, { ...selectedDefinition, pattern: event.target.value })} /></label>}
          {selectedDefinition?.kind === "phrase" && <>
            <label><span>Source-selection scope</span><AdminSelect value={selectedDefinition.source} onChange={event => setSource(selectedDefinition, "source", event.target.value)}>
              <option value="edition">This monthly edition / selected themes</option><option value="opening-season">Opening Sun season</option><option value="closing-season">Closing Sun season</option><option value="lead-event">Selected lead event</option><option value="event">Current event in a collection</option></AdminSelect></label>
            <label><span>Grammatical form</span><AdminSelect value={selectedDefinition.grammar} onChange={event => setSource(selectedDefinition, "grammar", event.target.value)}>
              <option value="noun-phrase">Noun phrase</option><option value="verb-phrase">Base verb phrase</option><option value="clause">Clause fitting its sentence</option></AdminSelect></label>
            <label><span>Meaning and writing guidance</span><StudioTextarea value={selectedDefinition.description} onChange={event => setSource(selectedDefinition, "description", event.target.value)} /></label>
          </>}
          <div className="admin-daily-glance-context-form"><label><span>New variable name</span><StudioInput value={newName} onChange={event => setNewName(event.target.value)} /></label>
            <label><span>Variable type</span><AdminSelect value={newKind} onChange={event => setNewKind(event.target.value as "phrase" | "template")}><option value="phrase">Phrase</option><option value="template">Nested template</option></AdminSelect></label><StudioButton onClick={addDefinition}>Add definition</StudioButton></div>
          <StudioButton onClick={() => { if (window.confirm("Replace this edition’s patterns with the saved reusable template? Phrase values will be kept by their source bindings.")) edit(current => ({ ...current, template: current.sharedTemplate })); }}>Use saved reusable template</StudioButton>
        </div>}
        {tab === "phrases" && <div className="admin-editor-guidance">
          <p>Select the individual phrases to draft. Locked phrases are never sent as rewrite targets. Changing the highlighted event changes the source binding rather than reusing the previous event’s words.</p>
          <div className="admin-new-actions"><StudioButton onClick={() => setRequested(composition?.phrases.filter(use => !state.values[use.key]?.locked && !state.values[use.key]?.text && state.sourceSupport[use.key]?.status !== "needs-source").map(use => use.key) ?? [])}>Select missing phrases</StudioButton>
            <StudioButton onClick={() => setRequested([])}>Clear selection</StudioButton>
            <StudioButton onClick={() => void checkSources()}>Check phrase sources</StudioButton></div>
          {composition?.phrases.map(use => { const value = state.values[use.key]; const receipt = Object.hasOwn(proposals, use.key) ? proposalReceipt : state.receipts.find(item => item.id === value?.sourceId); return <div className="studio-surface admin-editor-guidance" key={use.key}>
            <label><span><StudioInput type="checkbox" aria-label={`Draft ${use.name} ${use.key}`} checked={requested.includes(use.key)} disabled={value?.locked || state.sourceSupport[use.key]?.status === "needs-source"} onChange={event => setRequested(current => event.target.checked ? [...current, use.key] : current.filter(key => key !== use.key))} />
              <code data-variable-color={calendarVariableColor(use.name)}>{`{{${use.name}}}`}</code> · {use.definition.grammar}</span>
              <StudioTextarea aria-label={`Phrase value ${use.name} ${use.key}`} rows={2} value={value?.text ?? ""} disabled={value?.locked} onChange={event => edit(current => ({ ...current, values: { ...current.values, [use.key]: { text: event.target.value, origin: "owner-edit", locked: false } } }))} /></label>
            <small>{use.definition.description}</small>{state.sourceSupport[use.key]?.status === "needs-source" && <p role="note">Needs astrology source: {state.sourceSupport[use.key].message}</p>}<small>Binding: {use.key} · {value?.origin ?? "Needs writing"}</small>
            <label><StudioInput type="checkbox" aria-label={`Protect ${use.name} ${use.key}`} checked={value?.locked ?? false} onChange={event => edit(current => ({ ...current, values: { ...current.values, [use.key]: { ...current.values[use.key], text: current.values[use.key]?.text ?? "", origin: current.values[use.key]?.origin ?? "owner-edit", locked: event.target.checked } } }))} /> Protect this phrase</label>
            {receipt && <details><summary>Writing evidence for this phrase</summary><p>Generated {receipt.generatedAt} · {receipt.provider} / {receipt.model}</p>
              <p>Memory revision: {receipt.memory.revision ?? "Local source checkout"}. This receipt records support, not publication approval.</p>
              <p>{receipt.phrases.find(item => item.key === use.key)?.knowledgeIds.join(", ")}</p></details>}
            <StudioButton onClick={() => { setDefinitionName(use.name); setTab("patterns"); }}>Edit source rule</StudioButton>
            {Object.hasOwn(proposals, use.key) && <div className="admin-editor-guidance"><p><strong>AI suggestion, not applied</strong></p><p className="admin-calendar-template-text">{proposals[use.key]}</p>
              <StudioButton disabled={value?.locked} onClick={() => applyProposal(use.key)}>Apply suggestion</StudioButton></div>}
          </div>; })}
        </div>}
        {tab === "preview" && <div className="admin-template-reader-surface"><p>Preview of this draft’s nested templates and phrase values. Saving it does not publish reader copy.</p>
          <p className="admin-calendar-template-text" aria-label="Monthly composed writing">{composition?.text}</p></div>}
        {tab === "sources" && !state.memory && <p role="alert">{state.memoryError}</p>}
        {tab === "sources" && state.memory && <div className="admin-editor-guidance"><p>Memory Map checked {state.memory.checkedAt}. Repository revision: {state.memory.revision ?? "Local source checkout"}.</p>
          <p>{state.receipts.length} generation receipts are attached to this edition’s saved phrase values.</p><p>These sources support writing rules and register. Historical owner articles do not supply this month’s dates or events. Generated phrases are never stored as approved memory.</p>
          <p>{state.memory.privateFeedback === "not-enabled" ? "Private Studio corrections are not enabled in this environment." : `${state.memory.excludedPrivateCorrections} private corrections were checked and excluded because their approved Sky-card/article scopes do not authorize use in monthly phrases.`}</p>
          <a href="/admin/content/memory" target="_blank" rel="noreferrer">Open Memory Map</a>
          {state.memory.references.map(ref => <details key={ref.id} className="studio-surface"><summary>{ref.title}</summary><p>{ref.role}</p><p>{ref.path}</p><p>SHA-256: {ref.sha256}</p></details>)}
        </div>}
        </fieldset>
      </StudioTabs>
      {!!composition?.errors.length && <p role="alert">{composition.errors.join(" ")}</p>}
      {!!composition?.missing.length && <p role="status">{composition.missing.length} active phrase variables need writing.</p>}
    </>}
  </section>;
}
