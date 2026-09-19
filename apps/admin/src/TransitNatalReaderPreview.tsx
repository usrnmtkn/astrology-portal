import { AdminSelect, AdminDisclosureSummary } from "./AdminNativeControls";
import { StudioButton, StudioInput } from "./StudioControls";
import { Fragment, lazy, Suspense, useEffect, useState } from "react";
import { renderTransitNatalPreview, transitNatalExactContentKey, type TransitNatalSelection, type TransitNatalReadingContext, type TransitPassageSource } from "./transitNatalSources";
import { subscribeToContentUpdates } from "../../web/src/services/contentUpdateSignal";
import { readStudioContentDocument, requestStudioJson } from "./generatedContentClient";
import { PageLoading } from "../../web/src/components/PageLoading";

import ContentLiveStatusBadge from "./ContentLiveStatus";
import { transitNatalExactActionLabel, transitNatalLiveServingSource, transitSourceEditScope, transitExactPassageState, type TransitExactPassageState } from "./transitNatalEditorScope";

const PersonalTransitAiWriter = lazy(() => import("./PersonalTransitAiWriter"));

type Preview = ReturnType<typeof renderTransitNatalPreview>;

export function TransitNatalExactSourceAction({
  contentKey, title, secret, disabled, onOpen, transiting, natal, aspect, sign = "", transitHouse = "", natalHouse = "", onUseYou, onUseFriend, onOpenNext
}: {
  contentKey: string;
  title: string;
  secret: string;
  disabled: boolean;
  onOpen: () => void;
  transiting: string;
  natal: string;
  aspect: string;
  sign?: string;
  transitHouse?: string;
  natalHouse?: string;
  onUseYou: (text: string) => void;
  onUseFriend: (text: string) => void;
  onOpenNext?: (next: { contentKey: string; transiting: string; natal: string; aspect: string; missingAudiences: Array<"you" | "friend"> }) => void;
}) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ key: string; passage?: TransitExactPassageState; error?: string }>({ key: "" });
  useEffect(() => subscribeToContentUpdates(() => setRevision(value => value + 1)), []);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setState({ key: contentKey });
    void readStudioContentDocument(contentKey, secret, { signal: controller.signal })
      .then(payload => {
        const passage = transitExactPassageState(contentKey, payload);
        if (!cancelled) setState({ key: contentKey, passage });
      })
      .catch(error => { if (!cancelled) setState({ key: contentKey, error: error.message }); });
    return () => { cancelled = true; controller.abort(); };
  }, [contentKey, secret, revision]);
  if (state.key !== contentKey || !state.passage && !state.error) return <PageLoading compact message="Opening this transit…" />;
  if (state.error) return <p role="alert">{state.error} <StudioButton type="button" onClick={() => setRevision(value => value + 1)}>Retry this transit</StudioButton></p>;
  return <section className="admin-natal-source-group" aria-label="This transit write-up">
    <header>
      <div>
        <p className="admin-eyebrow">{contentKey.split("/").length === 8 ? "Six-part situation write-up" : "Three-part aspect write-up"}</p>
        <p><code>{contentKey}</code></p>
        <p>{state.passage?.detail}</p>
      </div>
      {state.passage?.row && <ContentLiveStatusBadge row={state.passage.row} />}
    </header>
    <StudioButton type="button" disabled={disabled} onClick={onOpen}>{transitNatalExactActionLabel(Boolean(state.passage?.exists), title, contentKey)}</StudioButton>
    <p className="admin-field-hint">{contentKey.split("/").length === 8
      ? "This opens the You and Friend fields for this six-part situation: planet, aspect, natal point, current sign, and both houses. Generate copies into those fields. Save keeps a draft on this key. Approve & publish makes it live. The three-part aspect write-up stays separate."
      : "This opens the You and Friend fields for the three-part aspect. Fill current sign and both houses in the finder to switch this destination to the six-part situation. Generate copies into those fields. Approve & publish makes the write-up live."}</p>
    <Suspense fallback={null}><PersonalTransitAiWriter
      defaultOpen
      transiting={transiting}
      natal={natal}
      aspect={aspect}
      sign={sign}
      transitHouse={transitHouse}
      natalHouse={natalHouse}
      contentKey={contentKey}
      youText=""
      friendText=""
      disabled={disabled}
      onUseYou={onUseYou}
      onUseFriend={onUseFriend}
      onOpenNext={onOpenNext}
    /></Suspense>
  </section>;
}

