import { useEffect, useState } from 'react';
import { AdminDisclosureSummary } from './AdminNativeControls';
import { StudioButton, StudioInput, StudioTextarea } from './StudioControls';
import { adminCredentialHeaders, adminSecretStorageKey } from './adminSecret';
import { loadOwnerSessionAccessToken } from './ownerSession';

type Props = {
  planet: string;
  sign: string;
  field: string;
  currentText: string;
  disabled: boolean;
  onUse: (text: string) => void;
};

const today = () => new Date().toISOString().slice(0, 10);

async function contentStudioCredential() {
  const session = await loadOwnerSessionAccessToken();
  if (session) return session;
  try {
    return window.localStorage.getItem(adminSecretStorageKey) ?? '';
  } catch {
    return '';
  }
}

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
      const credential = await contentStudioCredential();
      if (!credential) throw new Error('Content Studio owner access is unavailable. Reload and sign in again before generating.');
      const response = await fetch('/api/admin/sky-article-writing', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...adminCredentialHeaders(credential) },
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
      <span>Optional direction for the draft</span>
      <StudioTextarea
        value={instruction}
        disabled={disabled || busy}
        maxLength={6000}
        rows={4}
        style={{ minHeight: 96 }}
        placeholder="Keep the opening, make the middle more concrete, and use this year's calculated facts."
        onChange={event => setInstruction(event.target.value)}
      />
      <small className="admin-field-hint">Leave this blank to generate from the article context, calculated facts, and approved writing memory.</small>
    </label>
    <div className="admin-sky-writing-source-actions" role="group" aria-label="AI article writing actions">
      <StudioButton className="admin-primary-button" type="button" disabled={disabled || busy || !referenceDate} onClick={generate}>
        {busy ? 'Generating draft…' : currentText.trim() ? 'Generate revision' : 'Generate draft'}
      </StudioButton>
      {draft && <StudioButton type="button" disabled={disabled || busy} onClick={() => { onUse(draft); setDraft(''); }}>Use this draft</StudioButton>}
      {draft && <StudioButton type="button" disabled={busy} onClick={() => { setDraft(''); setError(''); }}>Discard</StudioButton>}
    </div>
    {busy && <p role="status">Writing a private suggestion. Your saved article is unchanged.</p>}
    {error && <p role="alert">{error}</p>}
    {draft && <label className="admin-review-copy-editor">
      <span>AI suggestion</span>
      <StudioTextarea value={draft} readOnly aria-label="AI article suggestion" />
      <small className="admin-field-hint">Use this draft only copies the suggestion into the editor.</small>
    </label>}
  </details>;
}
