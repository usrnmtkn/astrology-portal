import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { servingPackageRecords } from '../api/_lib/content-live-status.ts';
import { templateVariableReferences } from '../apps/admin/src/templateVariableReference.ts';
import { templateVariableSourceCandidates } from '../apps/admin/src/templateVariableSources.ts';
import { SKY_PLACEMENT_VARIABLES } from '../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementVariables.mjs';
import { SKY_INGRESS_VARIABLES, SKY_INGRESS_FIELDS } from '../apps/web/src/content/fallbackArchitectureV3/resolver/skyIngressComposition.mjs';
import { SKY_WRITING_LIBRARY_GROUPS } from '../apps/web/src/content/fallbackArchitectureV3/resolver/skyWritingLibraryRegistry.mjs';
import { ZODIAC_SEASON_VARIABLES, ZODIAC_SIGNS, zodiacSeasonSourceKey } from '../apps/web/src/content/fallbackArchitectureV3/resolver/zodiacSeasonVariables.mjs';
import { skyDailySummaryFields } from '../apps/web/src/content/skyDailySummaryCatalog.ts';
import { writingSurfaceAdminAccess } from '../apps/admin/src/writingSurfaceSourceMap.ts';
import type { StudioVariable, StudioVariableUsage, StudioVariableSource, StudioVariableCatalog } from '../apps/admin/src/studioVariableCatalog.ts';

const words = (value: string) => value.replace(/([a-z])([A-Z])/gu, '$1 $2').replace(/[./_-]+/gu, ' ').replace(/\b\w/gu, value => value.toUpperCase());
const surfaceFor = (key: string) => /(?:compat|synastry|composite|relationship|pair-daily)/u.test(key) ? 'Compatibility'
  : /(?:lunation|lunar|moon-|calendar|weekly)/u.test(key) ? 'Calendar'
  : /(?:natal|house-context|node-in|angle-in|placement-sentence)/u.test(key) ? 'Natal'
  : /(?:transit)/u.test(key) ? 'Personal transits' : /(?:sky)/u.test(key) ? 'Sky' : 'Shared templates';
