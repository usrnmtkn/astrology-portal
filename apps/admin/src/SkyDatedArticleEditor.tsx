import { useEffect, useMemo, useRef, useState } from 'react';
import { AdminDisclosureSummary, AdminSelect } from './AdminNativeControls';
import { StudioButton, StudioInput, StudioTextarea } from './StudioControls';
import SkyPlacementVariableKey from './SkyPlacementVariableKey';
import StudioVariableInsert from './StudioVariableInsert';
import { installSkyWritingLibrary, loadSkyWritingLibrarySeeds, skyWritingLibraryInstalled } from './skyWritingLibrary';
import type { CustomVariable } from './studioCustomVariableClient';
import type { CompiledSkyArticleEdition, SkyArticleEditableFields } from '../../web/src/content/skyArticleTemplateCompiler';
import { skyArticleVariableDraftForFields, skyArticleVariableTokens, resolveSkyArticleVariableFields, type SkyArticleVariableDraft, type SkyArticleVariableBinding } from '../../../src/shared/skyArticleVariableDraft';
import { variableLabel } from './variablePresentation';
import { ZODIAC_SEASON_VARIABLES, zodiacSeasonSourceKey } from '../../web/src/content/fallbackArchitectureV3/resolver/zodiacSeasonVariables.mjs';
// @ts-ignore Shared source-aware expansion and calculated fact contract.
import { skyPlacementArticleVariableSegments } from '../../web/src/content/fallbackArchitectureV3/resolver/skyPlacementArticleVariables.mjs';
// @ts-ignore Shared calculated fact contract.
import { skyPlacementVariableFacts } from '../../web/src/content/fallbackArchitectureV3/resolver/skyPlacementVariables.mjs';

type Field = 'headline' | 'tldr' | 'body';
type RecordValue = Record<string, any>;
type Props = {
  edition: CompiledSkyArticleEdition; fields: SkyArticleEditableFields; variables?: SkyArticleVariableDraft | null;
  engineFacts?: RecordValue; disabled: boolean;
  saveState: 'unsaved' | 'saving' | 'saved' | 'error'; publishedUnchanged: boolean; onSave: () => void;
  custom: { variables: CustomVariable[]; loading: boolean; error: string; reload: () => void };
  onChange: (fields: SkyArticleEditableFields, variables: SkyArticleVariableDraft | null) => void;
  onLoadSource: (key: string) => Promise<RecordValue | undefined>;
  onOpenSource: (key: string, field: string) => void;
};
const fieldLabels = { headline: 'Headline', tldr: 'TL;DR', body: 'General article' };

