import { useEffect, useMemo, useState } from 'react';
import { AdminDisclosureSummary } from './AdminNativeControls';
import { StudioButton, StudioInput, StudioTextarea } from './StudioControls';

type GenerationInfo = {
  provider?: string | null;
  model?: string | null;
  generatedAt?: string | null;
  memoryReceipt?: {
    selected?: unknown[];
    studioFeedback?: { selected?: unknown[] } | null;
  } | null;
};

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
  const [generation, setGeneration] = useState<GenerationInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setInstruction('');
    setDraft('');
    setGeneration(null);
    setError('');
  }, [planet, sign, field]);

  const memoryCount = useMemo(() => {
    const selected = generation?.memoryReceipt?.selected?.length ?? 0;
    const liveSelected = generation?.memoryReceipt?.studioFeedback?.selected?.length ?? 0;
    return Math.max(selected, liveSelected);
  }, [generation]);

  const generate = async () => {
    if (busy || disabled) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/sky-article-writing', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          planet,
          sign,
          field,
          referenceDate,
          instruction,
          currentText,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok || typeof payload.draft !== 'string') {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'The article writer did not return a draft.');
      }
      setDraft(payload.draft);
      setGeneration(payload.generation ?? null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Article writing failed. Your current writing was not changed.');
    } finally {
      setBusy(false);
    }
  };

  return <details className="admin-workspace-details">
    <AdminDisclosureSummary>AI writing</AdminDisclosureSummary>
    <p>Create a private suggestion using the calculated Sky facts, the canonical writing system, and the approved correction memory that matches this article. Generation never saves or publishes the suggestion.</p>
    <label className="admin-field-wide">
      <span>Reference date</span>
      <StudioInput type="date" value={referenceDate} disabled={disabled || busy} onChange={event => setReferenceDate(event.target.value)} />
      <small className="admin-field-hint">Choose a date when {planet.replace(/-/gu, ' ')} is in {sign}. This binds the draft to the correct occurrence and year; the writer cannot invent the date.</small>
    </label>
    <label className="admin-review-copy-editor">
      <span>What should the draft do?</span>
      <StudioTextarea value={instruction} disabled={disabled || busy} maxLength={6000}
        placeholder="For example: keep the opening, make the middle more concrete, and write the current-year complication from the calculated aspects."
        onChange={event => setInstruction(event.target.value)} />
    </label>
    <div className="admin-sky-writing-source-actions" role="group" aria-label="AI article writing actions">
      <StudioButton type="button" disabled={disabled || busy || !referenceDate} onClick={generate}>
        {busy ? 'Writing…' : currentText.trim() ? 'Suggest revision' : 'Generate draft'}
      </StudioButton>
      {draft && <StudioButton type="button" disabled={disabled || busy} onClick={() => {
        onUse(draft);
        setDraft('');
      }}>Use this draft</StudioButton>}
      {draft && <StudioButton type="button" disabled={busy} onClick={() => { setDraft(''); setGeneration(null); setError(''); }}>Discard suggestion</StudioButton>}
    </div>
    {error && <p role="alert">{error}</p>}
    {draft && <label className="admin-review-copy-editor">
      <span>AI suggestion</span>
      <StudioTextarea value={draft} readOnly aria-label="AI article suggestion" />
      <small className="admin-field-hint">Review this as a suggestion. Use this draft only copies it into the editor above; the existing Save / publish workflow still controls the source.</small>
    </label>}
    {generation && <p className="admin-field-hint">
      Correction memory: {memoryCount ? `${memoryCount} relevant approved correction${memoryCount === 1 ? '' : 's'} considered.` : 'no matching approved correction was selected.'}
      {generation.provider && generation.model ? ` Writer: ${generation.provider} · ${generation.model}.` : ''}
    </p>}
  </details>;
}
