import { useEffect, useRef, useState } from 'react';
import { AdminDisclosureSummary, AdminSelect } from './AdminNativeControls';
import { StudioButton, StudioInput, StudioTextarea } from './StudioControls';
import { skyPlacementBodies } from './skyWriteupRelations';
import { generateUnsavedIngress, ingressPreviewModel, PreviewOwnerAccessError, type UnsavedIngressPreview as Preview } from './unsavedIngressPreviewRequest';
import { studioSignInHref } from '../../../src/shared/services/studioAuthReturn';

export default function UnsavedIngressPreview() {
  const [planet, setPlanet] = useState('sun');
  const [referenceDate, setReferenceDate] = useState(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
  const [result, setResult] = useState<Preview | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  async function generate() {
    if (controller.current) return;
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setError(null);
    setResult(null);
    try { setResult(await generateUnsavedIngress(planet, referenceDate, request.signal)); }
    catch (reason) { if (!request.signal.aborted) setError(reason instanceof Error ? reason : new Error('The preview could not be generated.')); }
    finally { if (controller.current === request) { controller.current = null; setBusy(false); } }
  }

  return <section className="studio-section" aria-label="Preview without saving" aria-busy={busy}>
    <p>Generate a dated ingress article using your knowledge base and Calendar for meaning, calculated dates and transits, and your approved ingress voice benchmark.</p>
    <p>This preview uses your owner login and one paid {ingressPreviewModel} request. Nothing is saved or published. Leaving this view or reloading discards the preview.</p>
    <div className="admin-review-filter-grid admin-filter-form admin-filter-form--three">
      <label><span>Planet or point</span><AdminSelect aria-label="Preview planet or point" value={planet} disabled={busy} onChange={event => setPlanet(event.target.value)}>
        {skyPlacementBodies.map(body => <option key={body} value={body}>{body.charAt(0).toUpperCase() + body.slice(1)}</option>)}
      </AdminSelect></label>
      <label><span>Reference date</span><StudioInput aria-label="Preview reference date" type="date" value={referenceDate} disabled={busy} onChange={event => setReferenceDate(event.target.value)} /></label>
    </div>
    <p className="admin-field-hint">Choose a date during the season or planetary placement you want to preview.</p>
    <div className="admin-toolbar-actions">
      <StudioButton className="admin-primary-button" disabled={busy || !referenceDate} onClick={() => void generate()}>{busy ? 'Writing preview…' : 'Preview without saving'}</StudioButton>
      {result && <StudioButton disabled={busy} onClick={() => { setResult(null); setError(null); }}>Discard preview</StudioButton>}
    </div>
    {busy && <p role="status">Writing one preview. Your saved content is unchanged.</p>}
    {error && <p role="alert">{error.message}</p>}
    {error instanceof PreviewOwnerAccessError && <p><a href={studioSignInHref(`${window.location.pathname}${window.location.search}${window.location.hash}`)}>Sign in as owner</a></p>}
    {result && <>
      <p role="status">Preview generated with {result.generation.model}. Not saved or published.</p>
      {result.warning && <p role="alert">{result.warning}</p>}
      {result.missingFields.length > 0 && <p role="alert">The returned draft is incomplete. Missing fields: {result.missingFields.join(', ')}.</p>}
      <label className="admin-review-copy-editor"><span>Full unsaved draft</span>
        <StudioTextarea aria-label="Unsaved ingress draft" formatting={false} readOnly rows={30} value={result.draft} />
      </label>
      <details className="admin-workspace-details"><AdminDisclosureSummary>Generation details</AdminDisclosureSummary>
        <label className="admin-review-copy-editor"><span>Model and source receipt</span>
          <StudioTextarea aria-label="Unsaved ingress generation details" formatting={false} readOnly rows={12} value={JSON.stringify(result.generation, null, 2)} />
        </label>
      </details>
    </>}
  </section>;
}
