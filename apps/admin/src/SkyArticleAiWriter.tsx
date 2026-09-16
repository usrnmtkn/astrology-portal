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
  const isSunSeason = planet.toLowerCase() === 'sun';
  const surfaceName = isSunSeason
    ? `${sign} season article`
    : `${planet.replace(/-/gu, ' ')} in ${sign} current-sky article`;

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

  const openDatedArticleGenerator = () => {
    const templateKey = `sky/article-template/${planet}/${sign}`;
    window.location.hash = `#articles?q=${encodeURIComponent(templateKey)}`;
  };

  return <details className="admin-workspace-details">
    <AdminDisclosureSummary>AI writing</AdminDisclosureSummary>
    <p>This generator revises the evergreen {surfaceName}. {isSunSeason ? `It writes about ${sign} season for all readers, not a natal Sun in ${sign} personality description.` : 'It writes about the current-sky transit, not a natal personality description.'} It does not put a specific year's story into the reusable source.</p>
    <div className="admin-sky-writing-source-actions" role="group" aria-label="Choose AI article destination">
      <StudioButton type="button" disabled={disabled || busy} onClick={openDatedArticleGenerator}>Open dated authored article generator</StudioButton>
      <small className="admin-field-hint">Use the dated article generator for a specific year such as {sign} season {referenceDate.slice(0, 4)}. That workflow saves a separate authored edition for the calculated transit window.</small>
    </div>
    <label className="admin-field-wide">
      <span>Reference date</span>
      <StudioInput type="date" value={referenceDate} disabled={disabled || busy} onChange={event => setReferenceDate(event.target.value)} />
      <small className="admin-field-hint">Choose a date when {planet.replace(/-/gu, ' ')} is in {sign}. The date validates the sky placement; the evergreen draft will not turn that year's dates or aspects into reusable prose.</small>
    </label>
    <label className="admin-review-copy-editor">
      <span>Optional direction for the evergreen draft</span>
      <StudioTextarea
        value={instruction}
        disabled={disabled || busy}
        maxLength={6000}
        rows={4}
        placeholder="Keep the opening, make the middle more concrete, and preserve the evergreen meaning."
        onChange={event => setInstruction(event.target.value)}
      />
      <small className="admin-field-hint">Leave this blank to revise from the current article, calculated sky validation, and approved writing memory.</small>
    </label>
    <div className="admin-sky-writing-source-actions" role="group" aria-label="AI article writing actions">
      <StudioButton className="admin-primary-button" type="button" disabled={disabled || busy || !referenceDate} onClick={generate}>
        {busy ? 'Generating draft…' : currentText.trim() ? 'Generate evergreen revision' : 'Generate evergreen draft'}
      </StudioButton>
      {draft && <StudioButton type="button" disabled={disabled || busy} onClick={() => { onUse(draft); setDraft(''); }}>Use this draft</StudioButton>}
      {draft && <StudioButton type="button" disabled={busy} onClick={() => { setDraft(''); setError(''); }}>Discard</StudioButton>}
    </div>
    {busy && <p role="status">Writing a private suggestion. Your saved article is unchanged.</p>}
    {error && <p role="alert">{error}</p>}
    {draft && <label className="admin-review-copy-editor">
      <span>AI suggestion</span>
      <StudioTextarea value={draft} readOnly aria-label="AI article suggestion" />
      <small className="admin-field-hint">Use this draft only copies the suggestion into the evergreen article editor.</small>
    </label>}
  </details>;
}