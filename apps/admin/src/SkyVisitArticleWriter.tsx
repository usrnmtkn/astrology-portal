import { useEffect, useRef, useState } from 'react';
import { AdminDisclosureSummary } from './AdminNativeControls';
import { StudioButton, StudioTextarea } from './StudioControls';
import { SKY_INGRESS_ARTICLE_FORMAT, skyIngressTemplateForFormat } from '../../web/src/content/skyIngressEssay.mjs';
import { compileSkyArticleEdition, skyArticleEditionContentKey } from '../../web/src/content/skyArticleTemplateCompiler';
import { assertPlacementVisit, type PlacementGeneratedArticle, type PlacementVisitFacts } from './skyPlacementWorkspaceModel';
import WritingPlanExport from './WritingPlanExport';

type Props = {
  facts: PlacementVisitFacts; referenceDate: string;
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onBusyChange: (busy: boolean) => void; onDirtyChange: (dirty: boolean) => void;
  onUse: (article: PlacementGeneratedArticle) => void;
};

/** Preparation is free; only the explicit confirmation dispatches the configured writer. */
export default function SkyVisitArticleWriter(props: Props) {
  const [direction, setDirection] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [raw, setRaw] = useState<Record<string, string> | null>(null);
  const [article, setArticle] = useState<PlacementGeneratedArticle | null>(null);
  const mounted = useRef(true);
  const inFlight = useRef<AbortController | null>(null);
  useEffect(() => { props.onBusyChange(busy); }, [busy, props.onBusyChange]);
  useEffect(() => { props.onDirtyChange(Boolean(direction || raw)); }, [direction, raw, props.onDirtyChange]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; inFlight.current?.abort(); }; }, []);

  async function generate() {
    if (busy || raw || inFlight.current) return;
    const controller = new AbortController(); inFlight.current = controller;
    setBusy(true); setError('');
    try {
      const key = skyArticleEditionContentKey({ ...props.facts, format: SKY_INGRESS_ARTICLE_FORMAT });
      const saved = await props.request<{ ok: boolean; rows: unknown[] }>(`/api/admin/generated-content-inventory?${new URLSearchParams({ contentKey: key, status: 'all', visibility: 'all', limit: '2' })}`, { signal: controller.signal });
      if (saved.ok !== true || !Array.isArray(saved.rows)) throw new Error('The existing article could not be checked. No generation was started.');
      if (saved.rows.length) throw new Error('An article is already saved for this visit. Open the saved article before generating; nothing has been overwritten or sent to the writer.');
      if (!mounted.current || controller.signal.aborted) return;
      const payload = await props.request<{ ok: boolean; facts: PlacementVisitFacts; slotValues: Record<string, string>; generation: Record<string, unknown> | null }>(
        '/api/admin/sky-article-template-slots', { method: 'POST', signal: controller.signal, body: JSON.stringify({
          visit: { planet: props.facts.planet, sign: props.facts.sign }, referenceDate: props.referenceDate,
          format: SKY_INGRESS_ARTICLE_FORMAT, voiceNotes: direction, existingSlotValues: {}
        }) });
      if (!mounted.current) return;
      if (payload.ok !== true || !payload.slotValues) throw new Error('The writer did not return a complete draft.');
      setRaw(payload.slotValues);
      assertPlacementVisit(payload.facts, props.facts.planet, props.facts.sign);
      if (payload.facts.transitStartInstant !== props.facts.transitStartInstant || payload.facts.transitEndInstant !== props.facts.transitEndInstant)
        throw new Error('The calculated visit changed. The returned output is retained below; reload the visit before using it.');
      const edition = await compileSkyArticleEdition({ ...payload.facts, format: SKY_INGRESS_ARTICLE_FORMAT,
        templateBody: skyIngressTemplateForFormat(SKY_INGRESS_ARTICLE_FORMAT), templateKey: `sky/article-template/${props.facts.planet}/${props.facts.sign}`,
        tldr: payload.slotValues.what || payload.slotValues.takeaway || '', slotValues: { ...payload.slotValues, ...payload.facts.slotValues },
        housePassages: [], aspectPassages: [] });
      if (mounted.current) setArticle({ edition, generation: payload.generation });
    } catch (reason) {
      if (!mounted.current) return;
      const rejected = (reason as { payload?: { rejectedGeneration?: { slotValues?: Record<string, string> } } })?.payload?.rejectedGeneration?.slotValues;
      if (rejected) setRaw(rejected);
      const failure = reason as { status?: number; details?: unknown } | null;
      setError(failure?.status !== 401 && typeof failure?.details === 'string' && failure.details.trim()
        ? failure.details : reason instanceof Error ? reason.message : 'Generation failed. Your article has not changed.');
    } finally {
      if (inFlight.current === controller) inFlight.current = null;
      if (mounted.current) setBusy(false);
    }
  }

  return <section className="studio-surface studio-section" aria-label="Generate a dated article" aria-busy={busy}>
    <h3>Generate draft for this visit</h3>
    <p>{props.facts.slotValues.when}</p>
    <p>Uses the configured Sky article writer and its current instructions. Generate this draft starts a paid request. The result stays here for review until you choose Use this draft, then Save draft.</p>
    <label className="admin-review-copy-editor"><span>Optional direction</span>
      <StudioTextarea aria-label="Dated article direction" value={direction} disabled={busy || raw !== null} maxLength={6000} rows={3} onChange={event => setDirection(event.target.value)} />
    </label>
    <WritingPlanExport request={props.request} endpoint="/api/admin/sky-article-template-slots" body={{preview:true,visit:{planet:props.facts.planet,sign:props.facts.sign},referenceDate:props.referenceDate,format:SKY_INGRESS_ARTICLE_FORMAT,voiceNotes:direction,existingSlotValues:{}}} disabled={busy}/>
    {!raw && <StudioButton className="admin-primary-button" disabled={busy} onClick={() => void generate()}>{busy ? 'Generating draft…' : 'Generate this draft'}</StudioButton>}
    {error && <p role="alert">{error}</p>}
    {raw && <>
      <label className="admin-review-copy-editor"><span>Generated article · unedited output</span>
        <StudioTextarea aria-label="Generated dated article" formatting={false} readOnly value={raw.articleBody ?? ''} rows={16} />
      </label>
      <details className="admin-workspace-details"><AdminDisclosureSummary>Complete generated fields</AdminDisclosureSummary>
        <StudioTextarea aria-label="Complete generated fields" formatting={false} readOnly value={JSON.stringify(raw, null, 2)} rows={12} />
      </details>
      {article && <StudioButton className="admin-primary-button" disabled={busy} onClick={() => props.onUse(article)}>Use this draft</StudioButton>}
    </>}
  </section>;
}
