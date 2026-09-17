import StudioVariableInsert from "./StudioVariableInsert";
import { ZODIAC_SEASON_VARIABLES, zodiacSeasonSourceKey } from "../../web/src/content/fallbackArchitectureV3/resolver/zodiacSeasonVariables.mjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { AdminDisclosureSummary } from "./AdminNativeControls";
import { StudioButton, StudioInput, StudioTextarea } from "./StudioControls";
// @ts-ignore Shared planet-in-sign template, also used by publication and readers.
import { SKY_PLACEMENT_PLANET_SIGN_INGRESS_TEMPLATE } from "../../web/src/content/fallbackArchitectureV3/resolver/skyPlacementPlanetSignTemplate.mjs";
import { SKY_WRITING_LIBRARY_GROUPS, type SkyWritingLibraryComposition } from "./skyWritingLibrary";
import SkyPlacementVariableKey, { SkyVariableText, type SkyVariableFacts } from "./SkyPlacementVariableKey";
// @ts-ignore Pure shared article resolver, also used by publication and readers.
import { skyPlacementArticleVariableSegments } from "../../web/src/content/fallbackArchitectureV3/resolver/skyPlacementArticleVariables.mjs";
// @ts-ignore Calculated values have the existing article contract.
import { skyPlacementVariableFacts } from "../../web/src/content/fallbackArchitectureV3/resolver/skyPlacementVariables.mjs";

type RecordValue = Record<string, any>;
type Props = {
  contentKey: string; planet: string; sign: string; motion: string; fieldPath: string;
  value: string; source?: RecordValue; disabled: boolean;
  onInsert: (token: string) => void;
  preparing: boolean;
  preparationError: string;
  onPrepareLibrary: () => void;
  onApplyPlanetSignTemplate?: () => void;
  onCompositionChange: (value: SkyWritingLibraryComposition) => void;
  onReplaceBody?: (value: string) => void;
  onLoadSource?: (key: string) => Promise<RecordValue | undefined>;
  onOpenSource: (key: string, path: string) => void;
};

/** The article stays the authoring surface. Installing its phrase sources is a
 * draft-only operation and never replaces the template with rendered prose. */
