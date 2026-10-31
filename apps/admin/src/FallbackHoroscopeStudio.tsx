import { useEffect, useMemo, useRef, useState } from 'react';
import type { CompositionMapRow } from './compositionMap';
import { AdminSelect } from './AdminNativeControls';
import { StudioButton, StudioInput } from './StudioControls';
import ContentLiveStatusBadge from './ContentLiveStatus';
import { studioServingStatusRow } from './studioServingStatus';
import { skyPlacementBodies, skyPlacementSigns } from './skyWriteupRelations';
import { fallbackHoroscopeIdentity, fallbackHoroscopeSources } from './fallbackHoroscopeSources';
import { PageLoading } from '../../../src/shared/components/PageLoading';
import { hasHoroscopeTarotReferences } from '../../../src/shared/horoscopeEditorialPolicy';

type Props = {
  rows: CompositionMapRow[];
  onLoadCatalog: () => Promise<{ rows?: Array<{ content_key: string; headline: string | null; role: string }> }>;
  onLoadRow: (row: CompositionMapRow) => Promise<unknown>;
  onEditRow: (row: CompositionMapRow) => void;
  onOpenPlacement: (planet: string, sign: string) => void;
  initialSourceKey?: string;
  onSourceChange: (key: string) => void;
};
const label = (value: string) => value.replace(/(^|-)([a-z])/gu, (_match, separator, letter) => `${separator ? ' ' : ''}${letter.toUpperCase()}`);

