import StudioVariableInsert from "./StudioVariableInsert";
import { ZODIAC_SEASON_VARIABLES, zodiacSeasonSourceKey } from "../../web/src/content/fallbackArchitectureV3/resolver/zodiacSeasonVariables.mjs";
import { StudioButton, StudioInput, StudioTextarea } from "./StudioControls";
import { AdminDisclosureSummary, AdminSelect } from "./AdminNativeControls";
import { useEffect, useRef, useState } from "react";
import SkyWritingLibraryEditor from "./SkyWritingLibraryEditor";
import { surfaceSection } from "./studio-ds/recipes";
import { SKY_WRITING_LIBRARY_GROUPS, installSkyWritingLibrary, loadSkyWritingLibrarySeeds, preferSkyWritingLibrary } from "./skyWritingLibrary";
// @ts-ignore Shared deterministic implementation used by the actual reader.
import { SKY_INGRESS_VARIABLES, makeSkyIngressComposition, renderSkyIngressComposition, skyIngressPublicationIssues, ingressTextIssues, skyIngressOccurrence, resolveIngressSource } from "../../web/src/content/fallbackArchitectureV3/resolver/skyIngressComposition.mjs";
// @ts-ignore Exact source revisions are pinned with the same content hash as the reader.
import { sha256Text } from "../../web/src/content/fallbackArchitectureV3/resolver/contentIntegrity.mjs";
// @ts-ignore Existing fact names remain unchanged.
import { SKY_PLACEMENT_VARIABLES } from "../../web/src/content/fallbackArchitectureV3/resolver/skyPlacementVariables.mjs";

type Source = { kind: string; text?: string; reference?: { contentKey: string; field: string; sha256: string } };
type Module = { id: string; label: string; template: string; enabled: boolean; required: boolean; motion: string; duration: string; timing: string; aspect?: { otherPlanet: string; type: string; weight: string } };
type Composition = { version: number; enabled: boolean; sources: Record<string, Source>; modules: Module[] };
type RecordValue = Record<string, any>;
type Props = {
  source: RecordValue; motion: string; disabled?: boolean; initialField?: string;
  hideLibrary?: boolean;
  onChange?: (value: Composition) => void;
  onOpenSource: (key: string, field: string) => void;
  onLoadSource?: (key: string) => Promise<RecordValue | undefined>;
};
const words = (value: string) => value.replace(/([a-z])([A-Z])/gu, "$1 $2").replace(/^./u, char => char.toUpperCase());
const color = (kind: string) => kind === "fact" ? "fact" : ["planet", "sign"].includes(kind) ? "phrase" : "hook";
const libraryFields = SKY_WRITING_LIBRARY_GROUPS.flatMap(group => group.fields.map(field => ({ ...field, group: group.label })));
function sentenceInsertGroups(composition: Composition, identity: string[], includeAspect = false) {
  const known = new Map(libraryFields.map(field => [field.id, field]));
  const groups = new Map<string, Array<{ id: string; label: string }>>();
  for (const id of [...new Set([...Object.keys(composition.sources), ...ZODIAC_SEASON_VARIABLES.map(field => field.id)])]) {
    const field = known.get(id);
    const kind = field?.kind ?? composition.sources[id]?.kind;
    if (kind === "aspect" && !includeAspect) continue;
    const group = field?.group ?? "Other named sources";
    const scope = kind === "aspect" ? "aspect" : kind === "planet" ? identity[0] : kind === "sign" ? identity[1] : kind === "timing" ? "timing" : identity.join(" in ");
    const items = groups.get(group) ?? [];
    items.push({ id, label: `${field?.label ?? words(id)} · ${scope}` });
    groups.set(group, items);
  }
  return [...groups].filter(([, items]) => items.length);
}