export default function SkyPlacementArticleVariables(props: Props) {
  const { contentKey, planet, sign, motion, fieldPath, value, source, disabled } = props;
  const latest = useRef(props); latest.current = props;
  const [error, setError] = useState("");
  const [editingPhrase, setEditingPhrase] = useState("");
  const phraseEditor = useRef<HTMLTextAreaElement>(null);
  const mounted = useRef(true);
  const [references, setReferences] = useState<RecordValue[]>([]);
  const [calculated, setCalculated] = useState<RecordValue | null>(null);
  const [calculating, setCalculating] = useState(false);
  const generation = useRef(0);
  const [date, setDate] = useState(() => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`; });
  const [timeZone, setTimeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current++; }; }, []);
  const record = useMemo(() => ({ ...source, contentKey }), [source, contentKey]);
  const composition = source?.ingress as SkyWritingLibraryComposition | undefined;
  const editingSource = composition?.sources?.[editingPhrase];
  const editingField = SKY_WRITING_LIBRARY_GROUPS.flatMap(group => group.fields).find(field => field.id === editingPhrase);
  const referenceKey = JSON.stringify(Object.values(source?.ingress?.sources ?? {})
    .map((item: any) => item.reference).filter(Boolean));

  useEffect(() => {
    let active = true;
    const keys = [...new Set([...(JSON.parse(referenceKey) as Array<{ contentKey: string }>).map(item => item.contentKey), ...ZODIAC_SEASON_VARIABLES.map((field: { id: string }) => zodiacSeasonSourceKey(field.id, sign))])].filter(key => key !== contentKey);
    if (!keys.length) { setReferences([]); return; }
    void Promise.all(keys.map(key => latest.current.onLoadSource?.(key))).then(rows => {
      if (active) setReferences(rows.filter((row): row is RecordValue => Boolean(row)));
    }).catch(reason => {
      if (active) { setReferences([]); setError(reason instanceof Error ? reason.message : "Linked writing could not be loaded."); }
    });
    return () => { active = false; };
  }, [referenceKey, contentKey, sign]);

  const selectedMotion = fieldPath === "placementArticleDirect" ? "direct" : fieldPath === "placementArticleRetrograde" ? "retrograde" : motion;
  const facts: SkyVariableFacts = skyPlacementVariableFacts(calculated ?? { planet, sign, isRetrograde: selectedMotion === "retrograde" });
  const gaps = skyPlacementArticleVariableSegments(value, facts, record, [record, ...references]).filter((part: any) => part.token && !part.available);

  useEffect(() => {
    if (!editingPhrase || !editingSource || editingSource.reference) return;
    const frame = requestAnimationFrame(() => phraseEditor.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [editingPhrase, Boolean(editingSource)]);

  useEffect(() => {
    generation.current++;
    setCalculated(null);
    setCalculating(false);
  }, [fieldPath]);

  async function calculatePreview() {
    const current = ++generation.current;
    setCalculating(true); setError(""); setCalculated(null);
    try {
      const { calculateSkyIngressPreview } = await import("./skyIngressPreview");
      const result = await calculateSkyIngressPreview(planet, sign, date, timeZone);
      if (!mounted.current || current !== generation.current) return;
      const actualMotion = result.input.isRetrograde ? "retrograde" : "direct";
      if (fieldPath !== "placementArticle" && actualMotion !== selectedMotion) throw new Error(`This occurrence is ${actualMotion}. Choose a ${selectedMotion} date to preview this motion-specific article.`);
      setCalculated(result.input);
    } catch (reason) {
      if (mounted.current && current === generation.current) setError(reason instanceof Error ? reason.message : "Calculated preview is unavailable.");
    } finally {
      if (mounted.current && current === generation.current) setCalculating(false);
    }
  }

  function useIngressTemplate() {
    if (disabled || !props.onReplaceBody) return;
    if (value.trim() && value !== SKY_PLACEMENT_PLANET_SIGN_INGRESS_TEMPLATE
      && !window.confirm("Replace this placement article with the planet-in-sign Sky template? Existing article wording stays in the editor until you confirm.")) return;
    (props.onApplyPlanetSignTemplate ?? props.onPrepareLibrary)();
    props.onReplaceBody(SKY_PLACEMENT_PLANET_SIGN_INGRESS_TEMPLATE);
  }

  return <>
    <p className="admin-field-hint">Use calculated Sky variables and editable phrase variables directly in this article. Phrase text comes from this placement's Writing Library; the tokens stay in your draft. Sky Placement stays current-sky: this template describes a dated visit, not a birth-chart placement.</p>
    {props.onReplaceBody && <div className="admin-new-actions">
      <StudioButton type="button" disabled={disabled} onClick={useIngressTemplate}>Use planet-in-sign Sky template</StudioButton>
    </div>}
    {props.preparing && <p role="status">Preparing the Writing Library in this draft…</p>}
    {(error || props.preparationError) && <p role="alert">{error || props.preparationError}</p>}
    <details className="admin-workspace-details" data-sky-article-variable-picker>
      <AdminDisclosureSummary>Article variables</AdminDisclosureSummary>
      <StudioVariableInsert variables={source?._studioVariables ?? []} context={{ planet, sign }} onInsert={props.onInsert} disabled={disabled} />
      <SkyPlacementVariableKey facts={facts} disabled={disabled} onInsert={props.onInsert} onInsertPhrase={props.onInsert}
        phraseSource={{ planet, sign, record, onLoadSource: props.onLoadSource, onEdit: id => {
          const sharedKey = zodiacSeasonSourceKey(id, sign);
          if (sharedKey && !composition?.sources[id]) { props.onOpenSource(sharedKey, "body"); return; }
          setEditingPhrase(id);
          props.onPrepareLibrary();
        } }} />
    </details>
    {editingPhrase && <section className="admin-sky-writing-context" aria-label="Edit article phrase">
      <p>{editingField?.label ?? editingPhrase} <code>{`{{${editingPhrase}}}`}</code></p>
      {editingField && <p>{editingField.description}</p>}
      {!editingSource ? <p role="status">Preparing this phrase in your draft…</p> : editingSource.reference ? <>
        <p>Linked source: <code>{editingSource.reference.contentKey}#{editingSource.reference.field}</code></p>
        <StudioButton type="button" disabled={disabled} onClick={() => {
          const reference = editingSource.reference!;
          const localName = reference.field.match(/^ingress\.sources\.([A-Za-z][A-Za-z0-9]*)$/u)?.[1];
          if (reference.contentKey === contentKey && localName) setEditingPhrase(localName);
          else props.onOpenSource(reference.contentKey, reference.field);
        }}>Edit linked source</StudioButton>
      </> : <label className="admin-review-copy-editor">
        <span>Phrase value</span>
        <StudioTextarea ref={phraseEditor} aria-label="Phrase value" rows={editingField?.rows ?? 4} disabled={disabled}
          value={editingSource.text ?? ""} onChange={event => {
            if (!disabled && composition) props.onCompositionChange({ ...composition, sources: {
              ...composition.sources, [editingPhrase]: { ...editingSource, text: event.target.value }
            } });
          }} />
      </label>}
      <p className="admin-field-hint">Phrase changes stay in this article draft until you save and publish.</p>
      <StudioButton type="button" onClick={() => setEditingPhrase("")}>Done editing phrase</StudioButton>
    </section>}
    <details className="admin-workspace-details" open>
      <AdminDisclosureSummary>Preview this section</AdminDisclosureSummary>
      <p>Draft preview. Missing phrases must be filled before publishing. Dates and aspects appear only when the calculation supplies them.</p>
      <div className="admin-sky-writing-source-actions">
        <label>Reference date<StudioInput type="date" value={date} onChange={event => { generation.current++; setCalculating(false); setCalculated(null); setDate(event.target.value); }} /></label>
        <label>Time zone<StudioInput value={timeZone} onChange={event => { generation.current++; setCalculating(false); setCalculated(null); setTimeZone(event.target.value); }} /></label>
        <StudioButton type="button" disabled={calculating} onClick={() => void calculatePreview()}>{calculating ? "Calculating…" : "Calculate article preview"}</StudioButton>
      </div>
      {calculated && <p role="status">Calculated context: {calculated.ingressOccurrence.asOfDate} · {calculated.isRetrograde ? "retrograde" : "direct"} · {timeZone}</p>}
      <p className="admin-sky-writing-preview">{value ? <SkyVariableText value={value} facts={facts} source={record} references={[record, ...references]} /> : "No writing saved for this section."}</p>
      {gaps.length > 0 && <p role="status">{[...new Set(gaps.map((part: any) => `${part.token}: ${part.reason}`))].join(" · ")}</p>}
    </details>
  </>;
}