/** Shared sources require an explicit second action; selection is not ownership. */
function TransitSourceEditAction({ source, exactKey, headline, onOpenSource }: {
  source: TransitPassageSource; exactKey: string | null; headline: string;
  onOpenSource: (contentKey: string, label: string, field?: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const scope = transitSourceEditScope(exactKey, source.contentKey);
  const audience = source.field === "body_they" ? "Friend" : source.field === "body_you" ? "You" : "Text";
  if (scope.kind !== "shared") return <div data-transit-source-key={source.contentKey}>
    <p className="admin-field-hint">{scope.label}. {scope.explanation}</p>
    <StudioButton type="button" onClick={() => onOpenSource(source.contentKey, headline, source.field)}>
      {scope.kind === "exact-variant" ? "Edit selected variant" : "Edit selected source"} <code>{source.contentKey}</code> · {audience}
    </StudioButton>
  </div>;
  return <details className="admin-workspace-details" data-transit-source-key={source.contentKey}>
    <AdminDisclosureSummary>Shared source (advanced) · {audience}</AdminDisclosureSummary>
    <p><code>{source.contentKey}</code></p>
    <p>{scope.explanation}</p>
    <p>{exactKey ? "To change only this contact, use Edit or Write for the selected transit above. This shared source can affect other aspects." : "This contact has no independent write-up key. Open a shared source only to make an intentional shared change."}</p>
    {!confirming ? <StudioButton type="button" onClick={() => setConfirming(true)}>Edit shared source</StudioButton> : <div role="alert">
      <p>You are opening shared writing, not a separate passage for this aspect. Any later publication can change other readings that use this source.</p>
      <StudioButton type="button" onClick={() => {
        setConfirming(false);
        onOpenSource(source.contentKey, `Shared transit source: ${source.contentKey}`, source.field);
      }}>Continue to shared source</StudioButton>
      <StudioButton type="button" onClick={() => setConfirming(false)}>Cancel shared edit</StudioButton>
    </div>}
  </details>;
}

export default function TransitNatalReaderPreview({ selection, voice, secret, onOpenSource, onOpenExact, onServingPreview }: {
  selection: TransitNatalSelection;
  voice: string;
  secret: string;
  onOpenSource: (contentKey: string, label: string, field?: string) => void;
  onOpenExact?: () => void;
  onServingPreview?: (source: { contentKey: string; field: string } | null) => void;
}) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ preview: Preview | null; error: string | null; loading: boolean }>({ preview: null, error: null, loading: true });
  useEffect(() => subscribeToContentUpdates(() => setRevision((value) => value + 1)), []);
  const { planet, sign, aspect, natalPoint, pass, variant, isRetrograde, window: timing } = selection;
  const exactKey = transitNatalExactContentKey(selection);
  const identity = JSON.stringify({ planet, sign, aspect, natalPoint, pass, variant, isRetrograde, window: timing, voice });
  const [loadedIdentity, setLoadedIdentity] = useState("");
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setState({ preview: null, error: null, loading: true });
    onServingPreview?.(null);
    void (async () => {
      const result = await requestStudioJson("/api/admin/transit-natal-preview", secret, {
        method: "POST", signal: controller.signal, body: identity
      });
      if (cancelled) return;
      const preview = result.rendered as Preview;
      if (!preview || typeof preview.body !== "string" || !Array.isArray(preview.paragraphs)
        || preview.paragraphs.map(part => part.text).join("\n\n") !== preview.body
        || preview.paragraphs.some(part => !Array.isArray(part.sources) || !part.sources.length
          || part.sources.some(source => typeof source.contentKey !== "string" || typeof source.field !== "string"))) {
        throw new Error("The reading's source links could not be verified. Reload the preview.");
      }
      setLoadedIdentity(identity);
      setState({ preview, error: null, loading: false });
      onServingPreview?.(transitNatalLiveServingSource(preview, voice === "{{Name}}" ? "body_they" : "body_you"));
    })().catch((error) => {
      if (!cancelled) {
        onServingPreview?.(null);
        setState({ preview: null, error: error instanceof Error ? error.message : "Reader preview unavailable.", loading: false });
      }
    });
    return () => { cancelled = true; controller.abort(); };
  }, [identity, secret, revision]);

  const groups: { texts: string[]; sources: Preview["paragraphs"][number]["sources"] }[] = [];
  for (const paragraph of state.preview?.paragraphs ?? []) {
    const previous = groups.at(-1);
    if (previous && JSON.stringify(previous.sources) === JSON.stringify(paragraph.sources)) previous.texts.push(paragraph.text);
    else groups.push({ texts: [paragraph.text], sources: paragraph.sources });
  }

  return (
    <section className="admin-natal-source-group" aria-label="Effective transit to natal reader preview">
      <header>
        <div>
          <p className="admin-eyebrow">Effective reader preview</p>
          <h3>What you see</h3>
          <p>This example uses the reader package and eligible published updates. Drafts are excluded. Use the reading preview options to match a particular transit's motion, repeat pass, variant, and timing.</p>
        </div>
      </header>
      {state.loading || loadedIdentity !== identity && !state.error ? <PageLoading compact message="Loading reader preview…" /> : state.preview && loadedIdentity === identity ? (
        <article className="admin-natal-source-card">
          <div className="admin-natal-source-card-copy">
            <div className="admin-natal-source-card-heading"><h4>{state.preview.headline}</h4></div>
            {groups.some(group => group.sources.some(source => transitSourceEditScope(exactKey, source.contentKey).kind === "shared")) && <aside className="admin-field-hint">
              {exactKey ? (exactKey.split("/").length === 8
                ? "The published preview is still using shared fallback writing. Write this six-part situation to start a separate save. A saved draft does not replace published reader copy."
                : "The published preview is still using shared fallback writing. Edit this copy to start a write-up for this aspect only. A saved draft does not replace published reader copy.") : "This preview includes shared fallback writing. There is no independent write-up key for this contact; shared source changes can affect other readings."}
            </aside>}
            {exactKey && onOpenExact && <StudioButton type="button" onClick={onOpenExact}>{exactKey.split("/").length === 8 ? "Write this six-part situation" : "Edit this copy"}</StudioButton>}
            {groups.map((group, index) => <Fragment key={index}>
              {group.texts.map((text, paragraphIndex) => <p key={paragraphIndex}>{text}</p>)}
              {group.sources.map(source => <TransitSourceEditAction
                key={`${identity}:${revision}:${source.contentKey}:${source.field}`}
                source={source} exactKey={exactKey} headline={state.preview!.headline} onOpenSource={onOpenSource}
              />)}
            </Fragment>)}
          </div>
        </article>
      ) : <p role="alert">{state.error}</p>}
    </section>
  );
}

