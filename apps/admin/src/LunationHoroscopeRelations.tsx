import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { AdminGeneratedContentRow } from './GeneratedContentAdminDashboard';
import { relatedLunationHoroscopes, type SkyLunationContext } from './skyWriteupRelations';
import { lunationHoroscopeIdentities } from '../../../src/shared/lunationHoroscopeIdentities';
import { mergeContentInventory } from './contentStudioState';
import { containedDisclosure } from './studio-ds/recipes';
import { PageLoading } from '../../../src/shared/components/PageLoading';
import { AdminDisclosureSummary } from './AdminNativeControls';
import { StudioButton } from './StudioControls';

type Props = {
  context: SkyLunationContext;
  rows: AdminGeneratedContentRow[];
  secret: string;
  open: boolean;
  read: (path: string, secret: string) => Promise<{ rows: AdminGeneratedContentRow[] }>;
  onRows: Dispatch<SetStateAction<AdminGeneratedContentRow[]>>;
  onEdit: (row: AdminGeneratedContentRow) => void;
  label: (risingSign: string, house: number) => string;
};

export default function LunationHoroscopeRelations({ context, rows, secret, open, read, onRows, onEdit, label }: Props) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (context.eclipse !== 'none' || !secret.trim()) return;
    let cancelled = false;
    setStatus('loading');
    const keys = lunationHoroscopeIdentities(context.kind, context.sign).map(entry => entry.contentKey);
    const query = new URLSearchParams({ status: 'all', visibility: 'all', limit: '64' });
    keys.forEach(key => query.append('contentKeys', key));
    void read(`/api/admin/generated-content?${query}`, secret).then(payload => {
      if (cancelled) return;
      if (!Array.isArray(payload.rows) || keys.some(key => !payload.rows.some(row => row.content_key === key && !row.inventory_only))) {
        throw new Error('Could not load all twelve RATM horoscopes. Try again.');
      }
      onRows(current => mergeContentInventory(current, payload.rows));
      setStatus('ready');
    }).catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, [context.kind, context.sign, context.eclipse, secret, read, onRows, retry]);
  const horoscopes = relatedLunationHoroscopes(rows, context);
  return <details className={`${containedDisclosure} admin-workspace-details admin-sky-related-group admin-diagnostics-details`} open={open}>
    <AdminDisclosureSummary><span>Rising-sign horoscopes</span>{' '}<strong>{horoscopes.filter(row => row.sourceReady).length}/12 source-ready</strong></AdminDisclosureSummary>
    <p className="admin-sky-related-help">{context.eclipse === 'none'
      ? 'These are the complete RATM fallback horoscopes for this lunation. Choose Edit source beneath a rising sign to edit its full passage. Saved drafts require publication before readers receive your changes.'
      : 'The app assembles these twelve horoscopes from the saved frame, house opening, house jurisdiction, and lunation-sign focus below. Exact-date ruler and retrograde layers are calculated later, so the dashboard does not store twelve duplicate final articles.'}</p>
    {context.eclipse === 'none' && status === 'loading' ? <PageLoading message="Loading RATM horoscopes…" />
      : context.eclipse === 'none' && status === 'error' ? <div role="alert"><p>The RATM horoscopes could not be loaded.</p><StudioButton type="button" onClick={() => setRetry(value => value + 1)}>Retry horoscopes</StudioButton></div>
      : <div className="admin-sky-house-grid admin-lunar-coverage-row-list">{horoscopes.map(horoscope => <article key={horoscope.risingSign} className={`admin-hook-detail-section ${horoscope.sourceReady ? 'has-passage' : 'is-missing'}`}>
        <header className="admin-fallback-diagnostic-heading"><strong>{label(horoscope.risingSign, horoscope.house)}</strong><span>{horoscope.sourceReady ? 'Source-ready' : 'Missing required source'}</span></header>
        <div className="admin-copy-preview">{horoscope.preview ? horoscope.preview.split(/\n{2,}/u).map(paragraph => <p key={paragraph}>{paragraph}</p>) : <p>No base horoscope preview can be assembled yet.</p>}</div>
        <div className="admin-sky-aspect-list">{horoscope.sources.map(source => <div className="admin-sky-related-row admin-hook-detail-section" key={`${source.role}-${source.row.id}`}>
          <div><span>{source.role}</span><code>{source.row.content_key}</code></div><StudioButton type="button" onClick={() => onEdit(source.row)}>Edit source</StudioButton>
        </div>)}</div>
      </article>)}</div>}
  </details>;
}
