import { useEffect, useMemo, useState } from 'react';
import { StudioButton, StudioInput } from './StudioControls';
import { AdminSelect, AdminDisclosureSummary } from './AdminNativeControls';
import { AdminPaginatedCollection } from './AdminPaginatedCollection';
import { decodeStudioVariableCatalog, filterStudioVariables, type StudioVariable, type StudioVariableCatalog } from './studioVariableCatalog';

const kindLabels = { readonly: 'Read-only', editable: 'Editable prose', unmapped: 'Provider not documented' };

function VariableCard({ variable, onOpenSource }: { variable: StudioVariable; onOpenSource: (key: string, label: string, field: string) => void }) {
  const [selectedSource, setSelectedSource] = useState('');
  const [copyState, setCopyState] = useState('');
  const source = variable.sources.find(item => `${item.key}#${item.field}` === selectedSource);
  async function copy() {
    try { await navigator.clipboard.writeText(variable.token); setCopyState('Copied'); }
    catch { setCopyState('Copy unavailable. Select the token and copy it manually.'); }
  }
  return <article className="admin-template-card studio-variable-card" aria-label={`${variable.token} · ${variable.source}`}>
    <div className="admin-new-actions">
      <h2><code>{variable.token}</code></h2>
      <span className="ui-pill">{kindLabels[variable.kind]}</span>
      <StudioButton onClick={() => void copy()} aria-label={`Copy ${variable.token}`}>Copy token</StudioButton>
    </div>
    {copyState && <p role="status">{copyState}</p>}
    <p>{variable.description}</p>
    <p className="admin-field-hint">Source: {variable.source}</p>
    <details className="admin-workspace-details">
      <AdminDisclosureSummary>Used in {variable.usages.length} {variable.usages.length === 1 ? 'context' : 'contexts'}</AdminDisclosureSummary>
      <p>Use this token only in the listed fields or templates. Each editor keeps its own variable contract.</p>
      <AdminPaginatedCollection items={variable.usages} label={`${variable.token} usage`} pageSize={10}>{usages => <ul>{usages.map(usage => <li key={usage.key}>{usage.label}<br /><code>{usage.key}</code></li>)}</ul>}</AdminPaginatedCollection>
    </details>
    {variable.kind === 'editable' && (variable.sources.length ? <div className="admin-new-actions">
      <label><span>Edit value for</span><AdminSelect aria-label={`Source for ${variable.token}`} value={selectedSource} onChange={event => setSelectedSource(event.target.value)}>
        <option value="">Choose a source</option>
        {variable.sources.map(item => <option key={`${item.key}#${item.field}`} value={`${item.key}#${item.field}`}>{item.label}</option>)}
      </AdminSelect></label>
      <StudioButton disabled={!source} onClick={() => source && onOpenSource(source.key, `${variable.token} · ${source.label}`, source.field)}>Edit source</StudioButton>
    </div> : <p className="admin-field-hint">Open the matching template's Variables panel to inspect its source selection.</p>)}
  </article>;
}

export default function StudioVariables({ onOpenSource }: { onOpenSource: (key: string, label: string, field: string) => void }) {
  const [catalog, setCatalog] = useState<StudioVariableCatalog | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('');
  const [surface, setSurface] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    void fetch('/generated/studio-variables-v1.json', { signal: controller.signal, cache: 'no-cache' })
      .then(async response => {
        if (!response.ok) throw new Error('The variable catalog could not load.');
        const data = decodeStudioVariableCatalog(await response.json());
        if (!controller.signal.aborted) setCatalog(data);
      }).catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'The variable catalog could not load.'); });
    return () => controller.abort();
  }, [attempt]);
  const surfaces = useMemo(() => [...new Set(catalog?.variables.flatMap(variable => variable.usages.map(usage => usage.surface)) ?? [])].sort(), [catalog]);
  const filtered = useMemo(() => filterStudioVariables(catalog?.variables ?? [], query, kind, surface), [catalog, query, kind, surface]);
  const reset = () => { setQuery(''); setKind(''); setSurface(''); };
  return <section className="admin-template-page studio-variables" aria-label="Variable directory">
    <p>Find calculated facts and editable prose across Content Studio. Copy a token into a supported editor, or choose an editable source to change its writing.</p>
    <section className="admin-content-filters" aria-label="Variable filters">
      <label><span>Search variables</span><StudioInput type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Token, meaning, planet, sign, or source" /></label>
      <label><span>Type</span><AdminSelect aria-label="Type" value={kind} onChange={event => setKind(event.target.value)}><option value="">All types</option><option value="readonly">Read-only</option><option value="editable">Editable prose</option><option value="unmapped">Provider not documented</option></AdminSelect></label>
      <label><span>Used in</span><AdminSelect aria-label="Used in" value={surface} onChange={event => setSurface(event.target.value)}><option value="">All surfaces</option>{surfaces.map(value => <option key={value}>{value}</option>)}</AdminSelect></label>
      <StudioButton disabled={!query && !kind && !surface} onClick={reset}>Clear filters</StudioButton>
    </section>
    {error ? <div className="admin-empty-state" role="alert"><p>{error}</p><StudioButton onClick={() => setAttempt(value => value + 1)}>Retry catalog</StudioButton></div>
      : !catalog ? <p role="status">Loading variables…</p> : <>
        <p role="status">{filtered.length} of {catalog.variables.length} variable definitions</p>
        {filtered.length ? <AdminPaginatedCollection items={filtered} label="Variables" pageSize={20} resetKey={`${query}|${kind}|${surface}`}>
          {visible => <div className="admin-fallback-row-list">{visible.map(variable => <VariableCard key={variable.id} variable={variable} onOpenSource={onOpenSource} />)}</div>}
        </AdminPaginatedCollection> : <div className="admin-empty-state"><h2>No matching variables</h2><p>Try another name or clear the filters.</p><StudioButton onClick={reset}>Show all variables</StudioButton></div>}
      </>}
  </section>;
}
