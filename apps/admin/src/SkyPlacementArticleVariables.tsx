import { useEffect, useMemo, useRef, useState } from "react";
import { AdminDisclosureSummary } from "./AdminNativeControls";
import { StudioButton, StudioInput } from "./StudioControls";
import SkyPlacementVariableKey, { SkyVariableText, type SkyVariableFacts } from "./SkyPlacementVariableKey";
import { installSkyWritingLibrary, loadSkyWritingLibrarySeeds, skyWritingLibraryInstalled, type SkyWritingLibraryComposition } from "./skyWritingLibrary";
// @ts-ignore Pure shared article resolver, also used by publication and readers.
import { skyPlacementArticlePhraseNames, skyPlacementArticleVariableSegments } from "../../web/src/content/fallbackArchitectureV3/resolver/skyPlacementArticleVariables.mjs";
// @ts-ignore Calculated values have the existing article contract.
import { skyPlacementVariableFacts } from "../../web/src/content/fallbackArchitectureV3/resolver/skyPlacementVariables.mjs";
// @ts-ignore Preparing sources does not enable the separate composition fallback.
import { makeSkyIngressComposition } from "../../web/src/content/fallbackArchitectureV3/resolver/skyIngressComposition.mjs";

type RecordValue = Record<string, any>;
type Props = {
  contentKey: string; planet: string; sign: string; motion: string; fieldPath: string;
  value: string; source?: RecordValue; disabled: boolean;
  onInsert: (token: string) => void;
  onCompositionChange: (composition: SkyWritingLibraryComposition) => void;
  onLoadSource?: (key: string) => Promise<RecordValue | undefined>;
  onOpenSource: (key: string, path: string) => void;
};

/** The article stays the authoring surface. Installing its phrase sources is a
 * draft-only operation and never replaces the template with rendered prose. */
export default function SkyPlacementArticleVariables(props: Props) {
  const { contentKey, planet, sign, motion, fieldPath, value, source, disabled } = props;
  const latest = useRef(props); latest.current = props;
  const [prepared, setPrepared] = useState<SkyWritingLibraryComposition | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");
  const preparingRef = useRef(false);
  const mounted = useRef(true);
  const [references, setReferences] = useState<RecordValue[]>([]);
  const [calculated, setCalculated] = useState<RecordValue | null>(null);
  const [calculating, setCalculating] = useState(false);
  const generation = useRef(0);
  const [date, setDate] = useState(() => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`; });
  const [timeZone, setTimeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current++; }; }, []);
  const composition = skyWritingLibraryInstalled(source?.ingress) ? source?.ingress : prepared ?? source?.ingress;
  const record = useMemo(() => ({ ...source, contentKey, ...(composition ? { ingress: composition } : {}) }), [source, contentKey, composition]);
  const installed = skyWritingLibraryInstalled(composition);
  const phraseNames: string[] = skyPlacementArticlePhraseNames(value);
  const phraseKey = JSON.stringify(phraseNames);
  const referenceKey = JSON.stringify(phraseNames.map(name => composition?.sources?.[name]?.reference).filter(Boolean));

  async function prepareLibrary() {
    if (disabled || installed || preparingRef.current) return;
    preparingRef.current = true; setPreparing(true); setError("");
    const key = contentKey;
    try {
      const current = latest.current;
      const { values } = await loadSkyWritingLibrarySeeds({ ...current.source, contentKey: key }, planet, sign, current.onLoadSource);
      if (!mounted.current || latest.current.contentKey !== key) return;
      // Read the latest draft after loading so edits made during the request survive.
      const base = latest.current.source?.ingress ?? makeSkyIngressComposition();
      const seeded = installSkyWritingLibrary(base, values);
      // Preparing article ingredients must not alter the independent fallback.
      const next = { ...seeded, modules: base.modules };
      setPrepared(next);
      latest.current.onCompositionChange(next);
    } catch (reason) {
      if (mounted.current) setError(reason instanceof Error ? reason.message : "The Writing Library could not be prepared.");
    } finally {
      preparingRef.current = false;
      if (mounted.current) setPreparing(false);
    }
  }

  // Pasting a template is equivalent to inserting its first phrase variable.
  useEffect(() => {
    if (phraseNames.length && !installed && !disabled) void prepareLibrary();
  }, [phraseKey, installed, disabled]);

  useEffect(() => {
    let active = true;
    const keys = [...new Set((JSON.parse(referenceKey) as Array<{ contentKey: string }>).map(item => item.contentKey))].filter(key => key !== contentKey);
    if (!keys.length) { setReferences([]); return; }
    void Promise.all(keys.map(key => latest.current.onLoadSource?.(key))).then(rows => {
      if (active) setReferences(rows.filter((row): row is RecordValue => Boolean(row)));
    }).catch(reason => {
      if (active) { setReferences([]); setError(reason instanceof Error ? reason.message : "Linked writing could not be loaded."); }
    });
    return () => { active = false; };
  }, [referenceKey, contentKey]);

  const selectedMotion = fieldPath === "placementArticleDirect" ? "direct" : fieldPath === "placementArticleRetrograde" ? "retrograde" : motion;
  const facts: SkyVariableFacts = skyPlacementVariableFacts(calculated ?? { planet, sign, isRetrograde: selectedMotion === "retrograde" });
  const gaps = skyPlacementArticleVariableSegments(value, facts, record, [record, ...references]).filter((part: any) => part.token && !part.available);
  const insertPhrase = (token: string) => {
    if (disabled) return;
    props.onInsert(token);
    if (!installed) void prepareLibrary();
  };

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

  return <>
    <p className="admin-field-hint">Use calculated Sky variables and editable phrase variables directly in this article. Phrase text comes from this placement's Writing Library; the tokens stay in your draft.</p>
    {preparing && <p role="status">Preparing the Writing Library in this draft…</p>}
    {error && <p role="alert">{error}</p>}
    <details className="admin-workspace-details" data-sky-article-variable-picker>
      <AdminDisclosureSummary>Article variables</AdminDisclosureSummary>
      <SkyPlacementVariableKey facts={facts} disabled={disabled} onInsert={props.onInsert} onInsertPhrase={insertPhrase}
        phraseSource={{ planet, sign, record, onLoadSource: props.onLoadSource, onEdit: id => props.onOpenSource(contentKey, `ingress.sources.${id}`) }} />
    </details>
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
