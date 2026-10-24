import type { SkyArticleEditableFields } from '../../apps/web/src/content/skyArticleTemplateCompiler';

export type SkyArticleVariableBinding = { text: string; kind: string; source: string; version?: string };
export type SkyArticleVariableDraft = {
  schema: 'sky-article-variable-draft-v1';
  templates: Pick<SkyArticleEditableFields, 'headline' | 'tldr' | 'body'>;
  values: Record<string, SkyArticleVariableBinding>;
};
export const skyArticleVariableFields = ['headline', 'tldr', 'body'] as const;
export const skyArticleVariableTokens = (text: string) => [...text.matchAll(/\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/gu)];
const safeName = (name: string) => /^[A-Za-z][A-Za-z0-9_]*$/u.test(name) && !['constructor', 'prototype', '__proto__'].includes(name);

export function skyArticleVariableDraftRecord(value: unknown): SkyArticleVariableDraft | null {
  if (!value || typeof value !== 'object') return null;
  const draft = value as SkyArticleVariableDraft;
  if (draft.schema !== 'sky-article-variable-draft-v1' || !draft.templates || !draft.values
    || skyArticleVariableFields.some(field => typeof draft.templates[field] !== 'string')
    || Object.keys(draft.values).length > 250
    || Object.entries(draft.values).some(([name, binding]) => !safeName(name) || !binding || typeof binding.text !== 'string'
      || typeof binding.kind !== 'string' || typeof binding.source !== 'string'
      || binding.version !== undefined && typeof binding.version !== 'string')) return null;
  return { schema: draft.schema, templates: Object.fromEntries(skyArticleVariableFields.map(field => [field, draft.templates[field]])) as SkyArticleVariableDraft['templates'],
    values: Object.fromEntries(Object.entries(draft.values).map(([name, binding]) => [name, { text: binding.text, kind: binding.kind, source: binding.source, ...(binding.version ? { version: binding.version } : {}) }])) };
}

/** Dated articles publish complete snapshots. Raw tokens stay in private editor metadata. */
export function resolveSkyArticleVariableFields(fields: SkyArticleEditableFields, draft?: SkyArticleVariableDraft | null): SkyArticleEditableFields {
  if (!draft) return fields;
  const result = { ...fields };
  for (const field of skyArticleVariableFields) {
    result[field] = fields[field].replace(/\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/gu, (token, name) => {
      const value = safeName(name) && Object.hasOwn(draft.values, name) ? draft.values[name]?.text : undefined;
      if (!value?.trim() || /\{\{|\}\}/u.test(value)) throw new Error(`${token} needs a complete value. Choose it in Article variables before saving.`);
      return value;
    });
    if (/\{\{|\}\}/u.test(result[field])) throw new Error('Use complete named variables from Article variables. Conditional blocks are not supported in dated articles.');
  }
  return result;
}

export function skyArticleVariableDraftForFields(fields: SkyArticleEditableFields, values: SkyArticleVariableDraft['values']): SkyArticleVariableDraft {
  const templates = { headline: fields.headline, tldr: fields.tldr, body: fields.body };
  const used = new Set(skyArticleVariableTokens(Object.values(templates).join('\n')).map(match => match[1]));
  return { schema: 'sky-article-variable-draft-v1', templates, values: Object.fromEntries(Object.entries(values).filter(([name]) => used.has(name))) };
}
