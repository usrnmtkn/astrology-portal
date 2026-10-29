import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { skyArticleVariableDraftRecord } from "../../../src/shared/skyArticleVariableDraft";
import { skyArticleEditableFields, skyArticleEditionRecord } from '../../web/src/content/skyArticleTemplateCompiler';
// Source status always needs the reader preview; load them in one deferred chunk.
import SkyReaderPreview, { type SkyPreviewDraft, type SkyReaderState } from './SkyReaderPreview';
import { PageLoading } from "../../../src/shared/components/PageLoading";
import ContentLiveStatusBadge, { type LiveStatus } from "./ContentLiveStatus";
import { placementSourceRows, selectPlacementSources, type PlacementSourceRow } from "./skyPlacementSourceSelection";
import { AdminDisclosureSummary } from "./AdminNativeControls";
import { StudioButton, StudioInput } from "./StudioControls";
import { getInitialLocation } from '../../web/src/services/skySelection';
import { isSkyReaderPreviewDate, skyPreviewReferenceDate, skyReaderDateHref } from '../../../src/shared/skyReaderPreview';
import { Stack, Text } from "./studio-ds/primitives";
import { surfaceSection } from "./studio-ds/recipes";
export { default as ReaderPassageEntry } from './ReaderPassageEntry';

type Props = {
  planet: string;
  sign: string;
  date: string | null;
  timeZone?: string;
  onDateChange: (date: string) => void;
  rows: PlacementSourceRow[];
  inventoryState: "loading" | "ready" | "error";
  loadRow: (row: PlacementSourceRow, signal: AbortSignal) => Promise<PlacementSourceRow>;
  loadStatus: (row: PlacementSourceRow) => Promise<LiveStatus>;
  onOpen: (row: PlacementSourceRow) => void;
  onReload: () => void;
  editorDraft?: SkyPreviewDraft;
  editorContent?: ReactNode;
};

