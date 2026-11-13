import catalog from '../_generated/studio-variables-v1.json' with { type: 'json' };
import { decodeStudioVariableCatalog } from '../../apps/admin/src/studioVariableCatalog.js';
import { studioVariableExportRows, packVariableExportRows } from '../../apps/admin/src/studioVariableExport.js';
import { servingPackageRecords } from './serving-package-records.js';
import { listStudioVariables, StudioVariableError } from './studio-variables.js';

type Storage = Parameters<typeof listStudioVariables>[0];
export async function studioVariableExportPage(storage: Storage, cursor = '0', sourceKey?: string) {
  if (!/^(?:0|[1-9]\d*)$/u.test(cursor)) throw new StudioVariableError('Invalid variable export cursor.');
  const variables = decodeStudioVariableCatalog(catalog).variables;
  const allKeys = [...new Set(variables.flatMap(variable => variable.sources.map(source => source.key)))].sort();
  if (sourceKey !== undefined && !allKeys.includes(sourceKey)) throw new StudioVariableError('This source is not in the variable catalog.');
  const keys = sourceKey ? [sourceKey] : allKeys;
  const offset = Number(cursor);
  if (!Number.isSafeInteger(offset) || offset > keys.length) throw new StudioVariableError('Invalid variable export cursor.');
  const selected = keys.slice(offset, offset + 25);
  const saved: any[] = [];
  async function readSources(sourceKeys: string[]) {
    for (let start = 0; start < sourceKeys.length; start += 25) for (let page = 0; ; page += 500) {
      const result = await storage(new URLSearchParams({ select: 'content_key,status,updated_at,headline,summary,body,sections',
        content_key: `in.(${sourceKeys.slice(start, start + 25).join(',')})`, status: 'neq.ARCHIVED', order: 'updated_at.desc,id.desc', limit: '500', offset: String(page) }));
      if (!result.ok || !Array.isArray(result.payload)) throw new StudioVariableError('Saved variable content could not load. Try the export again.', 502);
      saved.push(...result.payload);
      if (result.payload.length < 500) break;
      if (page >= 10000) throw new StudioVariableError('Too many source versions to export.', 413);
    }
  }
  await readSources(selected);
  // Shared prose references are one level deep by the ingress contract. Read
  // their saved revisions even when the target belongs to another export page.
  const dependencies = new Set<string>();
  const owners = [...selected.map(key => servingPackageRecords.get(key)), ...saved.flatMap(row => [row.sections?.packageRecord, row.sections?.packageDraft])];
  for (const owner of owners) for (const source of Object.values(owner?.ingress?.sources ?? {}) as any[]) {
    const key = source?.reference?.contentKey;
    if (typeof key === 'string' && servingPackageRecords.has(key) && !selected.includes(key)) dependencies.add(key);
  }
  await readSources([...dependencies].sort());
  const pageVariables = variables.map(variable => ({ ...variable, sources: variable.sources.filter(source => selected.includes(source.key)) }))
    .filter((variable, index) => variable.sources.length || !sourceKey && offset === 0 && variables[index].sources.length === 0);
  return { ok: true, schema: 'studio-variable-export/v1', generatedAt: new Date().toISOString(),
    definitionCount: variables.length, sourceCount: keys.length, completedSources: Math.min(offset + 25, keys.length),
    ...packVariableExportRows(studioVariableExportRows(pageVariables, servingPackageRecords, saved, !sourceKey && offset === 0 ? await listStudioVariables(storage) : [], !sourceKey && offset === 0)),
    nextCursor: offset + 25 < keys.length ? String(offset + 25) : null };
}