export function TransitNatalPreviewOptions({ context, onChange }: {
  context: TransitNatalReadingContext;
  onChange: (next: Partial<TransitNatalReadingContext>) => void;
}) {
  return (
        <details className="admin-workspace-details">
          <AdminDisclosureSummary>Reading preview options</AdminDisclosureSummary>
          <p className="admin-field-hint">These are example inputs. Match the calculated reading when comparing its exact passage.</p>
          <div className="admin-natal-placement-selectors admin-filter-form">
            <label><span>Copy variant</span><AdminSelect aria-label="Transit copy variant" value={context.variant ?? ""} onChange={event => onChange({ variant: event.target.value ? Number(event.target.value) : undefined })}>
              <option value="">Default</option>{[1, 2, 3, 4].map(value => <option key={value} value={value}>{value}</option>)}
            </AdminSelect></label>
            <label><span>Repeat pass</span><StudioInput aria-label="Transit repeat pass" type="number" min="1" max="100" value={context.pass ?? ""} onChange={event => onChange({ pass: event.target.value ? Number(event.target.value) : undefined })} /></label>
            <label><span>Motion</span><AdminSelect aria-label="Transit preview motion" value={context.isRetrograde === undefined ? "" : String(context.isRetrograde)} onChange={event => onChange({ isRetrograde: event.target.value === "" ? undefined : event.target.value === "true" })}>
              <option value="">Unspecified</option><option value="false">Direct</option><option value="true">Retrograde</option>
            </AdminSelect></label>
            <label><span>Timing label</span><StudioInput aria-label="Transit preview timing" maxLength={160} value={context.window ?? ""} onChange={event => onChange({ window: event.target.value || undefined })} /></label>
          </div>
        </details>
  );
}
