import { studioShellAttributes } from "./studioTheme";
import "./studio-system.css";
import { StudioButton, StudioInput } from "./StudioControls";
import { memo, useEffect, useRef, useState } from 'react';
import { MemoryGraph, type DocumentWithMemories } from '@supermemory/memory-graph';
import { AdminAccessGate } from './AdminStudioPrimitives';
import { PageLoading } from '../../web/src/components/PageLoading';
import { adminCredentialHeaders, adminSecretStorageKey, normalizeAdminSecret } from './adminSecret';
import { loadOwnerSessionAccessToken, ownerSessionStorageKey } from './ownerSession';

type Kind = 'rule' | 'correction' | 'example' | 'navigation' | 'note';
type MemoryRecord = { id: string; kind: Kind; status: string; title: string; path: string; line: number; sourceId: string; family: string; register: string; role: string; contentKey: string; bodySha256: string };
type Source = { id: string; path: string; title: string; kind: Kind; status: string; count: number };
type Edge = { source: string; target: string; relation: string };
type Graph = { ok: true; records: MemoryRecord[]; graphRecords?: MemoryRecord[]; sources: Source[]; edges: Edge[]; total: number; offset: number; limit: number; revision: string | null; counts: Record<Kind, number> };
type Connection = { relation: string; basis: 'recorded' | 'suggested'; direction: string; terms?: string[]; target: MemoryRecord & { isSource?: boolean } };
type Detail = MemoryRecord & { body: string; sourceUrl: string | null; sourceSha256: string; metadata: Record<string, unknown>; related: MemoryRecord[]; connections: Connection[]; requiredContext: Array<MemoryRecord & { body: string }> };
function memoryTitle(record: MemoryRecord) {
  if (record.kind === 'example') return (record.contentKey || record.title).replace(/^authored\/|^fallback-hook\//gu, '').replaceAll('/', ' · ').replaceAll('-', ' ');
  return record.title.replaceAll('_', ' ');
}


// Material Symbols paths used by the reference page (Apache 2.0).
function SearchIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z" /></svg>;
}

const GraphCanvas = memo(function GraphCanvas({ documents }: { documents: DocumentWithMemories[] }) {
  return <div className="memory-reference-root"><MemoryGraph documents={documents} variant="console" showSpacesSelector={false} autoLoadOnViewport={false} legendId="memory-reference-legend" /></div>;
});

