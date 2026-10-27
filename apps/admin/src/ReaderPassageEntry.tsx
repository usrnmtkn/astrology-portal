import { useEffect, useRef, useState } from 'react';
import type { StudioPassageEdit } from '../../../src/shared/studioPassageEdit';
import { requestStudioJson } from './generatedContentClient';
import { StudioButton } from './StudioControls';
import type { PlacementSourceRow } from './skyPlacementSourceSelection';

export default function ReaderPassageEntry({ context, secret, onOpen, fromLibrary = false }: {
  context: StudioPassageEdit; secret: string; onOpen: (row: PlacementSourceRow) => Promise<boolean>; fromLibrary?: boolean;
}) {
  const open = useRef(onOpen); open.current = onOpen;
  const [attempt, setAttempt] = useState(0), [status, setStatus] = useState(''), [error, setError] = useState('');
  useEffect(() => {
    if (!secret) return;
    let active = true;
    setError(''); setStatus('Opening the passage and checking for a saved draft…');
    void (async () => {
      const key = context.sourceKey;
      const keys = [key, ...(key.startsWith('sky-article/') ? [key.replace('sky-article/', 'sky-article-revision/')] : [])];
      const params = new URLSearchParams({ status: 'all', visibility: 'all', limit: '20' });
      keys.forEach(value => params.append('contentKeys', value));
      const result = await requestStudioJson(`/api/admin/generated-content-inventory?${params}`, secret);
      if (!active) return;
      const rows = result.rows as PlacementSourceRow[];
      if (!Array.isArray(rows) || rows.some(row => !keys.includes(row.content_key) || row.inventory_only)) throw new Error('The complete editing source could not be verified.');
      const ordered = [...rows].sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''));
      let row = ordered.find(row => row.status === 'DRAFT' && !/^(package|builtin):/u.test(row.id))
        ?? ordered.find(row => row.content_key === key && row.status === 'LIVE')
        ?? (fromLibrary && key.startsWith('sky-article/')
          ? ordered.find(row => row.content_key === key && row.status === 'ARCHIVED' && !/^(package|builtin):/u.test(row.id)) : undefined);
      if (!row) {
        const packaged = await requestStudioJson(`/api/admin/package-source?${new URLSearchParams({ contentKey: key })}`, secret);
        if (!active) return;
        const source = packaged.packageSource as Record<string, unknown> | null;
        if (source?.contentKey === key) row = { id: `package:${key}`, content_key: key,
          headline: typeof source.headline === 'string' ? source.headline : key, status: 'DRAFT',
          event_type: 'fallback-hook', sections: { packageRecord: source }, inventory_only: true };
      }
      if (!row) throw new Error('This source is no longer available. Refresh the reader to check its current writing.');
      if (!active || !await open.current(row)) throw new Error('The passage editor could not open.');
      if (active) setStatus(row.status === 'ARCHIVED' ? 'Opened the archived article. Restore it as a draft to continue editing.' : row.status === 'DRAFT' && !row.id.startsWith('package:') ? 'Opened your saved draft. Readers still see the published wording.' : 'Opened the reader source. Editing keeps a draft until you publish.');
    })().catch(reason => { if (active) { setStatus(''); setError(reason instanceof Error ? reason.message : 'The passage could not open.'); } });
    return () => { active = false; };
  }, [context.sourceKey, context.date, context.timeZone, secret, attempt, fromLibrary]);
  return <div className="studio-variable-description studio-context-panel" aria-label={fromLibrary ? 'Passage opened from Content Library' : 'Passage opened from reader'}>
    <p>{fromLibrary ? 'Opened from Content Library' : 'Opened from reader'} · {context.date} · {context.timeZone}</p>
    <p>Reader source: <code>{context.sourceKey}</code></p>
    {status && <p role="status">{status}</p>}
    {error && <><p role="alert">{error}</p><StudioButton onClick={() => setAttempt(value => value + 1)}>Retry opening passage</StudioButton></>}
  </div>;
}
