import { useEffect, useState } from 'react';
import { AdminDisclosureSummary } from './AdminNativeControls';
import { StudioButton, StudioInput, StudioTextarea } from './StudioControls';

type Props = {
  planet: string;
  sign: string;
  field: string;
  currentText: string;
  disabled: boolean;
  onUse: (text: string) => void;
};

const today = () => new Date().toISOString().slice(0, 10);

export default function SkyArticleAiWriter({ planet, sign, field, currentText, disabled, onUse }: Props) {
  const [referenceDate, setReferenceDate] = useState(today);
  const [instruction, setInstruction] = useState('');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setInstruction('');
    setDraft('');
    setError('');
  }, [planet, sign, field]);

  const generate = async () => {
    if (busy || disabled) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/sky-article-writing', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ planet, sign, field, referenceDate, instruction, currentText }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok || typeof payload.draft !== 'string') {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'No draft was returned.');
      }
      setDraft(payload.draft);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Writing failed. Your article was not changed.');
    } finally {
      setBusy(false);
    }
  };

  return <details className="admin-workspace-details">
    <AdminDisclosureSummary>AI writing</AdminDisclosureSummary>
    <p>Create a private suggestion from calculated Sky facts and approved correction memory. It never saves or publishes automatically.</p>
    <label className="admin-field-wide">
      <span>Reference date</span>
      <StudioInput type="date" value={referenceDate} disabled={disabled || busy} onChange={event => setReferenceDate(event.target.value)} />
      <small className="admin-field-hint">Choose a date when {planet.replace(/-/gu, ' ')} is in {sign}.</small>
    </label>
    <label className="admin-review-copy-editor">
      <span>What should the draft do?</span>
      <StudioTextarea value={instruction} disabled={disabled || busy} maxLength={6000}
        placeholder="Keep the opening, make the middle more concrete, and use this year's calculated facts."
        onChange={event => setInstruction(event.target.value)} />
    </label>
    <div className="admin-sky-writing-source-actions" role="group" aria-label="AI article writing actions">
      <StudioButton type="button" disabled={disabled || busy || !referenceDate} onClick={generate}>
        {busy ? 'Writing…' : currentText.trim() ? 'Suggest revision' : 'Generate draft'}
      </StudioButton>
      {draft && <StudioButton type="button" disabled={disabled || busy} onClick={() => { onUse(draft); setDraft(''); }}>Use this draft</StudioButton>}
      {draft && <StudioButton type="button" disabled={busy} onClick={() => { setDraft(''); setError(''); }}>Discard</StudioButton>}
    </div>
    {error && <p role="alert">{error}</p>}
    {draft && <label className="admin-review-copy-editor">
      <span>AI suggestion</span>
      <StudioTextarea value={draft} readOnly aria-label="AI article suggestion" />
      <small className="admin-field-hint">Use this draft only copies the suggestion into the editor.</small>
    </label>}
  </details>;
}