export default function SkyPlacementSources(props: Props) {
  const { planet, sign, rows, inventoryState, loadStatus } = props;
  const embedded = Boolean(props.editorContent);
  const latest = useRef(props);
  latest.current = props;
  const [attempt, setAttempt] = useState(0);
  const [initialDate] = useState(() => skyPreviewReferenceDate(new Date().toISOString(), getInitialLocation().location.timeZone || 'UTC'));
  const date = props.date ?? initialDate;
  const validDate = isSkyReaderPreviewDate(date);
  const readerIdentity = JSON.stringify([planet, sign, date, props.timeZone]);
  const [readerState, setReaderState] = useState<SkyReaderState & { identity: string } | null>(null);
  const reader = readerState?.identity === readerIdentity ? readerState : null;
  const reading = reader?.result;
  const readerSign = reading?.placement.signKey ?? sign;
  const [result, setResult] = useState<{ identity: string; rows: PlacementSourceRow[]; liveIds: Set<string> } | null>(null);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const previewPanel = useRef<HTMLDivElement>(null);
  const previewButton = useRef<HTMLButtonElement>(null);
  const sourcePanel = useRef<HTMLElement>(null);
  useEffect(() => {
    const panel = sourcePanel.current;
    if (!panel) return;
    let pointer: number | null = null;
    let timer: number | undefined;
    let previous: string | null = null;
    const controller = new AbortController();
    const options = { capture: true, signal: controller.signal };
    const release = () => {
      window.clearTimeout(timer);
      if (previous !== null) panel.style.cssText = previous;
      previous = null; pointer = null;
    };
    const hold = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0 || pointer !== null || !(event.target instanceof Node)
        || panel.contains(event.target) || !panel.parentElement?.contains(event.target)) return;
      const bounds = panel.getBoundingClientRect();
      if (!bounds.height || event.clientY < bounds.bottom) return;
      // A reader result can expand this panel between mouse-down and mouse-up,
      // moving an editor button away before its native click is dispatched.
      pointer = event.pointerId;
      previous = panel.style.cssText;
      panel.style.cssText += `;height:${bounds.height}px;overflow:hidden;box-sizing:border-box`;
    };
    const finish = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return;
      // Touch compatibility clicks can arrive in a later task. The click
      // listener releases immediately; this bounds gestures with no click.
      if (event.type === 'pointerup') timer = window.setTimeout(release, 500);
      else release();
    };
    window.addEventListener('pointerdown', hold, options);
    window.addEventListener('pointerup', finish, options);
    window.addEventListener('pointercancel', finish, options);
    window.addEventListener('click', release, options);
    // Element focus changes must not release an active pointer gesture.
    window.addEventListener('blur', release, { signal: controller.signal });
    return () => {
      release();
      controller.abort();
    };
  }, []);
  useEffect(() => {
    if (showPreview && !embedded) previewPanel.current?.querySelector<HTMLButtonElement>('button[aria-pressed]')?.focus();
  }, [showPreview, embedded]);
  const candidates = [...new Map([...placementSourceRows(rows, planet, sign), ...placementSourceRows(rows, planet, readerSign)].map(row => [row.id, row])).values()];
  const identity = JSON.stringify([planet, sign, readerSign, candidates.map(row => [row.id, row.updated_at])]);
  useEffect(() => { if (props.date === null) props.onDateChange(initialDate); }, [props.date, props.onDateChange, initialDate]);
  useEffect(() => {
    setError("");
    setResult(null);
    if (inventoryState !== "ready") return;
    const controller = new AbortController();
    const current = latest.current;
    void (async () => {
      const selected = [...new Map([...placementSourceRows(current.rows, planet, sign), ...placementSourceRows(current.rows, planet, readerSign)].map(row => [row.id, row])).values()];
      const documents = await Promise.all(selected
        .map(row => current.loadRow(row, controller.signal)));
      const statuses = await Promise.all(documents.filter(row => row.status === "LIVE" || !row.content_key.startsWith("sky-article"))
        .map(row => loadStatus(row)));
      if (!controller.signal.aborted) setResult({ identity, rows: documents,
        liveIds: new Set(statuses.filter(status => status.live).map(status => status.id)) });
    })().catch(reason => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Reader sources could not be loaded.");
    });
    return () => controller.abort();
  }, [identity, inventoryState, loadStatus, attempt, planet, sign, readerSign]);
  const current = result?.identity === identity ? result : null;
  const instant = reading?.instant ?? `${date}T12:00:00Z`;
  const sources = useMemo(() => current && validDate
    ? { editing: selectPlacementSources(current.rows, planet, sign, instant, current.liveIds),
      reader: selectPlacementSources(current.rows, planet, readerSign, instant, current.liveIds) } : null,
  [current, planet, sign, readerSign, instant, validDate]);
  const previewDrafts: SkyPreviewDraft[] = useMemo(() => props.editorDraft ? [props.editorDraft] : (sources?.editing.pending ?? []).flatMap(row => {
    const sections = row.sections as { skyArticleEdition?: unknown; skyArticleRevisionBase?: unknown; skyArticleVariableDraft?: unknown; skyArticleVariableBase?: unknown } | null;
    const edition = skyArticleEditionRecord(sections?.skyArticleEdition);
    const base = skyArticleEditionRecord(sections?.skyArticleRevisionBase) ?? edition;
    const variables = skyArticleVariableDraftRecord(sections?.skyArticleVariableDraft);
    return edition && base ? [{ id: row.id, sourceKey: row.content_key, label: `${row.headline || row.content_key} · ${row.updated_at ?? row.id}`,
      base, fields: { ...skyArticleEditableFields(edition), ...variables?.templates }, variables, baseVariables: skyArticleVariableDraftRecord(sections?.skyArticleVariableBase), saveState: 'saved', baseVersion: typeof row.source_snapshot?.targetRowUpdatedAt === 'string' ? row.source_snapshot.targetRowUpdatedAt : undefined }] : [];
  }), [props.editorDraft, sources?.editing.pending]);
  const name = (value: string) => value.split('-').map(word => word[0]?.toUpperCase() + word.slice(1)).join(' ');
  const editingPlacement = `${name(planet)} in ${name(sign)}`;
  const readerHref = reading && validDate ? skyReaderDateHref(window.location.origin, planet, reading.placement.signKey, date) : '';
  const exportHref = reading && validDate ? skyReaderDateHref(window.location.origin, planet, reading.placement.signKey, date, true) : '';
  const source = (row: PlacementSourceRow, label: string) => <div key={row.id}>
    <Text>{row.headline || row.content_key}</Text>
    <div className="admin-surface-actions">
      <ContentLiveStatusBadge row={row} />
      <StudioButton type="button" onClick={() => latest.current.onOpen(row)}>{label}</StudioButton>
    </div>
  </div>;
  const readingSummary = <>
    <Text><strong>Editing:</strong> {props.editorDraft ? `${props.editorDraft.base.headline} · ${editingPlacement}` : editingPlacement}</Text>
    {reading && <>
      <Text><strong>Readers see:</strong> {reading.published.title} · {reading.placement.planet} in {reading.placement.sign} · {date} · {reading.timeZone}</Text>
      <Text size="meta" tone="secondary">{reading.published.status} · {reading.published.role}</Text>
    </>}
    <Text tone="secondary">Read in Sky and reader CSV use this date and the published reading. Draft simulations and personalized chart sections are separate.</Text>
  </>;
  const inventory = inventoryState === "error" ? <div role="alert"><p>The source inventory is incomplete. Refresh before checking reader sources.</p><StudioButton onClick={props.onReload}>Refresh sources</StudioButton></div>
      : error ? <div role="status"><p>Reader sources could not be verified: {error}</p><StudioButton onClick={() => setAttempt(value => value + 1)}>Retry sources</StudioButton></div>
      : !validDate ? <p role="alert">Choose a valid reader date.</p>
      : reader?.error ? <div role="alert"><p>Reader sources could not be verified: {reader.error}</p><StudioButton onClick={() => setAttempt(value => value + 1)}>Retry sources</StudioButton></div>
      : inventoryState === "loading" || !sources || !reading ? <PageLoading compact message="Checking reader sources…" />
      : <Stack gap="md">
        <div aria-label="Active dated article">
          <strong>Active dated article</strong>
          {reading.published.role === 'Dated article' ? <>
            {sources.reader.active && reading.published.keys.includes(sources.reader.active.content_key) ? source(sources.reader.active, "Edit active article") : <Text>{reading.published.title} · {reading.published.status}</Text>}
            <Text size="meta" tone="secondary">Article window: {reading.published.validFrom} to {reading.published.validTo}</Text>
          </> : <Text>No published dated article is active on {date}.</Text>}
        </div>
        <div aria-label="Pending revision">
          <strong>Pending revision</strong>
          <Text size="meta" tone="secondary">Revisions for {editingPlacement}.</Text>
          {sources.editing.pending.length ? sources.editing.pending.map(row => source(row, "Open pending revision"))
            : <Text>No saved article revision is pending.</Text>}
          <Text size="meta" tone="secondary">Draft revisions stay separate until you publish them.</Text>
        </div>
        <div aria-label="Shared fallback">
          <strong>Shared fallback</strong>
          {reading.published.role === 'Shared fallback' && <Text>Selected for {date}: {reading.published.title} · {reading.published.status}</Text>}
          {sources.reader.fallback.length ? sources.reader.fallback.map(row => source(row, "Edit shared fallback"))
            : <Text>No saved shared fallback is listed for this placement.</Text>}
          <Text size="meta" tone="secondary">Reusable placement writing is selected when an eligible dated article is unavailable.</Text>
        </div>
      </Stack>;
  const preview = inventoryState === 'ready' && <div ref={previewPanel} hidden={!showPreview && !props.editorContent}>
    <SkyReaderPreview key={`${planet}/${sign}/${attempt}`} planet={planet} sign={sign} date={date} timeZone={props.timeZone} drafts={previewDrafts} compact={Boolean(props.editorContent)}
      onClose={props.editorContent ? undefined : () => { setShowPreview(false); previewButton.current?.focus(); }}
      onReaderState={state => setReaderState({ ...state, identity: readerIdentity })} />
  </div>;
  return <><section ref={sourcePanel} className={surfaceSection} aria-label="Sky placement reader sources">
    <div className="admin-fallback-diagnostic-heading">
      <h3>Reader sources</h3>
      <div className="admin-surface-actions">
        {readerHref && <>
          <a className="admin-create-button" href={exportHref} target="_blank" rel="noopener noreferrer">Export what readers see</a>
          <a className="admin-create-button admin-secondary-button" href={readerHref} target="_blank" rel="noopener noreferrer">Read in Sky</a>
        </>}
        <StudioButton ref={previewButton} type="button" disabled={!sources} onClick={() => {
          if (props.editorContent) { previewPanel.current?.scrollIntoView({ block: 'start' }); previewPanel.current?.querySelector<HTMLButtonElement>('button[aria-pressed]')?.focus({ preventScroll: true }); }
          else setShowPreview(value => !value);
        }} aria-expanded={Boolean(props.editorContent) || showPreview}>Preview reader</StudioButton>
      </div>
    </div>
    <div className="admin-filter-form"><label><span>Reader date</span><StudioInput type="date" aria-label="Sky reader date" value={date} onChange={event => props.onDateChange(event.target.value)} /></label></div>
    {embedded ? <details className="studio-contained-disclosure"><AdminDisclosureSummary>Publication sources</AdminDisclosureSummary>{readingSummary}{inventory}</details> : <>{readingSummary}{inventory}</>}
    {embedded && (inventoryState !== 'ready' || error || reader?.error || !sources || !reading) && inventory}
    {!props.editorContent && preview}
  </section>
  {props.editorContent && <div className="studio-grid studio-dated-workspace" aria-label="Dated Sky article workspace">
    <Stack className="studio-dated-passage studio-workspace-pane" gap="md">{props.editorContent}</Stack>
    <div className="studio-dated-reader studio-workspace-pane">{preview}</div>
  </div>}</>;
}