export default function SkyIngressComposer({ source, motion, disabled = false, initialField, hideLibrary = false, onChange, onOpenSource, onLoadSource }: Props) {
  const composition = source.ingress as Composition | undefined;
  const identity = String(source.contentKey).split("/").slice(2);
  const initialSourceId = initialField?.match(/^ingress\.sources\.([A-Za-z][A-Za-z0-9_]*)$/u)?.[1];
  const [selectedSource, setSelectedSource] = useState("planetFunctionSentence");
  const [selectedModule, setSelectedModule] = useState("library-opening");
  const [view, setView] = useState("preview");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [referenceKey, setReferenceKey] = useState(String(source.contentKey));
  const [referenceField, setReferenceField] = useState("planetFunctionSentence");
  const [newSource, setNewSource] = useState("");
  const [newKind, setNewKind] = useState("placement");
  const loadSourceRef = useRef(onLoadSource);
  loadSourceRef.current = onLoadSource;
  const [references, setReferences] = useState<RecordValue[]>([]);
  const [error, setError] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [timeZone, setTimeZone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [calculated, setCalculated] = useState<RecordValue | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [installing, setInstalling] = useState(false);
  const generation = useRef(0);
  const writing = useRef<HTMLTextAreaElement>(null);
  const moduleWriting = useRef<HTMLTextAreaElement>(null);
  const customVariables = source._studioVariables ?? [];
  useEffect(() => { if (initialSourceId) setSelectedSource(initialSourceId); }, [initialSourceId]);
  useEffect(() => { generation.current++; setCalculated(null); setReferences([]); return () => { generation.current++; }; }, [source.contentKey]);
  const referencedKeys = JSON.stringify([...new Set([...Object.values(composition?.sources ?? {}).map(value => value.reference?.contentKey).filter(key => key && key !== source.contentKey), ...ZODIAC_SEASON_VARIABLES.map((field: {id: string}) => zodiacSeasonSourceKey(field.id, identity[1]))])]);
  useEffect(() => {
    let active = true;
    const load = loadSourceRef.current;
    if (load) void Promise.all((JSON.parse(referencedKeys) as string[]).map(key => load(key))).then(rows => {
      if (active) setReferences(rows.filter((row): row is RecordValue => Boolean(row)));
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Referenced writing could not load."); });
    return () => { active = false; };
  }, [source.contentKey, referencedKeys]);
  const selected = composition?.sources[selectedSource];
  const module = composition?.modules.find(item => item.id === selectedModule)
    ?? composition?.modules.find(item => item.id === "library-opening")
    ?? composition?.modules[0];
  const update = (patch: Partial<Composition>) => composition && onChange?.({ ...composition, ...patch });
  const updateSource = (value: Source) => composition && update({ sources: { ...composition.sources, [selectedSource]: value } });
  const updateModule = (patch: Partial<Module>) => composition && module && update({ modules: composition.modules.map(item => item.id === module.id ? { ...item, ...patch } : item) });
  const input = calculated ?? { planet: identity[0], sign: identity[1], isRetrograde: motion === "retrograde" };
  let result: RecordValue = { trace: [], status: "absent" };
  let issues: string[] = [];
  try {
    result = renderSkyIngressComposition(source, input, [source, ...references], { preview: true });
    issues = skyIngressPublicationIssues(source, [source, ...references]);
  } catch (reason) { issues = [reason instanceof Error ? reason.message : "Invalid composition."]; }
  const facts = skyIngressOccurrence(input).facts;

  async function addPrefilledComposition() {
    if (!onChange || installing) return;
    setInstalling(true);
    setError("");
    try {
      const starter = makeSkyIngressComposition() as Composition;
      const { values } = await loadSkyWritingLibrarySeeds(source, identity[0], identity[1], onLoadSource);
      onChange(preferSkyWritingLibrary(installSkyWritingLibrary(starter, values)) as Composition);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Placement composition could not be initialized.");
    } finally {
      setInstalling(false);
    }
  }

  async function calculatePreview() {
    const current = ++generation.current;
    setCalculating(true); setError("");
    try {
      const { calculateSkyIngressPreview } = await import("./skyIngressPreview");
      const next = await calculateSkyIngressPreview(identity[0], identity[1], date, timeZone);
      if (current !== generation.current) return;
      setCalculated(next.input);
    } catch (reason) { if (current === generation.current) setError(reason instanceof Error ? reason.message : "Occurrence preview could not load."); }
    finally { if (current === generation.current) setCalculating(false); }
  }

  async function linkSource() {
    setError("");
    try {
      if (!composition || !selected) return;
      const target = referenceKey === source.contentKey ? source : await onLoadSource?.(referenceKey);
      const value = target?.ingress?.sources?.[referenceField];
      if (!value || value.reference || typeof value.text !== "string" || !value.text.trim()) throw new Error("Choose a saved sentence with writing. References cannot point to another reference.");
      if (value.kind !== selected.kind) throw new Error("Choose a source with the same scope: planet, sign, placement, timing, or aspect.");
      const record = target as RecordValue;
      const next = { kind: selected.kind, reference: { contentKey: referenceKey, field: `ingress.sources.${referenceField}`, sha256: sha256Text(value.text) } };
      const checked = resolveIngressSource({ ...source, ingress: { ...composition, sources: { ...composition.sources, [selectedSource]: next } } }, selectedSource, [record]);
      if (checked.reason) throw new Error(checked.reason);
      setReferences(old => [...old.filter(item => item.contentKey !== record.contentKey), record]);
      updateSource(next);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The source could not be linked."); }
  }

  if (!composition) return <div className="admin-sky-writing-context">
    <strong>Placement composition</strong>
    <p>Build this evergreen article from named sentence sources. The prefilled setup reuses this placement’s existing governed TLDR/fallback copy plus approved planet/sign vocabulary. It does not generate new astrology prose or publish anything.</p>
    {initialSourceId && <p role="status">To edit <code>{`{{${initialSourceId}}}`}</code>, add the prefilled placement composition. Its governed content will be loaded into the draft automatically.</p>}
    {error && <p role="alert">{error}</p>}
    {onChange ? <StudioButton type="button" disabled={disabled || installing} onClick={() => void addPrefilledComposition()}>{installing ? "Loading governed sources…" : "Add prefilled placement composition"}</StudioButton>
      : <StudioButton type="button" onClick={() => onOpenSource(source.contentKey, "ingress")}>Set up placement composition</StudioButton>}
  </div>;

  return <section className={`${surfaceSection} admin-sky-ingress-composer admin-sky-writing-editor`} aria-label="Placement composition">
    <div className="admin-sky-writing-context">
      <strong>{words(identity[0])} in {words(identity[1])} · Placement composition</strong>
      <p>This is the assembled evergreen writing path. Complete motion-specific or shared articles still take priority. Sentence sources and their order publish together with this placement. Enabling a draft does not publish it.</p>
      {onChange && <label><StudioInput type="checkbox" checked={composition.enabled} disabled={disabled} onChange={event => update({ enabled: event.target.checked })} /> Use composition when the complete article is empty</label>}
      <p role="status">{composition.enabled ? onChange ? "Enabled in this draft" : "Enabled in this saved source" : "Composition is not enabled"} · {result.status === "ready" ? "Preview assembled" : "Some modules need writing or occurrence facts"}</p>
    </div>
    {issues.length > 0 && <div role="alert">{issues.map(issue => <p key={issue}>{issue}</p>)}</div>}
    {error && <p role="alert">{error}</p>}
    {onChange && <>
      {!hideLibrary && <SkyWritingLibraryEditor
        contentKey={String(source.contentKey)}
        planet={identity[0]}
        sign={identity[1]}
        sourceRecord={source}
        composition={composition}
        disabled={disabled}
        initialSourceId={initialSourceId}
        onChange={onChange}
        onOpenSource={onOpenSource}
        onLoadSource={onLoadSource}
        onAdvancedSource={id => { setSelectedSource(id); setAdvancedOpen(true); }}
      />}
      <details className="admin-workspace-details" open={advancedOpen} onToggle={event => setAdvancedOpen(event.currentTarget.open)}>
        <AdminDisclosureSummary>Advanced source tools</AdminDisclosureSummary>
        <p>Use this area for custom source names and exact cross-placement links. The grouped Writing library above is the normal editing path.</p>
        <label className="admin-field-wide">Source to edit<AdminSelect aria-label="Ingress sentence source" value={selectedSource} onChange={event => setSelectedSource(event.target.value)}>
          {Object.entries(composition.sources).map(([id, item]) => <option key={id} value={id}>{words(id)} · {item.kind}</option>)}
        </AdminSelect></label>
        <code className="admin-sky-section-reference">{`${source.contentKey}#ingress.sources.${selectedSource}`}</code>
        {selected?.reference ? <div><p>Linked exact revision: {selected.reference.contentKey}#{selected.reference.field}</p>
          <StudioButton type="button" onClick={() => onOpenSource(selected.reference!.contentKey, selected.reference!.field)}>Open {selected.reference.contentKey} to change the shared words</StudioButton>
          <StudioButton type="button" disabled={disabled} onClick={() => updateSource({ kind: selected.kind, text: "" })}>Use local writing</StudioButton></div>
          : selected && <label className="admin-review-copy-editor"><span>{words(selectedSource)}</span>
            <StudioTextarea ref={writing} className="admin-copy-field-body" aria-label={`Ingress source ${selectedSource}`} disabled={disabled} value={selected.text ?? ""} onChange={event => updateSource({ ...selected, text: event.target.value })} />
          </label>}
        {selected && !selected.reference && ingressTextIssues(selected.text ?? "").map((issue: string) => <p role="alert" key={issue}>{issue}</p>)}
        <details className="admin-workspace-details"><AdminDisclosureSummary>Add a custom sentence source</AdminDisclosureSummary>
          <label>Unique name<StudioInput aria-label="New ingress source name" value={newSource} disabled={disabled} onChange={event => setNewSource(event.target.value)} placeholder="additionalMeaningSentence" /></label>
          <label>Reuse scope<AdminSelect aria-label="New ingress source scope" value={newKind} disabled={disabled} onChange={event => setNewKind(event.target.value)}>{["placement", "planet", "sign", "timing", "aspect"].map(kind => <option key={kind}>{kind}</option>)}</AdminSelect></label>
          <StudioButton type="button" disabled={disabled || Object.keys(composition.sources).length >= 80} onClick={() => {
            if (!/^[A-Za-z][A-Za-z0-9]{0,63}$/u.test(newSource) || ["constructor", "prototype"].includes(newSource) || Object.hasOwn(composition.sources, newSource) || [...SKY_PLACEMENT_VARIABLES, ...SKY_INGRESS_VARIABLES].some(item => item.name === newSource)) { setError("Choose a unique sentence name using letters and numbers, starting with a letter."); return; }
            update({ sources: { ...composition.sources, [newSource]: { kind: newKind, text: "" } } }); setSelectedSource(newSource); setNewSource(""); setError("");
          }}>Add sentence source</StudioButton>
        </details>
        <details className="admin-workspace-details"><AdminDisclosureSummary>Reuse an exact sentence source</AdminDisclosureSummary>
          <p>Planet sentences can be reused across that planet’s signs; sign sentences across that sign’s planets. Linking pins the exact text hash. Changed or retired sources require review before reuse.</p>
          <label>Source content key<StudioInput aria-label="Ingress reference content key" value={referenceKey} disabled={disabled} onChange={event => setReferenceKey(event.target.value)} /></label>
          <label>Exact sentence name<StudioInput aria-label="Ingress reference field" value={referenceField} disabled={disabled} onChange={event => setReferenceField(event.target.value)} placeholder="planetFunctionSentence" /></label>
          <StudioButton type="button" disabled={disabled || !onLoadSource} onClick={() => void linkSource()}>Link exact source revision</StudioButton>
        </details>
      </details>
      <details className="admin-workspace-details"><AdminDisclosureSummary>Sections and order</AdminDisclosureSummary>
        <ol className="admin-ingress-module-list" aria-label="Ingress module order">
          {composition.modules.map((item, index) => <li key={item.id}><StudioButton type="button" aria-pressed={module?.id === item.id} onClick={() => setSelectedModule(item.id)}>{item.label}</StudioButton>
            <span>{item.enabled ? item.required ? "Required" : "Optional" : "Disabled"}</span>
            <div role="group" aria-label={`Arrange ${item.label}`}>
              {[-1, 1].map(offset => <StudioButton type="button" key={offset} disabled={disabled || index + offset < 0 || index + offset >= composition.modules.length} aria-label={`Move ${item.label} ${offset < 0 ? "up" : "down"}`} onClick={() => { const next = [...composition.modules]; [next[index], next[index + offset]] = [next[index + offset], next[index]]; update({ modules: next }); }}>{offset < 0 ? "↑" : "↓"}</StudioButton>)}
            </div></li>)}
        </ol>
        <StudioButton type="button" disabled={disabled || composition.modules.length >= 32} onClick={() => { const id = `module-${crypto.randomUUID()}`; update({ modules: [...composition.modules, { id, label: "New section", template: "", enabled: true, required: false, motion: "all", duration: "all", timing: "all" }] }); setSelectedModule(id); }}>Add composition section</StudioButton>
        {module && <div className="admin-sky-writing-context">
          <label>Section name<StudioInput aria-label="Ingress section name" value={module.label} disabled={disabled} onChange={event => updateModule({ label: event.target.value })} /></label>
          <div className="admin-sky-writing-source-actions">
            <label><StudioInput type="checkbox" checked={module.enabled} disabled={disabled} onChange={event => updateModule({ enabled: event.target.checked })} /> Include section</label>
            <label><StudioInput type="checkbox" checked={module.required} disabled={disabled} onChange={event => updateModule({ required: event.target.checked })} /> Required writing</label>
          </div>
          <div className="admin-natal-placement-selectors">
            <label>Motion<AdminSelect aria-label="Ingress module motion" value={module.motion} disabled={disabled} onChange={event => updateModule({ motion: event.target.value })}>{["all", "direct", "retrograde"].map(value => <option key={value}>{value}</option>)}</AdminSelect></label>
            <label>Duration<AdminSelect aria-label="Ingress module duration" value={module.duration} disabled={disabled} onChange={event => updateModule({ duration: event.target.value })}>{["all", "short", "long"].map(value => <option key={value}>{value}</option>)}</AdminSelect></label>
            <label>Pass<AdminSelect aria-label="Ingress module pass" value={module.timing} disabled={disabled} onChange={event => updateModule({ timing: event.target.value })}>{["all", "single_pass", "first_pass", "return_pass", "final_pass"].map(value => <option key={value} value={value}>{words(value.replaceAll("_", " "))}</option>)}</AdminSelect></label>
          </div>
          <p>Long means at least 90 days from the first entry to final exit, including gaps. Final pass takes priority over return pass. Sentence order within the template is preserved.</p>
          <label className="admin-review-copy-editor"><span>Section template</span><StudioTextarea ref={moduleWriting} className="admin-copy-field-body" aria-label="Ingress section template" value={module.template} disabled={disabled} onChange={event => updateModule({ template: event.target.value })} /></label>
          <label>Insert sentence source<AdminSelect aria-label="Insert ingress source slot" value="" disabled={disabled} onChange={event => { updateModule({ template: module.template + (module.template ? " " : "") + `{{${event.target.value}}}` }); }}><option value="">Choose a sentence for this section</option>{sentenceInsertGroups(composition, identity, Boolean(module.aspect)).map(([group, items]) => <optgroup key={group} label={group}>{items.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</optgroup>)}</AdminSelect></label>
          <StudioVariableInsert variables={customVariables} context={input} disabled={disabled} loading={Boolean(source._studioVariablesLoading)} error={typeof source._studioVariablesError === "string" ? source._studioVariablesError : ""} onInsert={token => {
            const node = moduleWriting.current;
            const start = node?.selectionStart ?? module.template.length;
            const end = node?.selectionEnd ?? start;
            updateModule({ template: module.template.slice(0, start) + token + module.template.slice(end) });
            requestAnimationFrame(() => { node?.focus(); node?.setSelectionRange(start + token.length, start + token.length); });
          }} />
          {ingressTextIssues(module.template, [...Object.keys(composition.sources), ...ZODIAC_SEASON_VARIABLES.map(field => field.id), ...customVariables.map((item: RecordValue) => item.name)]).map((issue: string) => <p role="alert" key={issue}>{issue}</p>)}
          <details className="admin-workspace-details"><AdminDisclosureSummary>Aspect selection</AdminDisclosureSummary>
            <label><StudioInput type="checkbox" checked={Boolean(module.aspect)} disabled={disabled} onChange={event => updateModule({ aspect: event.target.checked ? { otherPlanet: "sun", type: "conjunction", weight: "defining" } : undefined })} /> Repeat for a calculated aspect</label>
            {module.aspect && <div className="admin-natal-placement-selectors">
              <label>Other planet<AdminSelect value={module.aspect.otherPlanet} disabled={disabled} onChange={event => updateModule({ aspect: { ...module.aspect!, otherPlanet: event.target.value } })}>{["sun", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "lilith"].map(value => <option key={value}>{value}</option>)}</AdminSelect></label>
              <label>Aspect<AdminSelect value={module.aspect.type} disabled={disabled} onChange={event => updateModule({ aspect: { ...module.aspect!, type: event.target.value } })}>{["conjunction", "sextile", "square", "trine", "opposition"].map(value => <option key={value}>{value}</option>)}</AdminSelect></label>
              <label>Editorial importance<AdminSelect value={module.aspect.weight} disabled={disabled} onChange={event => updateModule({ aspect: { ...module.aspect!, weight: event.target.value } })}>{["defining", "supporting", "minor"].map(value => <option key={value}>{value}</option>)}</AdminSelect></label>
            </div>}
            <p>Only defining aspects receive this prose. Exact events are ordered chronologically, then by event ID and section order; at most two receive full modules. Dates come from the calculated occurrence.</p>
          </details>
        </div>}
      </details>
    </>}
    <details className="admin-workspace-details"><AdminDisclosureSummary>Calculated Sky variables</AdminDisclosureSummary>
      <p>Blue variables are calculated, read-only facts. Named Writing library sources are editable above and belong in section templates; they are not inline fact variables.</p>
      <div className="admin-ingress-key">{[...SKY_PLACEMENT_VARIABLES, ...SKY_INGRESS_VARIABLES].map((variable: { name: string; description: string }) => <div key={variable.name}>
        <StudioButton type="button" disabled={!onChange || disabled || Boolean(selected?.reference)} onClick={() => { const node = writing.current; if (!selected || !node) return; const start = node.selectionStart; const token = `{{${variable.name}}}`; updateSource({ ...selected, text: (selected.text ?? "").slice(0, start) + token + (selected.text ?? "").slice(node.selectionEnd) }); requestAnimationFrame(() => { node.focus(); node.setSelectionRange(start + token.length, start + token.length); }); }}><code>{`{{${variable.name}}}`}</code></StudioButton>
        <p>{variable.description}</p><span className="variable-fact">{facts[variable.name] ?? "Needs calculated occurrence"}</span>
      </div>)}</div>
    </details>
    <div className="admin-sky-writing-context">
      <strong>Occurrence preview</strong>
      <div className="admin-natal-placement-selectors">
        <label>Reference date<StudioInput type="date" aria-label="Ingress preview date" value={date} onChange={event => { generation.current++; setCalculating(false); setCalculated(null); setDate(event.target.value); }} /></label>
        <label>Timezone<StudioInput aria-label="Ingress preview timezone" value={timeZone} onChange={event => { generation.current++; setCalculating(false); setCalculated(null); setTimeZone(event.target.value); }} /></label>
      </div>
      <StudioButton type="button" disabled={calculating || !date} onClick={() => void calculatePreview()}>{calculating ? "Calculating occurrence…" : "Calculate occurrence preview"}</StudioButton>
      <p>{onChange ? "This preview includes unsaved writing." : "This preview uses saved sources, which may include drafts."} If the selected date is outside this sign, the next calculated pass is used. Open the published reader to check the actual live selection for that date; it uses the reader’s location and timezone.</p>
      {calculated && <a href={`/?date=${calculated.ingressOccurrence.asOfDate.slice(0, 10)}#sky/placement/${identity[0]}/${identity[1]}`} target="_blank" rel="noreferrer">Open published reader for this occurrence ↗</a>}
      {calculated && <p>Calculated context: {calculated.ingressOccurrence.asOfDate} · {calculated.isRetrograde ? "retrograde" : "direct"} · {timeZone}</p>}
    </div>
    <>
      <label>Composition view<AdminSelect aria-label="Ingress composition view" value={view} onChange={event => setView(event.target.value)}><option value="preview">{onChange ? "Draft preview" : "Saved preview"}</option><option value="template">Main template</option><option value="assembly">Assembly and omissions</option></AdminSelect></label>
      <div className="admin-composition-variable-legend"><span className="variable-fact">Calculated fact</span><span className="variable-phrase">Reusable sentence</span><span className="variable-hook">Authored section</span></div>
      <div className="admin-template-reader-surface"><div className="admin-composition-preview-chrome"><span>Placement composition</span><span>{onChange ? "Draft preview" : "Saved preview"}</span></div><div className="admin-template-reader-copy">
        {result.status === "incomplete" && <p role="status">This composition is incomplete. Readers continue through the existing eligible writing path.</p>}
        {result.trace.filter((part: RecordValue) => view !== "preview" || part.status === "included").map((part: RecordValue) => <div key={`${part.id}/${part.eventId ?? ""}`} className="admin-composition-preview-field">
          <strong>{part.label}</strong>
          {view === "preview" ? <p>{part.template.split(/(\{\{\s*[A-Za-z][A-Za-z0-9_]*\s*\}\})/gu).map((fragment: string, index: number) => {
            const name = fragment.match(/\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/u)?.[1]; const slot = part.slots.find((item: RecordValue) => item.name === name);
            return slot ? ["fact", "custom"].includes(slot.kind) ? <span key={index} className="admin-composition-variable variable-fact">{slot.text}</span> : <StudioButton key={index} type="button" className={`admin-composition-variable variable-${color(slot.kind)}`} onClick={() => { const [key, field] = slot.reference.split("#"); onOpenSource(key, field); }}>{slot.text}</StudioButton> : <span key={index}>{fragment}</span>;
          })}</p> : <><p>{part.reason}</p><code className="admin-sky-section-reference">{part.template}</code>
            {part.slots.map((slot: RecordValue) => <div className="admin-composition-source-card" key={slot.name}><strong className={`variable-${color(slot.kind)}`}>{words(slot.name)}</strong><code className="admin-sky-section-reference">{slot.reference}</code><p>{slot.reason || slot.text}</p>{view === "template" && slot.raw && <p className="admin-composition-source-copy">{slot.raw}</p>}</div>)}</>}
        </div>)}
      </div></div>
    </>
  </section>;
}