export default function SkyDatedArticleEditor(props: Props) {
  const { edition, fields, variables, disabled } = props;
  const [target, setTarget] = useState<Field>('body');
  const [variablesOpen, setVariablesOpen] = useState(false);
  const headline = useRef<HTMLInputElement>(null), tldr = useRef<HTMLTextAreaElement>(null), body = useRef<HTMLTextAreaElement>(null);
  const targets = { headline, tldr, body };
  const loader = useRef(props.onLoadSource); loader.current = props.onLoadSource;
  const [source, setSource] = useState<RecordValue>();
  const [references, setReferences] = useState<RecordValue[]>([]);
  const [seedSources, setSeedSources] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  const [calculated, setCalculated] = useState<RecordValue | null>(null), [calculating, setCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState('');
  const sourceKey = `sky-placement/article/${edition.planet}/${edition.sign}`;
  const timeZone = props.engineFacts?.referenceTimeZone || 'UTC';
  useEffect(() => {
    if (!variablesOpen) return;
    let active = true; setLoading(true); setError('');
    void (async () => {
      const saved = await loader.current(sourceKey) ?? { contentKey: sourceKey };
      const seeds = skyWritingLibraryInstalled(saved.ingress) ? { values: {}, provenance: {} } : await loadSkyWritingLibrarySeeds(saved, edition.planet, edition.sign, key => loader.current(key));
      const record = { ...saved, contentKey: sourceKey, ingress: installSkyWritingLibrary(saved.ingress ?? { version: 1, enabled: true, sources: {}, modules: [] }, seeds.values) };
      const keys = [...new Set([...(Object.values(record.ingress.sources) as any[]).map(item => item.reference?.contentKey).filter(Boolean),
        ...ZODIAC_SEASON_VARIABLES.map((item: { id: string }) => zodiacSeasonSourceKey(item.id, edition.sign))])].filter(key => key !== sourceKey);
      const rows = await Promise.all(keys.map(key => loader.current(key)));
      if (active) { setSource(record); setReferences(rows.filter(Boolean) as RecordValue[]); setSeedSources(seeds.provenance); }
    })().catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Article writing sources could not load.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [sourceKey, edition.planet, edition.sign, attempt, variablesOpen]);
  const facts = useMemo(() => {
    const result = skyPlacementVariableFacts(calculated ?? { planet: edition.planet, sign: edition.sign });
    if (!calculated) delete result.motion;
    return result;
  }, [calculated, edition.planet, edition.sign]);
  const owner = { ...source, contentKey: sourceKey, planet: edition.planet, sign: edition.sign, _studioVariables: props.custom.variables };
  const binding = (name: string): SkyArticleVariableBinding | undefined => {
    if (name.startsWith('edition_') && Object.hasOwn(edition.slotValues, name.slice(8))) return {
      text: edition.slotValues[name.slice(8)], kind: Object.hasOwn(props.engineFacts?.slotValues ?? {}, name.slice(8)) ? 'Original calculated value' : 'Original saved writing',
      source: `${edition.templateKey}#slotValues.${name.slice(8)}`, version: edition.templateHash,
    };
    const part = skyPlacementArticleVariableSegments(`{{${name}}}`, facts, owner, [owner, ...references]).find((part: any) => part.token);
    if (!part?.available || !part.text.trim()) return;
    const custom = props.custom.variables.find(item => item.name === name);
    return { text: part.text, kind: part.kind === 'fact' ? 'Calculated fact' : 'Saved writing', source: seedSources[name] ?? part.reference,
      version: custom?.updatedAt ?? (part.kind === 'fact' ? calculated?.ingressOccurrence?.asOfDate ?? edition.compiledHash : source?._studioSourceVersion) };
  };
  const change = (next: SkyArticleEditableFields, values = variables?.values ?? {}) => {
    const captured = { ...values };
    for (const field of ['headline', 'tldr', 'body'] as const) for (const match of skyArticleVariableTokens(next[field])) {
      if (!Object.hasOwn(captured, match[1])) { const value = binding(match[1]); if (value) captured[match[1]] = value; }
    }
    const draft = skyArticleVariableDraftForFields(next, captured);
    props.onChange(next, variables || Object.values(draft.templates).some(text => /\{\{|\}\}/u.test(text)) ? draft : null);
  };
  const insert = (token: string) => {
    const input = targets[target].current;
    const start = input?.selectionStart ?? fields[target].length, end = input?.selectionEnd ?? start;
    change({ ...fields, [target]: fields[target].slice(0, start) + token + fields[target].slice(end) });
    requestAnimationFrame(() => { input?.focus(); input?.setSelectionRange(start + token.length, start + token.length); });
  };
  let resolved: SkyArticleEditableFields | null = null, issue = '';
  try { resolved = resolveSkyArticleVariableFields(fields, variables); } catch (reason) { issue = (reason as Error).message; }
  const used = [...new Set(skyArticleVariableTokens(fields[target]).map(match => match[1]))];
  return <>
    <label><span>Editing passage</span><AdminSelect aria-label="Dated article variable target" value={target} onChange={event => setTarget(event.target.value as Field)}>{(['headline', 'tldr', 'body'] as const).map(field => <option key={field} value={field}>{fieldLabels[field]}</option>)}</AdminSelect></label>
    <label className="admin-title-field" hidden={target !== 'headline'}><span>Headline</span><StudioInput ref={headline} aria-label="Sky article headline" value={fields.headline} disabled={disabled} onFocus={() => setTarget('headline')} onChange={event => change({ ...fields, headline: event.target.value })} /></label>
    <label className="admin-review-copy-editor" hidden={target !== 'tldr'}><span>TL;DR</span><StudioTextarea ref={tldr} aria-label="Sky article TL;DR" value={fields.tldr} disabled={disabled} onFocus={() => setTarget('tldr')} onChange={event => change({ ...fields, tldr: event.target.value })} /><small className="admin-field-hint">Written explicitly. It appears in the Transits list and at the top of the full reading.</small></label>
    <label className="admin-review-copy-editor" hidden={target !== 'body'}><span>General article</span><StudioTextarea ref={body} aria-label="Sky article general copy" value={fields.body} disabled={disabled} onFocus={() => setTarget('body')} onChange={event => change({ ...fields, body: event.target.value })} /></label>
    <div className="admin-new-actions"><StudioButton className="admin-primary-button" disabled={disabled || props.saveState === 'saved' || props.saveState === 'saving'} onClick={props.onSave}>Save draft</StudioButton></div>
    <p role="status" aria-label="Sky draft save status">{props.saveState === 'saved' && props.publishedUnchanged ? 'Published copy unchanged.' : `${props.saveState === 'saved' ? 'Draft saved' : props.saveState === 'error' ? 'Draft save failed. Your edits are still here.' : props.saveState === 'saving' ? 'Saving draft…' : 'Unsaved changes'} · Changes are not published.`}</p>
    <p className="admin-field-hint">Drafts also save automatically as you write.</p>
    {issue && <p role="alert">{issue}</p>}
    <details className="admin-workspace-details" aria-label="Passage variable values">
      <AdminDisclosureSummary>How this article is assembled</AdminDisclosureSummary>
      <p>Captured values used in {fieldLabels[target]}.</p>
      {used.length ? used.map(name => { const saved = variables?.values[name]; const current = binding(name); return <details key={name} open>
        <AdminDisclosureSummary>{variableLabel(name)} · {`{{${name}}}`}</AdminDisclosureSummary>
        {saved ? <><p className="studio-variable-value studio-preview-canvas">{saved.text}</p><p>{saved.kind} · <code>{saved.source}</code></p>{saved.version && <details><AdminDisclosureSummary>Saved version</AdminDisclosureSummary><p><code>{saved.version}</code></p></details>}</> : <p role="status">No value captured for this token. Choose a complete value before saving.</p>}
        {current && (!saved || current.text !== saved.text || current.source !== saved.source || current.kind !== 'Calculated fact' && current.version !== saved.version) && <><p>Current source value</p><p className="studio-variable-value studio-preview-canvas">{current.text}</p><StudioButton disabled={disabled} onClick={() => change(fields, { ...variables?.values, [name]: current })}>Use current value for {name}</StudioButton></>}
      </details>; }) : <p>No variables in this field. Its complete wording is stored directly in the dated article.</p>}
      {!issue && <details><AdminDisclosureSummary>Resolved passage</AdminDisclosureSummary><div aria-label="Assembled dated article section"><p className="studio-variable-value studio-preview-canvas">{resolved?.[target] || 'No wording in this field.'}</p></div></details>}
    </details>
    <details className="admin-workspace-details" data-dated-article-variables onToggle={event => setVariablesOpen(event.currentTarget.open)}>
      <AdminDisclosureSummary>Article variables</AdminDisclosureSummary>
      <p>Tokens stay in this dated draft. Saving captures their complete values; publishing uses that resolved wording. Later shared-source edits do not rewrite the published article.</p>
      {loading && <p role="status">Loading article writing sources… Calculated placement names remain available.</p>}
      {error && <p role="alert">{error} <StudioButton onClick={() => setAttempt(value => value + 1)}>Retry article sources</StudioButton></p>}
      <StudioVariableInsert {...props.custom} context={owner} onRetry={props.custom.reload} onInsert={insert} disabled={disabled} />
      <SkyPlacementVariableKey facts={facts} usedNames={used} disabled={disabled} onInsert={insert} onInsertPhrase={insert}
        phraseSource={source && !loading && !error ? { planet: edition.planet, sign: edition.sign, record: owner, onLoadSource: key => loader.current(key), onEdit: id => {
          const shared = zodiacSeasonSourceKey(id, edition.sign);
          const reference = source.ingress?.sources[id]?.reference;
          props.onOpenSource(reference?.contentKey || shared || sourceKey, reference?.field ?? (shared ? 'body' : `ingress.sources.${id}`));
        } } : undefined} />
      <div className="admin-new-actions"><StudioButton disabled={calculating || disabled} onClick={() => {
        setCalculating(true); setCalculationError(''); setCalculated(null);
        const reference = props.engineFacts?.request?.referenceInstant ?? props.engineFacts?.generatedAt ?? new Date(Date.parse(edition.transitStartInstant) + 60_000).toISOString();
        void import('./skyIngressPreview').then(module => module.calculateSkyDatedArticlePreview(edition.planet, edition.sign, reference, timeZone))
          .then(result => {
            const instant = Date.parse(result.input.ingressOccurrence.asOfDate);
            if (instant < Date.parse(edition.transitStartInstant) || instant >= Date.parse(edition.transitEndInstant)) throw new Error('No calculated occurrence matches this dated article. The article wording is retained.');
            setCalculated(result.input);
          }).catch(reason => setCalculationError(reason.message)).finally(() => setCalculating(false));
      }}>{calculating ? 'Calculating…' : 'Calculate dated article values'}</StudioButton></div>
      {calculationError && <p role="alert">{calculationError}</p>}
      {calculated && <p role="status">Calculated reference: {calculated.ingressOccurrence.asOfDate} · {calculated.isRetrograde ? 'retrograde' : 'direct'} · {timeZone}</p>}
      <p className="admin-field-hint">Calculation follows this article’s {edition.validFrom} to {edition.validTo} window in {timeZone}. Reader date above selects the public reading separately. Dates and aspects require this calculation.</p>
      <details><AdminDisclosureSummary>Original compilation values</AdminDisclosureSummary>
        <p>These are the saved inputs to <code>{edition.templateKey}</code>. Later article edits may differ. Original values use edition_ tokens to distinguish them from current Sky calculations.</p>
        {Object.entries(edition.slotValues).map(([name, text]) => <details key={name}><AdminDisclosureSummary>{variableLabel(name)} · {`{{edition_${name}}}`}</AdminDisclosureSummary><p>{Object.hasOwn(props.engineFacts?.slotValues ?? {}, name) ? 'Original calculated value' : 'Original saved writing'} · <code>{edition.templateKey}#slotValues.{name}</code> · {edition.templateHash}</p><p className="studio-variable-value studio-preview-canvas">{text || 'No original value saved.'}</p><StudioButton disabled={disabled || !text.trim()} onClick={() => insert(`{{edition_${name}}}`)}>Insert original {name}</StudioButton></details>)}
      </details>
    </details>
  </>;
}
