import { useEffect, useMemo, useRef, useState } from 'react';
import type { CompositionMapRow } from './compositionMap';
import { AdminSelect, AdminDisclosureSummary } from './AdminNativeControls';
import { StudioButton, StudioInput } from './StudioControls';
import ContentLiveStatusBadge from './ContentLiveStatus';
import { studioServingStatusRow } from './studioServingStatus';
import { skyPlacementBodies, skyPlacementSigns } from './skyWriteupRelations';
import { fallbackHoroscopeIdentity, fallbackHoroscopeSources } from './fallbackHoroscopeSources';
import { PageLoading } from '../../../src/shared/components/PageLoading';

type Props = {
  rows: CompositionMapRow[];
  credential: string;
  onLoadCatalog: (signal: AbortSignal) => Promise<{ rows?: Array<{ content_key: string; headline: string | null; role: string }> }>;
  onLoadRow: (row: CompositionMapRow) => Promise<unknown>;
  onEditRow: (row: CompositionMapRow) => void;
  onOpenPlacement: (planet: string, sign: string) => void;
  initialSourceKey?: string;
  placement?: { planet: string; sign: string };
  onSourceChange: (key: string) => void;
};
const label = (value: string) => value.replace(/(^|-)([a-z])/gu, (_match, separator, letter) => `${separator ? ' ' : ''}${letter.toUpperCase()}`);
const sourceTitle=(row:CompositionMapRow)=>{
  if(row.headline&&row.headline!==row.content_key)return row.headline;
  const identity=fallbackHoroscopeIdentity(row.content_key)!;
  return `${label(identity.kind==='placement'?identity.planet:identity.kind)}${identity.sign?` in ${label(identity.sign)}`:''}${identity.risingSign?` · ${label(identity.risingSign)} Rising`:''}`;
};