export default function MemoryGraphDashboard() {
  const [credential, setCredential] = useState('');
  const [secret, setSecret] = useState('');
  const emergencyCredential = useRef('');
  const rejectedCredential = useRef('');
  const [booting, setBooting] = useState(true);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [documents, setDocuments] = useState<DocumentWithMemories[] | null>(null);
  const [payload, setPayload] = useState<Graph | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkedAt, setCheckedAt] = useState('');
  const matchesRef = useRef<HTMLElement>(null);
  const detailRef = useRef<HTMLElement>(null);
  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const token = await loadOwnerSessionAccessToken();
        const saved = normalizeAdminSecret(window.localStorage.getItem(adminSecretStorageKey) ?? '');
        if (!cancelled) { const next = emergencyCredential.current || token || saved; setCredential(next === rejectedCredential.current ? '' : next); setBooting(false); }
      } catch { if (!cancelled) { setCredential(''); setBooting(false); } }
    }
    void check();
    const onStorage = (event: StorageEvent) => { if (event.key === ownerSessionStorageKey() || event.key === adminSecretStorageKey || event.key === null) void check(); };
    window.addEventListener('storage', onStorage);
    const interval = window.setInterval(check, 30_000);
    return () => { cancelled = true; clearInterval(interval); window.removeEventListener('storage', onStorage); };
  }, []);


  async function readMemory(params: string, signal: AbortSignal) {
    const response = await fetch(`/api/admin/memory-graph?${params}`, { headers: adminCredentialHeaders(credential), signal, cache: 'no-store' });
    const body = await response.json();
    signal.throwIfAborted();
    if (!response.ok || !body.ok) {
      if (response.status === 401) { rejectedCredential.current = credential; emergencyCredential.current = ''; setCredential(''); }
      throw new Error(body.error || 'Memory could not be loaded.');
    }
    return body;
  }
  useEffect(() => {
    setDocuments(null); setPayload(null); setDetail(null); setSelectedId('');
    if (!credential) return;
    const controller = new AbortController();
    setError('');
    void readMemory('mode=visual', controller.signal).then(body => {
      setDocuments(body.documents);
      setCheckedAt(body.freshness?.checkedAt ?? '');
      if (emergencyCredential.current === credential) {
        try { window.localStorage.setItem(adminSecretStorageKey, credential); } catch { /* Keep access usable when storage is unavailable. */ }
      }
    })
      .catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [credential, refresh]);
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(query.trim().length >= 3 ? query.trim() : ''); setOffset(0); }, 200);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    setPayload(null); setDetail(null); setSelectedId(''); setLoading(false);
    if (!search || !credential) return;
    const controller = new AbortController();
    setLoading(true); setError('');
    void readMemory(new URLSearchParams({ q: search, match: 'phrase', offset: String(offset) }).toString(), controller.signal)
      .then(body => setPayload(body)).catch(error => { if (!controller.signal.aborted) setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [credential, search, offset, refresh]);
  useEffect(() => {
    setDetail(null);
    if (!selectedId || !credential) return;
    const controller = new AbortController();
    void readMemory(`mode=detail&id=${encodeURIComponent(selectedId)}`, controller.signal)
      .then(body => setDetail(body.record)).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [credential, selectedId]);
  useEffect(() => {
    const update = () => setRefresh(value => value + 1);
    window.addEventListener('focus', update);
    return () => window.removeEventListener('focus', update);
  }, []);
  useEffect(() => {
    const select = (event: Event) => { const id = (event as CustomEvent<string>).detail; if (typeof id === 'string') setSelectedId(id); };
    window.addEventListener('tldr-memory-select', select);
    return () => window.removeEventListener('tldr-memory-select', select);
  }, []);
  useEffect(() => {
    const outside = (event: MouseEvent) => {
      if ((event.target as Element).closest?.('.memory-reference-root canvas')) return;
      if (!detailRef.current?.contains(event.target as Node) && !matchesRef.current?.contains(event.target as Node)) setSelectedId('');
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelectedId(''); };
    document.addEventListener('click', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('click', outside); document.removeEventListener('keydown', escape); };
  }, []);
  function submitSecret() {
    const value = normalizeAdminSecret(secret);
    if (value) { rejectedCredential.current = ''; emergencyCredential.current = value; setCredential(value); setRefresh(value => value + 1); }
  }
  const back = <a className="memory-site-back" href="/admin/content" aria-label="Back to Content Studio"><svg viewBox="0 -960 960 960" aria-hidden="true"><path fill="currentColor" d="M560-240 320-480l240-240 56 56-184 184 184 184-56 56Z" /></svg>Back</a>;
  if (!credential) return <main className="admin-dashboard memory-access studio-standalone" {...studioShellAttributes()}><section className="admin-main">{error && <p className="memory-access-error" role="alert">{error}</p>}<header className="admin-dashboard-header"><div>{back}<h1>Memory graph</h1></div></header>{booting ? <PageLoading compact message="Checking owner access…" /> : <AdminAccessGate disabled={!normalizeAdminSecret(secret)} onChange={setSecret} onSubmit={submitSecret} value={secret} />}</section></main>;
  return <main className="admin-dashboard memory-is-open studio-standalone" {...studioShellAttributes()}>
    <h1 className="memory-sr-only">Memory graph</h1>
    <header className="memory-toolbar">
    {error && <div className="memory-error" role="alert"><p>{error}</p><StudioButton type="button" onClick={() => setRefresh(value => value + 1)}>Try again</StudioButton></div>}
    {back}
    <div className="memory-search-container">
      <SearchIcon className="memory-search-icon" aria-hidden="true" />
      <StudioInput className="memory-search-input" aria-label="Search memories" placeholder="Search memories..." value={query} onChange={event => setQuery(event.target.value)} />
      {query && <StudioButton className="memory-search-clear" type="button" aria-label="Clear search" onClick={() => { setQuery(''); setSearch(''); setPayload(null); setSelectedId(''); }}><svg viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" /></svg></StudioButton>}
    </div>
    </header>
    <section className="memory-workspace" aria-label="Memory graph workspace">
    {!!documents?.length && <GraphCanvas documents={documents} />}
    {!documents && !error && <PageLoading message="Loading knowledge graph…" />}
    {documents?.length === 0 && !error && <div className="memory-loading" role="status">No project memories available.</div>}
    {payload && payload.total > 0 && <aside className="memory-match-panel" ref={matchesRef} aria-label="Matching memories">
      <div className="memory-match-header"><SearchIcon aria-hidden="true" /><h2>Matching memories:</h2></div>
      <div className="memory-match-list">{payload.records.map(record => <StudioButton type="button" className={`memory-match-chip${selectedId === record.id ? ' expanded' : ''}`} key={record.id} aria-expanded={selectedId === record.id} onClick={() => setSelectedId(value => value === record.id ? '' : record.id)}>{memoryTitle(record)}</StudioButton>)}</div>
      {payload.total > payload.limit && <nav className="memory-pagination" aria-label="Search result pages"><StudioButton type="button" disabled={!offset} onClick={() => setOffset(value => value - payload.limit)}>Previous</StudioButton><span>{offset + 1}–{Math.min(offset + payload.limit, payload.total)}</span><StudioButton type="button" disabled={offset + payload.limit >= payload.total} onClick={() => setOffset(value => value + payload.limit)}>Next</StudioButton></nav>}
    </aside>}
    {selectedId && <aside className="memory-detail" ref={detailRef} aria-label="Memory detail">
      {detail ? <><h2 className="memory-detail-title">{memoryTitle(detail)}</h2>
        {detail.connections.length > 0 && <details className="memory-connections"><summary>Connections ({detail.connections.length})</summary>
          {detail.connections.map((connection, i) => <div className="memory-connection" key={`${connection.target.id}-${i}`}>
            <p>{connection.basis === 'suggested' ? `Suggested · shared terms: ${connection.terms?.join(', ')}` : `Recorded · ${connection.direction === 'incoming' ? 'incoming ' : ''}${connection.relation}`}</p>
            {connection.target.isSource ? <p>{connection.target.path}</p> : <StudioButton type="button" className="memory-match-chip" onClick={() => setSelectedId(connection.target.id)}>{memoryTitle(connection.target)}</StudioButton>}
          </div>)}
        </details>}
        <p className="memory-detail-content">{detail.body}</p>
        <details className="memory-provenance"><summary>Source and provenance</summary><p>{detail.role} · {detail.status.replaceAll('_', ' ')}</p>{checkedAt && <p>Memory checked {new Date(checkedAt).toLocaleString()}</p>}<p>{detail.path}{detail.line ? `:${detail.line}` : ''}</p>{detail.sourceUrl && <a href={detail.sourceUrl} target="_blank" rel="noreferrer">Open source</a>}<p>Exact text SHA-256</p><code>{detail.bodySha256}</code>
          {detail.requiredContext.map(record => <details key={record.id}><summary>{record.title}</summary><p className="memory-detail-content">{record.body}</p></details>)}
        </details></> : <PageLoading compact message="Opening memory…" />}
    </aside>}
    </section>
    <p className="memory-sr-only" role="status">{loading ? 'Searching memories…' : payload ? `${payload.total} matching memories` : ''}</p>
  </main>;
}
