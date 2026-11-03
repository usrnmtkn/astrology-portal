import { announceContentUpdate } from '../../web/src/services/contentUpdateSignal';
import { useEffect, useState } from 'react';
import { StudioButton, StudioInput } from './StudioControls';

import { skyPublicationRecord as publication, skyPublicationState, skyPublicationScheduled, type SkyPublicationRow as PublicationRow } from './skyArticlePublicationState';
type Request = <T>(path: string, options?: RequestInit) => Promise<T>;
const localValue = (value: string | null | undefined) => {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
};
export default function SkyArticlePublication<T extends PublicationRow>({ row, request, disabled, onSaved, onBusyChange }: {
  row: T; request: Request; disabled: boolean; onSaved: (row: T) => void; onBusyChange?: (busy: boolean) => void;
}) {
  const savedAt = publication(row).publishAt ?? (row.status === 'LIVE' ? row.published_at : null) ?? null;
  const [value, setValue] = useState(localValue(savedAt));
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  useEffect(() => { setValue(localValue(savedAt)); setMessage(''); setError(''); }, [row.id, row.updated_at, savedAt]);
  const scheduled = skyPublicationScheduled(row), future = Boolean(value && new Date(value).getTime() > Date.now());
  async function submit(action: 'save' | 'publish' | 'cancel') {
    setBusy(true); onBusyChange?.(true); setError(''); setMessage('');
    try {
      if (!row.updated_at) throw new Error('Reload the saved article before setting publication timing.');
      const date = value ? new Date(value) : null;
      if (value && (!date || !Number.isFinite(date.getTime()) || localValue(date.toISOString()) !== value)) throw new Error('Choose a valid local date and time.');
      let current = row;
      const patch = async (body: Record<string, unknown>) => {
        const result = await request<{ ok: boolean; rows: T[] }>('/api/admin/generated-content', {
          method: 'PATCH', body: JSON.stringify({ id: current.id, expectedUpdatedAt: current.updated_at, ...body })
        });
        if (!result.ok || !result.rows?.[0]) throw new Error('Publication changes could not be confirmed. Reload the saved article before retrying.');
        current = result.rows[0]; onSaved(current);
        if (current.status === 'LIVE') announceContentUpdate({ contentKey: current.content_key, published: true, updatedAt: current.updated_at ?? new Date().toISOString() });
      };
      if (action === 'cancel') await patch({ ownerAction: 'cancel-sky-article-publication' });
      else {
        if (localValue(savedAt) !== value) await patch({ ownerAction: 'set-sky-article-publication-date', skyPublicationAt: date?.toISOString() ?? null });
        if (action === 'publish') await patch({ ownerAction: current.event_type === 'sky-article-edition-revision' ? 'publish-sky-article-edition-revision' : 'approve-sky-article-edition' });
      }
      setMessage(action === 'cancel' ? 'Schedule cancelled. The draft is private.' : action === 'save' ? 'Publication date saved. Approval is still required.'
        : skyPublicationScheduled(current) ? 'Publication scheduled. The saved article stays private until release.' : 'Article published with the selected publication date.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Publication settings could not be saved. Reload before retrying.'); }
    finally { setBusy(false); onBusyChange?.(false); }
  }
  return <div className="studio-section" aria-label="Publication settings" aria-busy={busy}>
    <strong className="admin-field-label">Publication</strong>
    {row.status === 'LIVE' ? <p>{row.published_at ? `Published ${new Date(row.published_at).toLocaleString()}. ` : 'Published. '}Save your changes as a draft to schedule a replacement.</p> : <>
      <p>{scheduled ? 'Scheduled. This draft is private until its release time.' : skyPublicationState(row) === 'needs_attention'
        ? 'Publication needs attention. Review the saved article and current sources before scheduling again.' : 'Save privately, publish now, or choose a future or previous publication date.'}</p>
    </>}
      <label>Publication date and time<StudioInput type="datetime-local" value={value} disabled={disabled || busy}
        onChange={event => setValue(event.target.value)} /></label>
      <small>Time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}. Leave blank to publish now. Astrology coverage stays unchanged.</small>
      <div className="admin-toolbar-actions">
        <StudioButton disabled={disabled || busy || localValue(savedAt) === value} onClick={() => void submit('save')}>Save publication date</StudioButton>
        {row.status !== 'LIVE' && <StudioButton disabled={disabled || busy || scheduled && localValue(savedAt) === value} onClick={() => void submit('publish')}>{future ? 'Approve & schedule' : 'Approve & publish'}</StudioButton>}
        {scheduled && <StudioButton disabled={disabled || busy} onClick={() => void submit('cancel')}>Cancel schedule</StudioButton>}
      </div>
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
  </div>;
}