export default function FallbackHoroscopeStudio({ rows, credential, onLoadCatalog, onLoadRow, onEditRow, onOpenPlacement, initialSourceKey, onSourceChange, placement }: Props) {
  const [catalog, setCatalog] = useState<CompositionMapRow[]>([]);
  const [catalogState, setCatalogState] = useState('loading');
  const [catalogRetry, setCatalogRetry] = useState(0);
  const catalogRef = useRef(onLoadCatalog);
  catalogRef.current = onLoadCatalog;
  useEffect(() => {
    let active = true;
    setCatalogState('loading');
    if (!credential.trim()) return;
    const controller = new AbortController();
    void catalogRef.current(controller.signal).then(payload => {
      if (!Array.isArray(payload.rows)) throw new Error('The complete source catalog is unavailable.');
      if (active) {
        setCatalog(payload.rows.map(item => ({ id: `package:${item.content_key}`, content_key: item.content_key,
          headline: item.headline, summary: null, body: null, surface: 'sky', status: 'DRAFT', sections: null,
          inventory_only: true, block_type: item.role === 'template' ? 'fallback_template' : 'fallback_hook' })));
        setCatalogState('ready');
      }
    }).catch(() => { if (active) setCatalogState('error'); });
    return () => { active = false; controller.abort(); };
  }, [credential, catalogRetry]);
  const [kind, setKind] = useState('all');
  const [planet, setPlanet] = useState('all');
  const [sign, setSign] = useState('all');
  const [rising, setRising] = useState('all');
  const [query, setQuery] = useState('');
  const [page,setPage] = useState(0), [editingKey,setEditingKey] = useState(''), [failedEdit,setFailedEdit] = useState<CompositionMapRow|null>(null);
  const mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const [selectedKey, setSelectedKey] = useState(initialSourceKey ?? '');
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const sources = useMemo(() => fallbackHoroscopeSources([...rows, ...catalog]), [rows, catalog]);
  const filtered = sources.filter(row => {
    const identity = fallbackHoroscopeIdentity(row.content_key)!;
    if (placement && (identity.kind !== 'placement' || identity.planet !== placement.planet || identity.sign && identity.sign !== placement.sign)) return false;
    return (kind === 'all' || identity.kind === kind) && (planet === 'all' || identity.planet === planet)
      && (sign === 'all' || !identity.sign || identity.sign === sign)
      && (rising === 'all' || !identity.risingSign || identity.risingSign === rising)
      && query.toLowerCase().split(/\s+/u).every(term => `${row.headline ?? ''} ${row.content_key}`.toLowerCase().includes(term));
  });
  const selected = filtered.find(row => row.content_key === selectedKey);
  const pageCount=Math.max(1,Math.ceil(filtered.length/10));
  const pageRows=filtered.slice(Math.min(page,pageCount-1)*10,(Math.min(page,pageCount-1)+1)*10);
  useEffect(()=>setPage(0),[kind,planet,sign,rising,query]);
  async function editSource(row:CompositionMapRow){
    setEditingKey(row.content_key);setError('');
    try{const full=await loadRef.current(row) as CompositionMapRow;if(!mounted.current)return;if(!full||full.inventory_only)throw new Error('The complete horoscope could not be loaded.');setFailedEdit(null);sourceChangeRef.current(row.content_key);setSelectedKey(row.content_key);onEditRow(full);}
    catch(reason){if(mounted.current){setFailedEdit(row);setError(reason instanceof Error?reason.message:'Could not open this horoscope.');}}
    finally{if(mounted.current)setEditingKey('');}
  }
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
    <div className="admin-browse-search-row">
      <label className="admin-browse-search"><span className="sr-only">Search fallback horoscopes</span><StudioInput aria-label="Search fallback horoscopes" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search horoscopes" /></label>
      {!placement&&<label>Type<AdminSelect aria-label="Horoscope type" value={kind} onChange={event=>{setKind(event.target.value);setPlanet('all');}}><option value="all">All horoscopes</option><option value="placement">Planetary placements</option><option value="new-moon">New Moons</option><option value="full-moon">Full Moons</option><option value="eclipse">Eclipse components</option></AdminSelect></label>}
    </div>
    <details className="studio-contained-disclosure"><AdminDisclosureSummary>Filters</AdminDisclosureSummary>
      <div className="admin-natal-placement-selectors" aria-label="Fallback horoscope filters">
        {!placement&&<>
          {(kind==='all'||kind==='placement')&&<label>Planet or point<AdminSelect aria-label="Horoscope planet or point" value={planet} onChange={event=>setPlanet(event.target.value)}><option value="all">All planets and points</option>{skyPlacementBodies.map(value=><option key={value} value={value}>{label(value)}</option>)}</AdminSelect></label>}
          <label>Sign<AdminSelect aria-label="Horoscope sign" value={sign} onChange={event=>setSign(event.target.value)}><option value="all">All signs</option>{skyPlacementSigns.map(value=><option key={value} value={value}>{label(value)}</option>)}</AdminSelect></label>
        </>}
        <label>Rising sign<AdminSelect aria-label="Horoscope rising sign" value={rising} onChange={event=>setRising(event.target.value)}><option value="all">All rising signs</option>{skyPlacementSigns.map(value=><option key={value} value={value}>{label(value)}</option>)}</AdminSelect></label>
      </div>
    </details>
    <div className="admin-collection-toolbar"><p role="status">{filtered.length} sources</p><div className="admin-toolbar-actions"><StudioButton disabled={page===0} onClick={()=>setPage(value=>value-1)}>Previous</StudioButton><span className="admin-editor-save-state">{Math.min(page,pageCount-1)+1} / {pageCount}</span><StudioButton disabled={page>=pageCount-1} onClick={()=>setPage(value=>value+1)}>Next</StudioButton></div></div>
    <div className="admin-data-table-shell"><table className="admin-data-table" aria-label="Fallback horoscopes"><thead><tr><th>Horoscope</th><th className="admin-col-edit">Actions</th></tr></thead><tbody>{pageRows.map(row=><tr key={row.content_key}><td><StudioButton className="admin-disclosure-button" aria-pressed={selected?.content_key===row.content_key} onClick={()=>setSelectedKey(row.content_key)}>{sourceTitle(row)}</StudioButton></td><td className="admin-col-edit"><StudioButton disabled={!!editingKey} aria-label={`Edit ${sourceTitle(row)}`} onClick={()=>void editSource(row)}>{editingKey===row.content_key?'Opening…':'Edit'}</StudioButton></td></tr>)}</tbody></table></div>
    {error ? <div role="alert"><p>{error}</p><StudioButton onClick={() => failedEdit?void editSource(failedEdit):setRetry(value => value + 1)}>Retry horoscope</StudioButton></div>
      : loading ? <PageLoading message="Loading complete horoscope…" />
      : selected ? <article className="admin-composition-source-card" aria-label="Selected fallback horoscope passage">
        <div className="studio-section-header"><span>{sourceTitle(selected)}</span><div className="admin-toolbar-actions"><ContentLiveStatusBadge row={studioServingStatusRow(selected, selected.content_key)} /><StudioButton disabled={!!selected.inventory_only||!!editingKey} onClick={()=>void editSource(selected)}>Edit</StudioButton></div></div>
        {typeof body === 'string' && body ? <div className="admin-copy-preview">{body.split(/\n{2,}/u).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div> : <p>The complete passage has not loaded.</p>}
        {!placement && identity?.kind === 'placement' && identity.sign && <StudioButton onClick={() => onOpenPlacement(identity.planet, identity.sign!)}>Open Sky Placement horoscopes</StudioButton>}
      </article> : !filtered.length ? <p>No saved fallback matches these filters.</p> : null}
  </section>;
}
