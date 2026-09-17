import { AdminSelect, AdminDisclosureSummary } from "./AdminNativeControls";
import { StudioButton, StudioInput } from "./StudioControls";
import { Fragment, useEffect, useState } from "react";
import { renderTransitNatalPreview, transitNatalExactContentKey, type TransitNatalSelection, type TransitNatalReadingContext, type TransitPassageSource } from "./transitNatalSources";
import { subscribeToContentUpdates } from "../../web/src/services/contentUpdateSignal";
import { requestStudioJson } from "./generatedContentClient";

import ContentLiveStatusBadge from "./ContentLiveStatus";
import { transitNatalExactActionLabel, transitSourceEditScope, transitExactPassageState, type TransitExactPassageState } from "./transitNatalEditorScope";

type Preview = ReturnType<typeof renderTransitNatalPreview>;

export function TransitNatalExactSourceAction({ contentKey, title, secret, disabled, onOpen }: {
  contentKey: string; title: string; secret: string; disabled: boolean; onOpen: () => void;
}) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ key: string; passage?: TransitExactPassageState; error?: string }>({ key: "" });
  useEffect(() => subscribeToContentUpdates(() => setRevision(value => value + 1)), []);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setState({ key: contentKey });
    void requestStudioJson(`/api/admin/generated-content?status=all&visibility=all&contentKey=${encodeURIComponent(contentKey)}&limit=1&includePackageSource=true`, secret, { signal: controller.signal })
      .then(payload => {
        const passage = transitExactPassageState(contentKey, payload);
        if (!cancelled) setState({ key: contentKey, passage });
      })
      .catch(error => { if (!cancelled) setState({ key: contentKey, error: error.message }); });
    return () => { cancelled = true; controller.abort(); };
  }, [contentKey, secret, revision]);
  if (state.key !== contentKey || !state.passage && !state.error) return <p role="status">Opening this transit…</p>;
  if (state.error) return <p role="alert">{state.error} <StudioButton type="button" onClick={() => setRevision(value => value + 1)}>Retry this transit</StudioButton></p>;
  return <section className="admin-natal-source-group" aria-label="This transit write-up">
    <header>
      <p className="admin-eyebrow">This transit</p>
      <p><code>{contentKey}</code></p>
      <p>{state.passage?.detail}</p>
      {state.passage?.row && <ContentLiveStatusBadge row={state.passage.row} />}
    </header>
    <StudioButton type="button" disabled={disabled} onClick={onOpen}>{transitNatalExactActionLabel(Boolean(state.passage?.exists), title)}</StudioButton>
    <p className="admin-field-hint">This opens the You and Friend fields for the selected contact. Saving does not change other aspects or publish the write-up.</p>
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

export default function TransitNatalReaderPreview({ selection, voice, secret, onOpenSource }: {
  selection: TransitNatalSelection;
  voice: string;
  secret: string;
  onOpenSource: (contentKey: string, label: string, field?: string) => void;
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
    })().catch((error) => {
      if (!cancelled) setState({ preview: null, error: error instanceof Error ? error.message : "Reader preview unavailable.", loading: false });
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
        <p className="admin-eyebrow">Effective reader preview</p>
        <h3>What you see</h3>
        <p>This example uses the reader package and eligible published updates. Drafts are excluded. Use the reading preview options to match a particular transit's motion, repeat pass, variant, and timing.</p>
      </header>
      {state.loading || loadedIdentity !== identity && !state.error ? <p role="status">Loading reader preview…</p> : state.preview && loadedIdentity === identity ? (
        <article className="admin-natal-source-card">
          <div className="admin-natal-source-card-copy">
            <div className="admin-natal-source-card-heading"><h4>{state.preview.headline}</h4></div>
            {groups.some(group => group.sources.some(source => transitSourceEditScope(exactKey, source.contentKey).kind === "shared")) && <aside className="admin-field-hint">
              {exactKey ? "The published preview is still using shared fallback writing. The editor for this transit is the selected contact only. A saved draft does not replace published reader copy." : "This preview includes shared fallback writing. There is no independent write-up key for this contact; shared source changes can affect other readings."}
            </aside>}
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
          <div className="admin-natal-placement-selectors">
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
