import { skyArticleEditionFieldChanges, type CompiledSkyArticleEdition, type SkyArticleEditableFields } from '../../web/src/content/skyArticleTemplateCompiler';
import { resolveSkyArticleVariableFields, type SkyArticleVariableDraft } from '../../../src/shared/skyArticleVariableDraft';

export function skyDatedArticleChanges(base: CompiledSkyArticleEdition, fields: SkyArticleEditableFields, variables?: SkyArticleVariableDraft | null, baseline?: SkyArticleVariableDraft | null) {
  let resolved = fields;
  try { resolved = resolveSkyArticleVariableFields(fields, variables); } catch { /* Unfinished sources remain visible as unsaved edits. */ }
  const changes = skyArticleEditionFieldChanges(base, resolved);
  if (JSON.stringify(variables ?? null) !== JSON.stringify(baseline ?? null)) changes.push({ fieldId: 'variableSources', label: 'Variable sources',
    before: baseline ? 'Saved article variable sources.' : 'No article variable sources saved.',
    after: 'Editable tokens and captured values are saved with this dated article. Readers receive the resolved wording shown in Draft preview.' });
  return changes;
}
