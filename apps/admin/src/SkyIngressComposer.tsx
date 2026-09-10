import { useEffect, useRef, useState } from "react";
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
  onChange?: (value: Composition) => void;
  onOpenSource: (key: string, field: string) => void;
  onLoadSource?: (key: string) => Promise<RecordValue | undefined>;
};
const words = (value: string) => value.replace(/([a-z])([A-Z])/gu, "$1 $2").replace(/^./u, char => char.toUpperCase());
const color = (kind: string) => kind === "fact" ? "fact" : ["planet", "sign"].includes(kind) ? "phrase" : "hook";

export default function SkyIngressComposer({ source, motion, disabled = false, initialField, onChange, onOpenSource, onLoadSource }: Props) {
  const composition = source.ingress as Composition | undefined;
  const identity = String(source.contentKey).split("/").slice(2);
  const [selectedSource, setSelectedSource] = useState("planetFunctionSentence");
  const [selectedModule, setSelectedModule] = useState("practice");
  const [view, setView] = useState("preview");
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
  const generation = useRef(0);
  const writing = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { const id = initialField?.match(/^ingress\.sources\.([A-Za-z][A-Za-z0-9]*)$/u)?.[1]; if (id) setSelectedSource(id); }, [initialField]);
  useEffect(() => { generation.current++; setCalculated(null); setReferences([]); return () => { generation.current++; }; }, [source.contentKey]);
  const referencedKeys = JSON.stringify([...new Set(Object.values(composition?.sources ?? {}).map(value => value.reference?.contentKey).filter(key => key && key !== source.contentKey))]);
  useEffect(() => {
    let active = true;
    const load = loadSourceRef.current;
    if (load) void Promise.all((JSON.parse(referencedKeys) as string[]).map(key => load(key))).then(rows => {
      if (active) setReferences(rows.filter((row): row is RecordValue => Boolean(row)));
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Referenced writing could not load."); });
    return () => { active = false; };
  }, [source.contentKey, referencedKeys]);
  const selected = composition?.sources[selectedSource];
  const module = composition?.modules.find(item => item.id === selectedModule) ?? composition?.modules[0];
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
    <strong>V5 sentence composition</strong>
    <p>Build this evergreen article from named sentence sources. The map will show each source, calculated value, and omitted section. Existing complete articles keep priority.</p>
    {onChange ? <button type="button" disabled={disabled} onClick={() => onChange(makeSkyIngressComposition())}>Add V5 composition</button>
      : <button type="button" onClick={() => onOpenSource(source.contentKey, "ingress")}>Set up V5 composition</button>}
  </div>;

  return <section className="admin-sky-ingress-composer admin-sky-writing-editor" aria-label="V5 sentence composition">
    <div className="admin-sky-writing-context">
      <strong>{words(identity[0])} in {words(identity[1])} · V5 sentence composition</strong>
      <p>This is the assembled evergreen writing path. Complete motion-specific or shared articles still take priority. Sentence sources and their order publish together with this placement.</p>
      {onChange && <label><input type="checkbox" checked={composition.enabled} disabled={disabled} onChange={event => update({ enabled: event.target.checked })} /> Use V5 when the complete article is empty</label>}
      <p role="status">{composition.enabled ? "Enabled in this saved revision" : "Composition is not enabled"} · {result.status === "ready" ? "Preview assembled" : "Some modules need writing or occurrence facts"}</p>
    </div>
    {issues.length > 0 && <div role="alert">{issues.map(issue => <p key={issue}>{issue}</p>)}</div>}
    {error && <p role="alert">{error}</p>}
    {onChange && <>
      <details className="admin-workspace-details" open>
        <summary>Sentence sources</summary>
        <label className="admin-field-wide">Source to edit<select aria-label="Ingress sentence source" value={selectedSource} onChange={event => setSelectedSource(event.target.value)}>
          {Object.entries(composition.sources).map(([id, item]) => <option key={id} value={id}>{words(id)} · {item.kind}</option>)}
        </select></label>
        <code className="admin-sky-section-reference">{`${source.contentKey}#ingress.sources.${selectedSource}`}</code>
        {selected?.reference ? <div><p>Linked exact revision: {selected.reference.contentKey}#{selected.reference.field}</p>
          <button type="button" onClick={() => onOpenSource(selected.reference!.contentKey, selected.reference!.field)}>Edit linked source</button>
          <button type="button" disabled={disabled} onClick={() => updateSource({ kind: selected.kind, text: "" })}>Use local writing</button></div>
          : selected && <label className="admin-review-copy-editor"><span>{words(selectedSource)}</span>
            <textarea ref={writing} className="admin-copy-field-body" aria-label={`Ingress source ${selectedSource}`} disabled={disabled} value={selected.text ?? ""} onChange={event => updateSource({ ...selected, text: event.target.value })} />
          </label>}
        {selected && !selected.reference && ingressTextIssues(selected.text ?? "").map((issue: string) => <p role="alert" key={issue}>{issue}</p>)}
        <details className="admin-workspace-details"><summary>Add a named sentence source</summary>
          <label>Unique name<input aria-label="New ingress source name" value={newSource} disabled={disabled} onChange={event => setNewSource(event.target.value)} placeholder="additionalMeaningSentence" /></label>
          <label>Reuse scope<select aria-label="New ingress source scope" value={newKind} disabled={disabled} onChange={event => setNewKind(event.target.value)}>{["placement", "planet", "sign", "timing", "aspect"].map(kind => <option key={kind}>{kind}</option>)}</select></label>
          <button type="button" disabled={disabled || Object.keys(composition.sources).length >= 80} onClick={() => {
            if (!/^[A-Za-z][A-Za-z0-9]{0,63}$/u.test(newSource) || ["constructor", "prototype"].includes(newSource) || Object.hasOwn(composition.sources, newSource) || [...SKY_PLACEMENT_VARIABLES, ...SKY_INGRESS_VARIABLES].some(item => item.name === newSource)) { setError("Choose a unique sentence name using letters and numbers, starting with a letter."); return; }
            update({ sources: { ...composition.sources, [newSource]: { kind: newKind, text: "" } } }); setSelectedSource(newSource); setNewSource(""); setError("");
          }}>Add sentence source</button>
        </details>
        <details className="admin-workspace-details"><summary>Reuse an exact sentence source</summary>
          <p>Planet sentences can be reused across that planet’s signs; sign sentences across that sign’s planets. Linking pins the exact text hash. Changed or retired sources require review before reuse.</p>
          <label>Source content key<input aria-label="Ingress reference content key" value={referenceKey} disabled={disabled} onChange={event => setReferenceKey(event.target.value)} /></label>
          <label>Exact sentence name<input aria-label="Ingress reference field" value={referenceField} disabled={disabled} onChange={event => setReferenceField(event.target.value)} placeholder="planetFunctionSentence" /></label>
          <button type="button" disabled={disabled || !onLoadSource} onClick={() => void linkSource()}>Link exact source revision</button>
        </details>
      </details>
      <details className="admin-workspace-details" open><summary>Modules and order</summary>
        <ol className="admin-ingress-module-list" aria-label="Ingress module order">
          {composition.modules.map((item, index) => <li key={item.id}><button type="button" aria-pressed={module?.id === item.id} onClick={() => setSelectedModule(item.id)}>{item.label}</button>
            <span>{item.enabled ? item.required ? "Required" : "Optional" : "Disabled"}</span>
            <div role="group" aria-label={`Arrange ${item.label}`}>
              {[-1, 1].map(offset => <button type="button" key={offset} disabled={disabled || index + offset < 0 || index + offset >= composition.modules.length} aria-label={`Move ${item.label} ${offset < 0 ? "up" : "down"}`} onClick={() => { const next = [...composition.modules]; [next[index], next[index + offset]] = [next[index + offset], next[index]]; update({ modules: next }); }}>{offset < 0 ? "↑" : "↓"}</button>)}
            </div></li>)}
        </ol>
        <button type="button" disabled={disabled || composition.modules.length >= 32} onClick={() => { const id = `module-${crypto.randomUUID()}`; update({ modules: [...composition.modules, { id, label: "New section", template: "", enabled: true, required: false, motion: "all", duration: "all", timing: "all" }] }); setSelectedModule(id); }}>Add composition section</button>
        {module && <div className="admin-sky-writing-context">
          <label>Section name<input aria-label="Ingress section name" value={module.label} disabled={disabled} onChange={event => updateModule({ label: event.target.value })} /></label>
          <div className="admin-sky-writing-source-actions">
            <label><input type="checkbox" checked={module.enabled} disabled={disabled} onChange={event => updateModule({ enabled: event.target.checked })} /> Include section</label>
            <label><input type="checkbox" checked={module.required} disabled={disabled} onChange={event => updateModule({ required: event.target.checked })} /> Required writing</label>
          </div>
          <div className="admin-natal-placement-selectors">
            <label>Motion<select aria-label="Ingress module motion" value={module.motion} disabled={disabled} onChange={event => updateModule({ motion: event.target.value })}>{["all", "direct", "retrograde"].map(value => <option key={value}>{value}</option>)}</select></label>
            <label>Duration<select aria-label="Ingress module duration" value={module.duration} disabled={disabled} onChange={event => updateModule({ duration: event.target.value })}>{["all", "short", "long"].map(value => <option key={value}>{value}</option>)}</select></label>
            <label>Pass<select aria-label="Ingress module pass" value={module.timing} disabled={disabled} onChange={event => updateModule({ timing: event.target.value })}>{["all", "single_pass", "first_pass", "return_pass", "final_pass"].map(value => <option key={value} value={value}>{words(value.replaceAll("_", " "))}</option>)}</select></label>
          </div>
          <p>Long means at least 90 days from the first entry to final exit, including gaps. Final pass takes priority over return pass. Sentence order within the template is preserved.</p>
          <label className="admin-review-copy-editor"><span>Section template</span><textarea className="admin-copy-field-body" aria-label="Ingress section template" value={module.template} disabled={disabled} onChange={event => updateModule({ template: event.target.value })} /></label>
          <label>Insert sentence source<select aria-label="Insert ingress source slot" value="" disabled={disabled} onChange={event => { updateModule({ template: module.template + (module.template ? " " : "") + `{{${event.target.value}}}` }); }}><option value="">Choose an exact named sentence</option>{Object.keys(composition.sources).map(id => <option key={id} value={id}>{words(id)} · {identity.join(" in ")}</option>)}</select></label>
          {ingressTextIssues(module.template, Object.keys(composition.sources)).map((issue: string) => <p role="alert" key={issue}>{issue}</p>)}
          <details className="admin-workspace-details"><summary>Aspect selection</summary>
            <label><input type="checkbox" checked={Boolean(module.aspect)} disabled={disabled} onChange={event => updateModule({ aspect: event.target.checked ? { otherPlanet: "sun", type: "conjunction", weight: "defining" } : undefined })} /> Repeat for a calculated aspect</label>
            {module.aspect && <div className="admin-natal-placement-selectors">
              <label>Other planet<select value={module.aspect.otherPlanet} disabled={disabled} onChange={event => updateModule({ aspect: { ...module.aspect!, otherPlanet: event.target.value } })}>{["sun", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "lilith"].map(value => <option key={value}>{value}</option>)}</select></label>
              <label>Aspect<select value={module.aspect.type} disabled={disabled} onChange={event => updateModule({ aspect: { ...module.aspect!, type: event.target.value } })}>{["conjunction", "sextile", "square", "trine", "opposition"].map(value => <option key={value}>{value}</option>)}</select></label>
              <label>Editorial importance<select value={module.aspect.weight} disabled={disabled} onChange={event => updateModule({ aspect: { ...module.aspect!, weight: event.target.value } })}>{["defining", "supporting", "minor"].map(value => <option key={value}>{value}</option>)}</select></label>
            </div>}
            <p>Only defining aspects receive this prose. Exact events are ordered chronologically, then by event ID and section order; at most two receive full modules. Dates come from the calculated occurrence.</p>
          </details>
        </div>}
      </details>
    </>}
    <details className="admin-workspace-details"><summary>Sky variables and sentence key</summary>
      <p>Blue variables are calculated values. Named sentence slots resolve to the full source references below; they are available in section templates. Sentence writing accepts calculated variables only.</p>
      <div className="admin-ingress-key">{[...SKY_PLACEMENT_VARIABLES, ...SKY_INGRESS_VARIABLES].map((variable: { name: string; description: string }) => <div key={variable.name}>
        <button type="button" disabled={!onChange || disabled || Boolean(selected?.reference)} onClick={() => { const node = writing.current; if (!selected || !node) return; const start = node.selectionStart; const token = `{{${variable.name}}}`; updateSource({ ...selected, text: (selected.text ?? "").slice(0, start) + token + (selected.text ?? "").slice(node.selectionEnd) }); requestAnimationFrame(() => { node.focus(); node.setSelectionRange(start + token.length, start + token.length); }); }}><code>{`{{${variable.name}}}`}</code></button>
        <p>{variable.description}</p><span className="variable-fact">{facts[variable.name] ?? "Needs calculated occurrence"}</span>
      </div>)}</div>
    </details>
    <div className="admin-sky-writing-context">
      <strong>Occurrence preview</strong>
      <div className="admin-natal-placement-selectors">
        <label>Reference date<input type="date" aria-label="Ingress preview date" value={date} onChange={event => { generation.current++; setCalculating(false); setCalculated(null); setDate(event.target.value); }} /></label>
        <label>Timezone<input aria-label="Ingress preview timezone" value={timeZone} onChange={event => { generation.current++; setCalculating(false); setCalculated(null); setTimeZone(event.target.value); }} /></label>
      </div>
      <button type="button" disabled={calculating || !date} onClick={() => void calculatePreview()}>{calculating ? "Calculating occurrence…" : "Calculate occurrence preview"}</button>
      <p>This preview includes unsaved writing. If the selected date is outside this sign, the next calculated pass is used. Open the published reader to check the actual live selection for that date; it uses the reader’s location and timezone.</p>
      {calculated && <a href={`/?date=${calculated.ingressOccurrence.asOfDate.slice(0, 10)}#sky/placement/${identity[0]}/${identity[1]}`} target="_blank" rel="noreferrer">Open published reader for this occurrence ↗</a>}
      {calculated && <p>Calculated context: {calculated.ingressOccurrence.asOfDate} · {calculated.isRetrograde ? "retrograde" : "direct"} · {timeZone}</p>}
    </div>
    <>
      <label>Composition view<select aria-label="Ingress composition view" value={view} onChange={event => setView(event.target.value)}><option value="preview">Reader preview</option><option value="template">Main template</option><option value="assembly">Assembly and omissions</option></select></label>
      <div className="admin-composition-variable-legend"><span className="variable-fact">Calculated fact</span><span className="variable-phrase">Reusable sentence</span><span className="variable-hook">Authored section</span></div>
      <div className="admin-template-reader-surface"><div className="admin-composition-preview-chrome"><span>V5 composition</span><span>Draft source preview</span></div><div className="admin-template-reader-copy">
        {result.status === "incomplete" && <p role="status">This composition is incomplete. Readers continue through the existing eligible writing path.</p>}
        {result.trace.filter((part: RecordValue) => view !== "preview" || part.status === "included").map((part: RecordValue) => <div key={`${part.id}/${part.eventId ?? ""}`} className="admin-composition-preview-field">
          <strong>{part.label}</strong>
          {view === "preview" ? <p>{part.template.split(/(\{\{\s*[A-Za-z][A-Za-z0-9]*\s*\}\})/gu).map((fragment: string, index: number) => {
            const name = fragment.match(/\{\{\s*([A-Za-z][A-Za-z0-9]*)\s*\}\}/u)?.[1]; const slot = part.slots.find((item: RecordValue) => item.name === name);
            return slot ? slot.kind === "fact" ? <span key={index} className="admin-composition-variable variable-fact">{slot.text}</span> : <button key={index} type="button" className={`admin-composition-variable variable-${color(slot.kind)}`} onClick={() => { const [key, field] = slot.reference.split("#"); onOpenSource(key, field); }}>{slot.text}</button> : <span key={index}>{fragment}</span>;
          })}</p> : <><p>{part.reason}</p><code className="admin-sky-section-reference">{part.template}</code>
            {part.slots.map((slot: RecordValue) => <div className="admin-composition-source-card" key={slot.name}><strong className={`variable-${color(slot.kind)}`}>{words(slot.name)}</strong><code className="admin-sky-section-reference">{slot.reference}</code><p>{slot.reason || slot.text}</p>{view === "template" && slot.raw && <p className="admin-composition-source-copy">{slot.raw}</p>}</div>)}</>}
        </div>)}
      </div></div>
    </>
  </section>;
}
