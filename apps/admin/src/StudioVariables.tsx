import StudioCustomVariables from "./StudioCustomVariables";
import type { CustomVariable } from "./studioCustomVariableClient";
import { useEffect, useMemo, useState } from 'react';
import { StudioButton, StudioInput } from './StudioControls';
import { AdminSelect, AdminDisclosureSummary } from './AdminNativeControls';
import { AdminPaginatedCollection } from './AdminPaginatedCollection';
import { compositionVariableColors } from './CompositionVariableKey';
import { decodeStudioVariableCatalog, filterStudioVariables, type StudioVariable, type StudioVariableCatalog } from './studioVariableCatalog';

const kindLabels = { readonly: 'Calculated fact', editable: 'Reusable phrase', unmapped: 'Internal token' };

function VariableCard({ variable, color, onOpenSource }: { variable: StudioVariable; color?: string; onOpenSource: (key: string, label: string, field: string) => void }) {
  const [selectedSource, setSelectedSource] = useState('');
  const [copyState, setCopyState] = useState('');
  const source = variable.sources.find(item => `${item.key}#${item.field}` === selectedSource);
  async function copy() {
    try { await navigator.clipboard.writeText(variable.token); setCopyState('Copied'); }
    catch { setCopyState('Copy unavailable. Select the token and copy it manually.'); }
  }
  return <article className="studio-surface studio-section studio-variable-card" aria-label={`${variable.token} · ${variable.source}`}>
    <header className="admin-template-card-header">
      <div className="admin-new-actions">
        <h2><code data-variable-name={variable.name} data-variable-color={color}>{variable.token}</code></h2>
        <span className="ui-pill">{kindLabels[variable.kind]}</span>
      </div>
      <StudioButton onClick={() => void copy()} aria-label={`Copy ${variable.token}`}>Copy token</StudioButton>
    </header>
    {copyState && <p role="status">{copyState}</p>}
    <div className="studio-variable-description">
      <p>{variable.description}</p>
      <p className="admin-field-hint">Source: {variable.source}</p>
    </div>
    <details className="studio-variable-usage">
      <AdminDisclosureSummary>Available in {variable.usages.length} {variable.usages.length === 1 ? 'context' : 'contexts'}</AdminDisclosureSummary>
      <p>Use this token only in the listed fields or templates. Each editor keeps its own variable contract.</p>
      <AdminPaginatedCollection items={variable.usages} label={`${variable.token} usage`} pageSize={10}>{usages => <ul>{usages.map(usage => <li key={usage.key}>{usage.label}<br /><code>{usage.key}</code></li>)}</ul>}</AdminPaginatedCollection>
    </details>
    {variable.kind === 'editable' && (variable.sources.length ? <div className="studio-variable-source">
      <label><span>Edit value for</span><AdminSelect aria-label={`Source for ${variable.token}`} value={selectedSource} onChange={event => setSelectedSource(event.target.value)}>
        <option value="">Choose a source</option>
        {variable.sources.map(item => <option key={`${item.key}#${item.field}`} value={`${item.key}#${item.field}`}>{item.label}</option>)}
      </AdminSelect></label>
      <StudioButton disabled={!source} onClick={() => source && onOpenSource(source.key, `${variable.token} · ${source.label}`, source.field)}>Edit source</StudioButton>
    </div> : <p className="admin-field-hint">Open the matching template's Variables panel to inspect its source selection.</p>)}
  </article>;
}

export default function StudioVariables({ onOpenSource, secret, customVariables, onCustomChange, customError, customLoading, onReloadCustom, createRequest, onCreateHandled }: {
  onOpenSource: (key: string, label: string, field: string) => void; secret: string;
  customVariables: CustomVariable[]; onCustomChange: (variables: CustomVariable[]) => void;
  customError: string; customLoading: boolean; onReloadCustom: () => void;
  createRequest: number; onCreateHandled: () => void;
}) {
  const [catalog, setCatalog] = useState<StudioVariableCatalog | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('custom');
  const [tag, setTag] = useState('');
  const custom = kind === 'custom' || Boolean(createRequest);
  const tags = [...new Set(customVariables.flatMap(variable => variable.tags))].sort();
  useEffect(() => { if (createRequest) { setKind('custom'); setQuery(''); setTag(''); } }, [createRequest]);
  useEffect(() => { if (tag && !customVariables.some(variable => variable.tags.includes(tag))) setTag(''); }, [customVariables, tag]);
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
  const colors = useMemo(() => compositionVariableColors(catalog?.variables ?? []), [catalog]);
  const filtered = useMemo(() => filterStudioVariables(catalog?.variables ?? [], query, kind, surface), [catalog, query, kind, surface]);
  const reset = () => { setQuery(''); setTag(''); setSurface(''); };
  return <section className="admin-template-page studio-variables" aria-label="Variable directory">
    <div className="studio-surface studio-section studio-variable-controls">
      <p>Create and organize your reusable writing. Your variables support a shared value and optional planet, sign, or placement overrides. Built-in facts and existing phrase sources are available separately.</p>
      <section className="admin-filter-form" aria-label="Variable filters">
        <label className="admin-filter-search"><span>Search variables</span><StudioInput type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Token, meaning, planet, sign, or source" /></label>
        <label><span>Library</span><AdminSelect aria-label="Library" value={kind} onChange={event => setKind(event.target.value)}><option value="custom">My variables</option><option value="readonly">Calculated facts</option><option value="editable">Existing phrase variables</option></AdminSelect></label>
        {custom ? <label><span>Tag</span><AdminSelect aria-label="Tag" value={tag} onChange={event => setTag(event.target.value)}><option value="">All tags</option>{tags.map(value => <option key={value}>{value}</option>)}</AdminSelect></label> : <label><span>Available in</span><AdminSelect aria-label="Available in" value={surface} onChange={event => setSurface(event.target.value)}><option value="">All surfaces</option>{surfaces.map(value => <option key={value}>{value}</option>)}</AdminSelect></label>}
      </section>
      <div className="admin-filter-actions">
        {!custom && catalog && <p className="admin-field-hint" role="status">{filtered.length} of {catalog.variables.length} variable definitions</p>}
        <StudioButton disabled={!query && !tag && !surface} onClick={reset}>Clear filters</StudioButton>
      </div>
    </div>
    {custom ? customLoading ? <p role="status">Loading your variables…</p> : customError ? <div role="alert"><p>{customError}</p><StudioButton onClick={onReloadCustom}>Retry my variables</StudioButton></div> : <StudioCustomVariables variables={customVariables} secret={secret} query={query} tag={tag} onChange={onCustomChange} createRequest={createRequest} onCreateHandled={onCreateHandled} /> : error ? <div className="admin-empty-state" role="alert"><p>{error}</p><StudioButton onClick={() => setAttempt(value => value + 1)}>Retry catalog</StudioButton></div>
      : !catalog ? <p role="status">Loading variables…</p> : <>
        {filtered.length ? <AdminPaginatedCollection items={filtered} label="Variables" pageSize={20} resetKey={`${query}|${kind}|${surface}`}>
          {visible => <div className="studio-section studio-variable-list">{visible.map(variable => <VariableCard key={variable.id} variable={variable} color={colors.get(variable.name)} onOpenSource={onOpenSource} />)}</div>}
        </AdminPaginatedCollection> : <div className="admin-empty-state"><h2>No matching variables</h2><p>Try another name or clear the filters.</p><StudioButton onClick={reset}>Show all variables</StudioButton></div>}
      </>}
  </section>;
}
