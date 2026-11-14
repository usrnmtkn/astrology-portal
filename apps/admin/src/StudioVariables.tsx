import StudioCustomVariables from "./StudioCustomVariables";
import type { CustomVariable } from "./studioCustomVariableClient";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StudioButton, StudioInput } from './StudioControls';
import { AdminSelect, AdminDisclosureSummary } from './AdminNativeControls';
import { AdminPaginatedCollection } from './AdminPaginatedCollection';
import { compositionVariableColors } from './CompositionVariableKey';
import { decodeStudioVariableCatalog, filterStudioVariables, matchingVariableSources, type StudioVariable, type StudioVariableCatalog } from './studioVariableCatalog';
import { PageLoading } from '../../../src/shared/components/PageLoading';
import { requestStudioJson } from './generatedContentClient';
import { studioVariableExportCsv, expandVariableExportRows, type VariableExportRow } from './studioVariableExport';

import { variableLabel } from './variablePresentation';

const kindLabels = { readonly: 'Calculated fact', editable: 'Reusable phrase', unmapped: 'Internal token' };

function VariableCard({ variable, color, query, onOpenSource }: { variable: StudioVariable; color?: string; query: string; onOpenSource: (key: string, label: string, field: string) => void }) {
  const [sourceQuery, setSourceQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [copyState, setCopyState] = useState('');
  const matches = useMemo(() => matchingVariableSources(variable, [query, sourceQuery].filter(Boolean).join(' ')), [variable, query, sourceQuery]);
  const listed = matches.length <= 12 ? matches : [];
  const sameSource = matches.length > 0 && matches.every(item => item.key === matches[0].key);
  const source = listed.find(item => `${item.key}#${item.field}` === selectedSource)
    ?? (sameSource ? matches.find(item => item.field === 'body') ?? matches.find(item => item.field === 'body_you') ?? matches[0] : undefined);
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
      <p className="admin-field-hint">{variableLabel(variable.name)}</p>
      <p>{variable.description}</p>
      <p className="admin-field-hint">Source: {variable.source}</p>
      {variable.retired && <p className="admin-field-hint">Retired variable. Preserved for the approved legacy source; unavailable in the current reader.</p>}
      {variable.kind === 'readonly' && variable.example && <p>Example: {variable.example}</p>}
    </div>
    <details className="studio-variable-usage">
      <AdminDisclosureSummary>Where it is used</AdminDisclosureSummary>
      <p>Use this token only in the listed fields or templates. Each editor keeps its own variable contract.</p>
      <AdminPaginatedCollection items={variable.usages} label={`${variable.token} usage`} pageSize={10}>{usages => <ul>{usages.map(usage => <li key={usage.key}>{usage.label}<br /><code>{usage.key}</code><br />{usage.retired ? 'Retired source · ' : ''}{usage.fields?.length ? `Fields: ${usage.fields.join(', ')}` : 'Resolver dependency; no direct insertion field'}</li>)}</ul>}</AdminPaginatedCollection>
    </details>
      {variable.kind === 'editable' && (variable.sources.length ? <div className="studio-variable-source">
      {variable.sources.length > 1 && <label className="admin-filter-search"><span>Find writing</span><StudioInput type="search" value={sourceQuery} onChange={event => { setSourceQuery(event.target.value); setSelectedSource(''); }} aria-label={`Find writing for ${variable.token}`} placeholder="Planet, sign, or source" /></label>}
      {matches.length === 1 ? <p className="admin-field-hint">{matches[0].label}</p>
        : listed.length ? <label><span>Writing</span><AdminSelect aria-label={`Source for ${variable.token}`} value={source ? `${source.key}#${source.field}` : ''} onChange={event => setSelectedSource(event.target.value)}>
          <option value="">Select writing</option>
          {listed.map(item => <option key={`${item.key}#${item.field}`} value={`${item.key}#${item.field}`}>{item.label}</option>)}
        </AdminSelect></label>
        : variable.sources.length > 1 ? <p className="admin-field-hint">{matches.length ? `${matches.length} matches. Add a planet or sign to narrow this list.` : "No writing matches that search."}</p> : null}
      <StudioButton disabled={!source} onClick={() => source && onOpenSource(source.key, `${variable.token} · ${source.label}`, source.field)}>Open writing</StudioButton>
    </div> : <p className="admin-field-hint">This token is copied into templates. Writing is edited from Review Queue or Sky Write-ups.</p>)}
  </article>;
}

export default function StudioVariables({ onOpenSource, secret, customVariables, onCustomChange, customError, customLoading, onReloadCustom, createRequest, onCreateHandled, initialVariableName, customLoaded = !customLoading && !customError, onDirty }: {
  onOpenSource: (key: string, label: string, field: string) => void; secret: string;
  customVariables: CustomVariable[]; onCustomChange: (variables: CustomVariable[]) => void;
  customError: string; customLoading: boolean; onReloadCustom: () => void;
  createRequest: number; onCreateHandled: () => void;
  initialVariableName?: string;
  customLoaded?: boolean;
  onDirty?: (dirty: boolean, busy: boolean) => void;
}) {
  const customDraft = useRef({ dirty: false, busy: false });
  const trackDraft = useCallback((dirty: boolean, busy: boolean) => {
    customDraft.current = { dirty, busy }; onDirty?.(dirty, busy);
  }, [onDirty]);
  const [catalog, setCatalog] = useState<StudioVariableCatalog | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState('');
  useEffect(() => { if (initialVariableName) { setQuery(initialVariableName); setKind('custom'); setTag(''); } }, [initialVariableName]);
  const [kind, setKind] = useState('');
  const [exportState, setExportState] = useState('');
  const [exporting, setExporting] = useState(false);
  async function exportVariables(format: 'csv' | 'json') {
    setExporting(true); setExportState('Loading variable content…');
    try {
      const rows: VariableExportRow[] = [];
      let cursor: string | null = '0';
      const seen = new Set<string>();
      while (cursor !== null) {
        if (seen.has(cursor)) throw new Error('The export returned a repeated page. Try again.');
        seen.add(cursor);
        const page = await requestStudioJson(`/api/admin/generated-content?variables=export&cursor=${encodeURIComponent(cursor)}`, secret) as any;
        if (page.schema !== 'studio-variable-export/v1' || !Array.isArray(page.rows)
          || page.rows.some((row: any) => typeof row.content !== 'string' || typeof row.token !== 'string')
          || page.nextCursor !== null && typeof page.nextCursor !== 'string') throw new Error('The variable export could not be verified.');
        rows.push(...expandVariableExportRows(page)); cursor = page.nextCursor;
        setExportState(`Loading saved content: ${page.completedSources} of ${page.sourceCount} sources`);
      }
      const data = format === 'csv' ? studioVariableExportCsv(rows) : JSON.stringify({ schema: 'studio-variable-export/v1', exportedAt: new Date().toISOString(), rows }, null, 2);
      const url = URL.createObjectURL(new Blob([data], { type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = `content-studio-variables-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url);
      setExportState(`Exported ${rows.length} values, including calculated examples and custom overrides.`);
    } catch (error) { setExportState(error instanceof Error ? error.message : 'The variables could not be exported.'); }
    finally { setExporting(false); }
  }
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
      <p>{custom ? "Create and organize your reusable writing. Your variables support a shared value and optional planet, sign, or placement overrides." : "Look up a token, then open its writing. Calculated facts can be copied; phrase tokens open one field."}</p>
      <section className="admin-filter-form" aria-label="Variable filters">
        <label className="admin-filter-search"><span>Search variables</span><StudioInput type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Token, meaning, planet, sign, or source" /></label>
        <label><span>Library</span><AdminSelect aria-label="Library" value={kind} onChange={event => {
          const nextKind = event.target.value;
          if (nextKind !== kind && !customDraft.current.busy
            && (!customDraft.current.dirty || window.confirm('Discard the unsaved variable changes?'))) {
            if (createRequest && nextKind !== 'custom') onCreateHandled();
            setKind(nextKind);
          }
        }}><option value="">All built-in variables</option><option value="custom">My variables</option><option value="readonly">Calculated facts</option><option value="editable">Existing phrase variables</option></AdminSelect></label>
        {custom ? <label><span>Tag</span><AdminSelect aria-label="Tag" value={tag} onChange={event => setTag(event.target.value)}><option value="">All tags</option>{tags.map(value => <option key={value}>{value}</option>)}</AdminSelect></label> : <label><span>Available in</span><AdminSelect aria-label="Available in" value={surface} onChange={event => setSurface(event.target.value)}><option value="">All surfaces</option>{surfaces.map(value => <option key={value}>{value}</option>)}</AdminSelect></label>}
      </section>
      <div className="admin-filter-actions">
        {!custom && catalog && <p className="admin-field-hint" role="status">{filtered.length} of {catalog.variables.length} variable definitions</p>}
        <StudioButton disabled={!query && !tag && !surface} onClick={reset}>Clear filters</StudioButton>
        <StudioButton disabled={exporting || !catalog} onClick={() => void exportVariables('csv')}>Export all values (CSV)</StudioButton>
        <StudioButton disabled={exporting || !catalog} onClick={() => void exportVariables('json')}>Export all values (JSON)</StudioButton>
      </div>
      {exportState && <p role="status">{exportState}</p>}
    </div>
    {custom ? <>
      {customError && <div role="alert"><p>{customError}</p><StudioButton onClick={onReloadCustom}>Retry my variables</StudioButton></div>}
      {customLoading ? <PageLoading compact message="Loading your variables…" /> : customLoaded && <StudioCustomVariables variables={customVariables} secret={secret} query={query} tag={tag} onChange={onCustomChange} createRequest={createRequest} onCreateHandled={onCreateHandled} initialVariableName={initialVariableName} onDirty={trackDraft} />}
    </> : error ? <div className="admin-empty-state" role="alert"><p>{error}</p><StudioButton onClick={() => setAttempt(value => value + 1)}>Retry catalog</StudioButton></div>
      : !catalog ? <PageLoading compact message="Loading variables…" /> : <>
        {filtered.length ? <AdminPaginatedCollection items={filtered} label="Variables" pageSize={20} resetKey={`${query}|${kind}|${surface}`}>
          {visible => <div className="studio-section studio-variable-list">{visible.map(variable => <VariableCard key={variable.id} variable={variable} color={colors.get(variable.name)} query={query} onOpenSource={onOpenSource} />)}</div>}
        </AdminPaginatedCollection> : <div className="admin-empty-state"><h2>No matching variables</h2><p>Try another name or clear the filters.</p><StudioButton onClick={reset}>Show all variables</StudioButton></div>}
      </>}
  </section>;
}