export default function FallbackHoroscopeStudio({ rows, onLoadCatalog, onLoadRow, onEditRow, onOpenPlacement, initialSourceKey, onSourceChange }: Props) {
  const [catalog, setCatalog] = useState<CompositionMapRow[]>([]);
  const [catalogState, setCatalogState] = useState('loading');
  const [catalogRetry, setCatalogRetry] = useState(0);
  const catalogRef = useRef(onLoadCatalog);
  catalogRef.current = onLoadCatalog;
  useEffect(() => {
    let active = true;
    setCatalogState('loading');
    void catalogRef.current().then(payload => {
      if (!Array.isArray(payload.rows)) throw new Error('The complete source catalog is unavailable.');
      if (active) {
        setCatalog(payload.rows.map(item => ({ id: `package:${item.content_key}`, content_key: item.content_key,
          headline: item.headline, summary: null, body: null, surface: 'sky', status: 'DRAFT', sections: null,
          inventory_only: true, block_type: item.role === 'template' ? 'fallback_template' : 'fallback_hook' })));
        setCatalogState('ready');
      }
    }).catch(() => { if (active) setCatalogState('error'); });
    return () => { active = false; };
  }, [catalogRetry]);
  const [kind, setKind] = useState('all');
  const [planet, setPlanet] = useState('all');
  const [sign, setSign] = useState('all');
  const [rising, setRising] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState(initialSourceKey ?? '');
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const sources = useMemo(() => fallbackHoroscopeSources([...rows, ...catalog]), [rows, catalog]);
  const filtered = sources.filter(row => {
    const identity = fallbackHoroscopeIdentity(row.content_key)!;
    return (kind === 'all' || identity.kind === kind) && (planet === 'all' || identity.planet === planet)
      && (sign === 'all' || !identity.sign || identity.sign === sign)
      && (rising === 'all' || !identity.risingSign || identity.risingSign === rising)
      && query.toLowerCase().split(/\s+/u).every(term => `${row.headline ?? ''} ${row.content_key}`.toLowerCase().includes(term));
  });
  const selected = filtered.find(row => row.content_key === selectedKey) ?? filtered[0];
  useEffect(() => {
    if (!initialSourceKey || selected?.content_key === initialSourceKey) return;
    setSelectedKey(initialSourceKey);
    setKind('all'); setPlanet('all'); setSign('all'); setRising('all'); setQuery('');
  }, [initialSourceKey]);
  const loadRef = useRef(onLoadRow);
  loadRef.current = onLoadRow;
  const sourceChangeRef = useRef(onSourceChange);
  sourceChangeRef.current = onSourceChange;
  useEffect(() => { if (selected && catalogState === 'ready') sourceChangeRef.current(selected.content_key); }, [selected?.content_key, catalogState]);
  useEffect(() => {
    setError('');
    if (!selected?.inventory_only) { setLoading(false); return; }
    let active = true;
    setLoading(true);
    void loadRef.current(selected).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Could not load this horoscope.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selected?.id, selected?.inventory_only, retry]);
  const sections = selected?.sections as { packageDraft?: Record<string, unknown>; packageRecord?: Record<string, unknown> } | undefined;
  const record = sections?.packageDraft ?? sections?.packageRecord;
  const body = record?.body_you ?? record?.body ?? selected?.body;
  const identity = selected && fallbackHoroscopeIdentity(selected.content_key);
  if (catalogState === 'loading') return <PageLoading message="Loading fallback sources…" />;
  if (catalogState === 'error') return <section role="alert"><p>The fallback source catalog could not be loaded.</p><StudioButton onClick={() => setCatalogRetry(value => value + 1)}>Retry fallback sources</StudioButton></section>;
  return <section className="admin-template-page" aria-label="Fallback horoscope library">
    <h2 className="sr-only">Reusable horoscope sources</h2>
    <p>These are the same sources linked from Sky Placement horoscopes. Drafts stay private until you choose Save &amp; publish.</p>
    <div className="admin-natal-placement-selectors" aria-label="Fallback horoscope filters">
      <label>Type<AdminSelect aria-label="Horoscope type" value={kind} onChange={event => setKind(event.target.value)}>
        <option value="all">All horoscopes</option><option value="placement">Planetary placements</option><option value="new-moon">New Moons</option><option value="full-moon">Full Moons</option><option value="eclipse">Eclipse components</option>
      </AdminSelect></label>
      <label>Planet or point<AdminSelect aria-label="Horoscope planet or point" value={planet} onChange={event => setPlanet(event.target.value)}>
        <option value="all">All planets and points</option>{skyPlacementBodies.map(value => <option key={value} value={value}>{label(value)}</option>)}
      </AdminSelect></label>
      <label>Sign<AdminSelect aria-label="Horoscope sign" value={sign} onChange={event => setSign(event.target.value)}>
        <option value="all">All signs</option>{skyPlacementSigns.map(value => <option key={value} value={value}>{label(value)}</option>)}
      </AdminSelect></label>
      <label>Rising sign<AdminSelect aria-label="Horoscope rising sign" value={rising} onChange={event => setRising(event.target.value)}>
        <option value="all">All rising signs</option>{skyPlacementSigns.map(value => <option key={value} value={value}>{label(value)}</option>)}
      </AdminSelect></label>
    </div>
    <label className="admin-field-wide">Search fallback horoscopes<StudioInput aria-label="Search fallback horoscopes" value={query} onChange={event => setQuery(event.target.value)} placeholder="Planet, lunation, sign, or rising sign" /></label>
    <p role="status">{filtered.length} sources</p>
    <label className="admin-field-wide">Selected horoscope<AdminSelect aria-label="Selected fallback horoscope" value={selected?.content_key ?? ''} disabled={!filtered.length} onChange={event => setSelectedKey(event.target.value)}>
      {!filtered.length && <option value="">No matching horoscopes</option>}
      {filtered.map(row => <option key={row.content_key} value={row.content_key}>{row.headline || row.content_key}</option>)}
    </AdminSelect></label>
    {error ? <div role="alert"><p>{error}</p><StudioButton onClick={() => setRetry(value => value + 1)}>Retry horoscope</StudioButton></div>
      : loading ? <PageLoading message="Loading complete horoscope…" />
      : selected ? <article className="admin-composition-source-card" aria-label="Selected fallback horoscope passage">
        <ContentLiveStatusBadge row={studioServingStatusRow(selected, selected.content_key)} />
        {typeof body === 'string' && hasHoroscopeTarotReferences(body) && <p>This passage contains tarot references. Keep the complete original for reference and publish your rewrite after removing them.</p>}
        {typeof body === 'string' && body ? <div className="admin-copy-preview">{body.split(/\n{2,}/u).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div> : <p>The complete passage has not loaded.</p>}
        <StudioButton disabled={!!selected.inventory_only} onClick={() => onEditRow(selected)}>Edit horoscope</StudioButton>
        {identity?.kind === 'placement' && identity.sign && <StudioButton onClick={() => onOpenPlacement(identity.planet, identity.sign!)}>Open Sky Placement horoscopes</StudioButton>}
      </article> : <p>No saved fallback matches these filters. Choose another placement or clear the filters.</p>}
  </section>;
}
