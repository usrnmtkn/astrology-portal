import { studioVariableValue } from '../../web/src/content/studioCustomVariables.mjs';
import type { CompositionMapRow } from './compositionMap';

const object = (value: unknown): Record<string, any> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
const fields = ['headline', 'summary', 'body', 'body_you', 'body_they', 'text'];

/** Resolve custom writing only in a private display copy. Fact tokens and the
 * original source document stay intact; editing must use the original row.
 */
export function studioVariablePreviewRow(row: CompositionMapRow): CompositionMapRow {
  const sections = object(row.sections);
  const record = { ...object(sections.packageRecord), ...object(sections.packageDraft) };
  const variables = Array.isArray(record._studioVariables) ? record._studioVariables : [];
  if (!variables.length) return row;
  const customWords = new Map<string, string>(variables.filter(item => !item.builtin)
    .map(item => [item.name, studioVariableValue(item, record).value] as [string, string])
    .filter(([, value]) => Boolean(value.trim())));
  const render = <T extends string | null>(value: T): T => (typeof value !== 'string' ? value : value.replace(/\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/gu, (token, name) => {
    return customWords.get(name) ?? token;
  })) as T;
  const preview = (source: Record<string, any>) => ({ ...source,
    ...Object.fromEntries(fields.filter(field => typeof source[field] === 'string').map(field => [field, render(source[field])])),
    ...Object.fromEntries(['requiredSlots', 'optionalSlots'].filter(field => Array.isArray(source[field]))
      .map(field => [field, source[field].filter((name: string) => !customWords.has(name))]))
  });
  return { ...row, headline: render(row.headline), summary: render(row.summary), body: render(row.body), sections: {
    ...sections,
    ...(sections.packageRecord ? { packageRecord: preview(object(sections.packageRecord)) } : {}),
    ...(sections.packageDraft ? { packageDraft: preview(object(sections.packageDraft)) } : {})
  } };
}
