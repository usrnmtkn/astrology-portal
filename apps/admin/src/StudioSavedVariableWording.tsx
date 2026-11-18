import { studioVariableValue } from '../../web/src/content/studioCustomVariables.mjs';
import { studioVariableEditorHref, type CustomVariable } from './studioCustomVariableClient';
import { StudioButton } from './StudioControls';
import { PageLoading } from '../../../src/shared/components/PageLoading';

export default function StudioSavedVariableWording({ variables, values, unmappedNames, context, onReload, disabled = false }: {
  variables: CustomVariable[]; values: string[]; unmappedNames: string[]; context: Record<string, any>; onReload: () => void; disabled?: boolean;
}) {
  const names = new Set(values.flatMap(value => [...value.matchAll(/\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/gu)].map(match => match[1])));
  const used = variables.filter(variable => names.has(variable.name));
  if (!used.length && !unmappedNames.some(name => names.has(name))) return null;
  const loading=Boolean(context._studioVariablesLoading);
  const error=typeof context._studioVariablesError==='string' ? context._studioVariablesError : '';
  return <section className="studio-section studio-surface" aria-label="My saved wording used here">
    {used.length > 0 && <p>These words come from your saved variables. Open the complete value and its overrides in a separate tab; this draft stays open. Existing publications keep their approved values.</p>}
    {loading && <PageLoading compact message="Loading your saved wording…" />}
    {error && <div role="alert"><p>Your saved wording could not load.{used.length ? ' The last loaded values are shown below.' : ''}</p>
      <StudioButton disabled={disabled || loading} onClick={onReload}>Retry my saved wording</StudioButton></div>}
    {!loading && !error && !used.length && <p>No saved variables match this draft.</p>}
    {used.map(variable => {
      const resolved = studioVariableValue(variable, context);
      return <div key={variable.id} className="studio-context-panel" role="group" aria-label={`${variable.label} saved wording`}>
        <p><strong>{variable.label}</strong> <code>{`{{${variable.name}}}`}</code></p>
        <p className="admin-field-hint">{resolved.scope === 'shared' ? 'Shared value' : `${resolved.scope} override`}</p>
        <p className="studio-variable-value studio-preview-canvas">{resolved.value || 'No wording is saved for this context.'}</p>
        <a className="admin-source-action" href={studioVariableEditorHref(variable.name)} target="_blank" rel="noopener noreferrer" aria-disabled={disabled}
          onClick={event => { if (disabled) event.preventDefault(); }}>Edit {variable.label} in Variables</a>
      </div>;
    })}
    {used.length > 0 && <StudioButton disabled={disabled || loading} onClick={onReload}>Reload my saved wording</StudioButton>}
  </section>;
}
