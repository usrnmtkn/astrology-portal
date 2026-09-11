import { Fragment, useEffect, useState } from "react";
import { renderTransitNatalPreview, type TransitNatalSelection, type TransitNatalReadingContext } from "./transitNatalSources";
import { subscribeToContentUpdates } from "../../web/src/services/contentUpdateSignal";
import { requestStudioJson } from "./generatedContentClient";

type Preview = ReturnType<typeof renderTransitNatalPreview>;

export function TransitNatalExactSourceAction({ contentKey, secret, disabled, onOpen }: {
  contentKey: string; secret: string; disabled: boolean; onOpen: () => void;
}) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ key: string; exists?: boolean; error?: string }>({ key: "" });
  useEffect(() => subscribeToContentUpdates(() => setRevision(value => value + 1)), []);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setState({ key: contentKey });
    void requestStudioJson(`/api/admin/generated-content?status=all&visibility=all&contentKey=${encodeURIComponent(contentKey)}&limit=1&includePackageSource=true`, secret, { signal: controller.signal })
      .then(payload => {
        if (!Array.isArray(payload.rows) || payload.rows.some(row => !row || row.content_key !== contentKey || typeof row.id !== "string")) throw new Error("The exact passage could not be verified.");
        const packaged = payload.packageSource as Record<string, unknown> | null | undefined;
        if (packaged != null && (packaged.contentKey !== contentKey || ![packaged.body, packaged.body_you, packaged.body_they].some(value => typeof value === "string" && value.trim()))) throw new Error("The packaged exact passage could not be verified.");
        if (!cancelled) setState({ key: contentKey, exists: Boolean(payload.packageSource) || payload.rows.length > 0 });
      })
      .catch(error => { if (!cancelled) setState({ key: contentKey, error: error.message }); });
    return () => { cancelled = true; controller.abort(); };
  }, [contentKey, secret, revision]);
  if (state.key !== contentKey || state.exists === undefined && !state.error) return <p role="status">Checking the exact passage…</p>;
  if (state.error) return <p role="alert">{state.error} <button type="button" onClick={() => setRevision(value => value + 1)}>Retry exact passage lookup</button></p>;
  return <button type="button" disabled={disabled} onClick={onOpen}>{state.exists ? "Edit exact passage" : "Write a new exact passage"}</button>;
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
            {groups.map((group, index) => <Fragment key={index}>
              {group.texts.map((text, paragraphIndex) => <p key={paragraphIndex}>{text}</p>)}
              {group.sources.map(source => <button type="button" key={`${source.contentKey}:${source.field}`}
                onClick={() => onOpenSource(source.contentKey, state.preview!.headline, source.field)}>
                Edit selected source <code>{source.contentKey}</code> · {source.field === "body_they" ? "They" : source.field === "body_you" ? "You" : "Text"}
              </button>)}
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
        <details>
          <summary>Reading preview options</summary>
          <p className="admin-field-hint">These are example inputs. Match the calculated reading when comparing its exact passage.</p>
          <div className="admin-natal-placement-selectors">
            <label><span>Copy variant</span><select aria-label="Transit copy variant" value={context.variant ?? ""} onChange={event => onChange({ variant: event.target.value ? Number(event.target.value) : undefined })}>
              <option value="">Default</option>{[1, 2, 3, 4].map(value => <option key={value} value={value}>{value}</option>)}
            </select></label>
            <label><span>Repeat pass</span><input aria-label="Transit repeat pass" type="number" min="1" max="100" value={context.pass ?? ""} onChange={event => onChange({ pass: event.target.value ? Number(event.target.value) : undefined })} /></label>
            <label><span>Motion</span><select aria-label="Transit preview motion" value={context.isRetrograde === undefined ? "" : String(context.isRetrograde)} onChange={event => onChange({ isRetrograde: event.target.value === "" ? undefined : event.target.value === "true" })}>
              <option value="">Unspecified</option><option value="false">Direct</option><option value="true">Retrograde</option>
            </select></label>
            <label><span>Timing label</span><input aria-label="Transit preview timing" maxLength={160} value={context.window ?? ""} onChange={event => onChange({ window: event.target.value || undefined })} /></label>
          </div>
        </details>
  );
}