const records = [...servingPackageRecords.values()];
const sourceRows = records.map(record => ({ id: record.contentKey, content_key: record.contentKey }));
const variables = new Map<string, StudioVariable>();
function add(name: string, kind: StudioVariable['kind'], description: string, source: string, usages: StudioVariableUsage[], sources: StudioVariableSource[] = [], single = false) {
  const token = single ? `{${name}}` : `{{${name}}}`;
  // Names can have different providers in different contracts; retain both.
  const id = [token, kind, source, description].join('|');
  const current = variables.get(id) ?? { id, name, token, kind, description, source, usages: [], sources: [] };
  current.usages = [...new Map([...current.usages, ...usages].map(item => [item.key, item])).values()];
  current.sources = [...new Map([...current.sources, ...sources].map(item => [`${item.key}#${item.field}`, item])).values()];
  variables.set(id, current);
}
const source = (key: string, field = 'body'): StudioVariableSource => ({ key, field, label: `${words(key.replace(/^fallback-(?:hook|vocab)\//u, ''))}` });
const placements = records.filter(record => /^sky-placement\/article\/[^/]+\/[^/]+$/u.test(record.contentKey));
const placementUsages = (composition = false) => placements.map(record => ({ key: record.contentKey + (composition ? '#ingress' : '#placementArticle'), label: `${words(record.contentKey.split('/').slice(2).join(' in '))} · ${composition ? 'Placement composition' : 'Placement article (shared, direct, retrograde)'}`, surface: 'Sky' }));
const articleUsages = placementUsages();
const compositionUsages = placementUsages(true);
const retrogradeUsages = records.filter(record => /^sky-placement\/retrograde\/[^/]+$/u.test(record.contentKey)).map(record => ({ key: record.contentKey + '#Body', label: `${words(record.contentKey)} · Body`, surface: 'Sky' }));
for (const fact of SKY_PLACEMENT_VARIABLES) add(fact.name, 'readonly', fact.description, fact.availability, [...articleUsages, ...compositionUsages, ...retrogradeUsages]);
for (const fact of SKY_INGRESS_VARIABLES) add(fact.name, 'readonly', fact.description, 'Calculated placement composition facts', compositionUsages);
const libraryFields = SKY_WRITING_LIBRARY_GROUPS.flatMap(group => group.fields);
for (const field of [...libraryFields, ...SKY_INGRESS_FIELDS.filter(field => !libraryFields.some(item => item.id === field.id))]) {
  const shared = ZODIAC_SEASON_VARIABLES.find(item => item.id === field.id);
  add(field.id, 'editable', field.description ?? `Named ${field.kind} prose in the placement composition.`, shared ? `Shared sign ${words(field.id)}` : `Writing Library · ${words(field.kind)}`,
    libraryFields.some(item => item.id === field.id) ? [...articleUsages, ...compositionUsages] : compositionUsages, shared ? ZODIAC_SIGNS.map(sign => source(zodiacSeasonSourceKey(field.id, sign)))
      : placements.map(record => source(record.contentKey, `ingress.sources.${field.id}`)));
}
for (const record of placements) for (const [name, value] of Object.entries(record.ingress?.sources ?? {}) as Array<[string, any]>) {
  if (libraryFields.some(field => field.id === name) || SKY_INGRESS_FIELDS.some(field => field.id === name)) continue;
  add(name, 'editable', `Named ${value.kind} prose defined by this placement.`, 'Custom placement prose',
    [{ key: record.contentKey, label: words(record.contentKey), surface: 'Sky' }], [source(record.contentKey, `ingress.sources.${name}`)]);
}
for (const record of records) {
  const key = record.contentKey;
  // Sky has its own strict contracts above. Only inspect reader fields, never editorial notes.
  if (/^sky-placement\/(?:article|retrograde)\//u.test(key)) continue;
  const fields = Object.fromEntries(['body', 'body_you', 'body_they', 'template', 'copy', 'headline', 'summary', 'requiredSlots', 'optionalSlots'].filter(field => record[field] !== undefined).map(field => [field, record[field]]));
  const refs = templateVariableReferences(fields, { ...fields, contentKey: key }, true);
  for (const ref of refs) {
    const shared = ZODIAC_SEASON_VARIABLES.find(field => field.id === ref.name);
    const candidates = ref.sourceKind === 'saved-copy' ? templateVariableSourceCandidates(ref, sourceRows, key) : [];
    add(ref.name, ref.sourceKind === 'runtime' ? 'readonly' : ref.sourceKind === 'saved-copy' ? 'editable' : 'unmapped',
      shared?.description ?? ref.meaning, shared ? `Shared sign ${words(ref.name)}` : ref.source,
      [{ key, label: words(key), surface: surfaceFor(key) }], candidates.map(row => source(row.content_key)));
  }
}
for (const field of skyDailySummaryFields) for (const name of field.allowedSlots) {
  const prose = /(?:Summary|Sentence|Paragraph|Meaning)$/u.test(name);
  add(name, 'readonly', prose ? 'Assembled from the saved summary passages and calculated context. Edit those passages in Daily Sky Summary.' : `Calculated ${words(name).toLowerCase()} for this summary field.`, 'Daily Sky Summary · single braces',
    [{ key: field.key, label: field.label, surface: 'Daily Sky Summary' }], [], true);
}
for (const access of Object.values(writingSurfaceAdminAccess)) for (const starter of access.cmsStarters ?? []) for (const name of starter.allowedSlots) {
  add(name, 'readonly', `The ${words(name).toLowerCase()} supplied by this surface's runtime context.`, 'CMS surface template context',
    [{ key: starter.contentKey, label: access.readerLocation, surface: surfaceFor(starter.contentKey) }]);
}
export const studioVariableCatalog: StudioVariableCatalog = { schema: 'studio-variables/v1', variables: [...variables.values()].sort((a, b) => a.name.localeCompare(b.name) || a.source.localeCompare(b.source)) };
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const app of ['admin', 'web']) {
  const directory = path.join(root, 'apps', app, 'public/generated');
  await mkdir(directory, { recursive: true });
  const usages = [...new Map(studioVariableCatalog.variables.flatMap(variable => variable.usages).map(item => [JSON.stringify(item), item])).values()];
  const sources = [...new Map(studioVariableCatalog.variables.flatMap(variable => variable.sources).map(item => [JSON.stringify(item), item])).values()];
  const usageIds = new Map(usages.map((item, index) => [JSON.stringify(item), index]));
  const sourceIds = new Map(sources.map((item, index) => [JSON.stringify(item), index]));
  const payload = { schema: studioVariableCatalog.schema, usages, sources, variables: studioVariableCatalog.variables.map(variable => ({ ...variable,
    usages: variable.usages.map(item => usageIds.get(JSON.stringify(item))), sources: variable.sources.map(item => sourceIds.get(JSON.stringify(item))) })) };
  await writeFile(path.join(directory, 'studio-variables-v1.json'), JSON.stringify(payload) + '\n');
}
console.log(`Built Studio variable catalog: ${variables.size} contextual variable definitions.`);
