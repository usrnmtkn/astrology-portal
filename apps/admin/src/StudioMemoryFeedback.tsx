import { useEffect, useState } from 'react';
import { adminCredentialHeaders } from './adminSecret';

type Feedback = { id: string; content_key: string; before_text: string; after_text: string;
  status: 'pending' | 'active' | 'retired'; scope: 'passage' | 'family' | 'sky'; reason: string;
  version: number; created_at: string };

function Decision({ row, disabled, decide, credential }: { row: Feedback; disabled: boolean; credential: string;
  decide: (row: Feedback, status: 'active' | 'retired', scope: string, reason: string) => void }) {
  const [scope, setScope] = useState(row.scope);
  const [reason, setReason] = useState(row.reason);
  const [history, setHistory] = useState<Array<{ version: number; status: string; scope: string; reason: string; decided_at: string }> | null>(null);
  const [historyError, setHistoryError] = useState('');
  async function loadHistory() {
    try {
      const response = await fetch(`/api/admin/studio-memory-feedback?historyId=${encodeURIComponent(row.id)}`, { headers: adminCredentialHeaders(credential), cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload.ok || !Array.isArray(payload.decisions)) throw new Error(payload.error || 'Could not load memory decisions.');
      setHistory(payload.decisions); setHistoryError('');
    } catch (error) { setHistoryError(error instanceof Error ? error.message : 'Could not load memory decisions.'); }
  }
  return <article className="admin-editor-guidance">
    <p><strong>{row.status === 'active' ? 'Used for future drafts' : row.status === 'retired' ? 'Excluded from future drafts' : 'Pending your decision'}</strong> · {new Date(row.created_at).toLocaleString()}</p>
    <details><summary>Compare original and replacement</summary>
      <p><strong>Original</strong></p><p className="admin-composition-source-copy">{row.before_text}</p>
      <p><strong>Replacement</strong></p><p className="admin-composition-source-copy">{row.after_text}</p>
    </details>
    <label>Apply this correction to
      <select value={scope} onChange={event => setScope(event.target.value as Feedback['scope'])} disabled={disabled}>
        <option value="passage">This passage only</option><option value="family">This Sky writing family</option><option value="sky">All Sky placements and aspects</option>
      </select>
    </label>
    <label>Reason {scope === 'passage' ? '(optional)' : '(required for broader guidance)'}
      <textarea value={reason} maxLength={4000} onChange={event => setReason(event.target.value)} disabled={disabled} />
    </label>
    <button type="button" disabled={disabled || scope !== 'passage' && !reason.trim()} onClick={() => decide(row, 'active', scope, reason)}>
      {row.status === 'active' ? 'Save memory decision' : 'Use for future drafts'}
    </button>
    {row.status !== 'retired' && <button type="button" disabled={disabled} onClick={() => decide(row, 'retired', row.scope, row.reason)}>Exclude from future drafts</button>}
    <details onToggle={event => { if (event.currentTarget.open && !history) void loadHistory(); }}>
      <summary>Memory decision history</summary>
      {historyError && <p role="alert">{historyError}</p>}
      {history?.length === 0 && <p>No memory decisions yet.</p>}
      {history?.map(decision => <p key={decision.version}>Version {decision.version} · {decision.status} · {decision.scope} · {new Date(decision.decided_at).toLocaleString()}<br />{decision.reason || 'No reason recorded.'}</p>)}
      {history?.length === 100 && <p>Showing the latest 100 decisions.</p>}
    </details>
  </article>;
}

export default function StudioMemoryFeedback({ contentKey, credential, revision, unsaved }: {
  contentKey: string; credential: string; revision?: string | null; unsaved: boolean;
}) {
  const [rows, setRows] = useState<Feedback[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [checkedAt, setCheckedAt] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true); setError(''); setRows([]);
    fetch(`/api/admin/studio-memory-feedback?${new URLSearchParams({ contentKey, offset: String(offset) })}`, {
      headers: adminCredentialHeaders(credential), signal: controller.signal, cache: 'no-store',
    }).then(async response => {
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Could not load Studio memory.');
      if (controller.signal.aborted) return;
      setEnabled(payload.enabled); setRows(payload.rows); setHasMore(payload.hasMore); setCheckedAt(payload.fetchedAt ?? '');
    }).catch(error => { if (!controller.signal.aborted) setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [contentKey, credential, revision, offset, refresh]);
  async function decide(row: Feedback, status: 'active' | 'retired', scope: string, reason: string) {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/studio-memory-feedback', { method: 'POST',
        headers: { ...adminCredentialHeaders(credential), 'content-type': 'application/json' },
        body: JSON.stringify({ id: row.id, version: row.version, status, scope, reason }) });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Memory decision was not saved.');
      setRefresh(value => value + 1);
    } catch (error) { setError(error instanceof Error ? error.message : 'Memory decision failed.'); }
    finally { setBusy(false); }
  }
  if (!enabled && !error) return null;
  return <details className="admin-workspace-details" aria-label="Studio memory corrections">
    <summary>Memory corrections ({rows.length}{hasMore ? '+' : ''})</summary>
    <p>Saved edits are pending evidence. Review the replacement passage before using its correction for future drafts. Broader scope requires your explicit choice.</p>
    {checkedAt && <p>Memory checked {new Date(checkedAt).toLocaleTimeString()}</p>}
    {unsaved && <p>Save your passage changes before deciding how its correction should be used.</p>}
    {error && <p role="alert">{error}</p>}
    <button type="button" disabled={busy} onClick={() => setRefresh(value => value + 1)}>Refresh memory</button>
    {!busy && !rows.length && <p>No captured corrections for this passage.</p>}
    {rows.map(row => <Decision key={`${row.id}:${row.version}`} row={row} credential={credential} disabled={busy || unsaved} decide={decide} />)}
    <nav aria-label="Memory correction pages">
      <button type="button" disabled={busy || offset === 0} onClick={() => setOffset(value => value - 50)}>Previous</button>
      <button type="button" disabled={busy || !hasMore} onClick={() => setOffset(value => value + 50)}>Next</button>
    </nav>
  </details>;
}
