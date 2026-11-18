import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { servingPackageRecords } from '../api/_lib/content-live-status.ts';
import { templateVariableReferences } from '../apps/admin/src/templateVariableReference.ts';
import { templateVariableSourceCandidates } from '../apps/admin/src/templateVariableSources.ts';
import { SKY_PLACEMENT_VARIABLES } from '../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementVariables.mjs';
import { SKY_INGRESS_VARIABLES, SKY_INGRESS_FIELDS } from '../apps/web/src/content/fallbackArchitectureV3/resolver/skyIngressComposition.mjs';
import { SKY_WRITING_LIBRARY_GROUPS } from '../apps/web/src/content/fallbackArchitectureV3/resolver/skyWritingLibraryRegistry.mjs';
import { ZODIAC_SEASON_VARIABLES, ZODIAC_SIGNS, zodiacSeasonSourceKey, supportsZodiacSeasonVariables } from '../apps/web/src/content/fallbackArchitectureV3/resolver/zodiacSeasonVariables.mjs';
import { natalPlacementVariableNames } from '../apps/web/src/content/fallbackArchitectureV3/resolver/natalPlacementVariables.mjs';
import { natalRetrogradeBodies, natalRetrogradeModifierKey } from '../apps/web/src/content/natalRetrogradeModifier.js';
import { skyDailySummaryFields } from '../apps/web/src/content/skyDailySummaryCatalog.ts';
import { skyDebilityFields } from '../apps/web/src/content/skyDebilityCatalog.ts';
import { frictionFlowFields } from '../apps/web/src/content/frictionFlowCatalog.ts';
import { wheelTooltipFields } from '../apps/web/src/content/wheelTooltipCatalog.ts';
import { calendarPassageVariables, calendarPassageKey } from '../src/calendar-writing/passageContract.ts';
import { writingSurfaceAdminAccess } from '../apps/admin/src/writingSurfaceSourceMap.ts';
import type { StudioVariable, StudioVariableUsage, StudioVariableSource, StudioVariableCatalog } from '../apps/admin/src/studioVariableCatalog.ts';

const words = (value: string) => value.replace(/([a-z])([A-Z])/gu, '$1 $2').replace(/[./_-]+/gu, ' ').replace(/\b\w/gu, value => value.toUpperCase());
const surfaceFor = (key: string) => /(?:compat|synastry|composite|relationship|pair-daily)/u.test(key) ? 'Compatibility'
  : /(?:lunation|lunar|moon-|calendar|weekly)/u.test(key) ? 'Calendar'
  : /(?:natal|house-context|house-meaning|node-in|angle-in|placement-(?:house-)?sentence)/u.test(key) ? 'Natal'
  : /(?:transit)/u.test(key) ? 'Personal transits' : /(?:sky)/u.test(key) ? 'Sky' : 'Shared templates';
const records = [...servingPackageRecords.values()];
const sourceRows = records.map(record => ({ id: record.contentKey, content_key: record.contentKey }));
const variables = new Map<string, StudioVariable>();
// Owner direction: retain the approved V2 empty-house rows and list their slots
// as retired. The shared retrograde template is also retained as history: main's
// scoped planet/house additions replaced its runtime use without rewriting it.
const retiredKeys = new Set(['fallback-hook/empty-house-placement', 'fallback-hook/empty-house-ruler', 'fallback-template/natal.modifier.retrograde']);
function usageFields(record: any, reference: ReturnType<typeof templateVariableReferences>[number]) {
  const fields = new Set(reference.fields.filter(field => !['Resolver dependency', 'Available for insertion'].includes(field)));
  if (natalPlacementVariableNames(record.contentKey).includes(reference.name)
    || ZODIAC_SEASON_VARIABLES.some(field => field.id === reference.name) && supportsZodiacSeasonVariables(record)) {
    for (const field of ['body', 'body_you', 'body_they']) if (typeof record[field] === 'string') fields.add(field);
  }
  return [...fields].sort();
}
function add(name: string, kind: StudioVariable['kind'], description: string, source: string, usages: StudioVariableUsage[], sources: StudioVariableSource[] = [], single = false, tokenOverride?: string) {
  const token = tokenOverride ?? (single ? `{${name}}` : `{{${name}}}`);
  // Names can have different providers in different contracts; retain both.
  const id = [token, kind, source, description].join('|');
  const current = variables.get(id) ?? { id, name, token, kind, description, source, usages: [], sources: [] };
  for (const item of usages) {
    const previous = current.usages.find(usage => usage.key === item.key);
    if (previous) previous.fields = [...new Set([...(previous.fields ?? []), ...(item.fields ?? [])])].sort();
    else current.usages.push({...item, fields: item.fields ?? ['body']});
  }
  current.sources = [...new Map([...current.sources, ...sources].map(item => [`${item.key}#${item.field}`, item])).values()];
  variables.set(id, current);
}
const source = (key: string, field = 'body'): StudioVariableSource => ({ key, field, label: `${words(key.replace(/^fallback-(?:hook|vocab)\//u, ''))}` });
const placements = records.filter(record => /^sky-placement\/article\/[^/]+\/[^/]+$/u.test(record.contentKey));
const placementUsages = (composition = false) => placements.map(record => ({ key: record.contentKey + (composition ? '#ingress' : '#placementArticle'), label: `${words(record.contentKey.split('/').slice(2).join(' in '))} · ${composition ? 'Placement composition' : 'Placement article (shared, direct, retrograde)'}`, surface: 'Sky',
  fields: composition ? ['ingress.modules.*.template'] : ['tldrWhat', 'tldrTakeaway', 'placementArticle', 'placementArticleDirect', 'placementArticleRetrograde', 'fallback.hook', 'fallback.lived', 'fallback.turn', 'fallback.sections.*'] }));
const articleUsages = placementUsages();
const compositionUsages = placementUsages(true);
const retrogradeUsages = records.filter(record => /^sky-placement\/retrograde\/[^/]+$/u.test(record.contentKey)).map(record => ({ key: record.contentKey + '#Body', label: `${words(record.contentKey)} · Body`, surface: 'Sky', fields: ['Body'] }));
const compositionFactUsages = compositionUsages.map(usage => ({...usage, fields:[...usage.fields, 'ingress.sources.*.text']}));
for (const fact of SKY_PLACEMENT_VARIABLES) add(fact.name, 'readonly', fact.description, fact.availability, [...articleUsages, ...compositionFactUsages, ...retrogradeUsages]);
for (const fact of SKY_INGRESS_VARIABLES) add(fact.name, 'readonly', fact.description, 'Calculated placement composition facts', compositionFactUsages);
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
  const fields = Object.fromEntries(['body', 'body_you', 'body_they', 'template', 'copy', 'headline', 'summary', 'question', 'title', 'tagline', 'focus', 'strategy', 'opening', 'tension', 'development', 'close', 'requiredSlots', 'optionalSlots'].filter(field => record[field] !== undefined).map(field => [field, record[field]]));
  const refs = templateVariableReferences(fields, { ...fields, contentKey: key }, true);
  for (const ref of refs) {
    const shared = ZODIAC_SEASON_VARIABLES.find(field => field.id === ref.name);
    const candidates = ref.sourceKind === 'saved-copy' ? templateVariableSourceCandidates(ref, sourceRows, key).filter(row => !retiredKeys.has(row.content_key)) : [];
    add(ref.name, ref.sourceKind === 'runtime' ? 'readonly' : ref.sourceKind === 'saved-copy' ? 'editable' : 'unmapped',
      shared?.description ?? ref.meaning, shared ? `Shared sign ${words(ref.name)}` : ref.source,
      [{ key, label: words(key), surface: surfaceFor(key), fields: usageFields(record, ref), dependency: ref.fields.includes('Resolver dependency'), retired: retiredKeys.has(key) }],
      candidates.map(row => source(row.content_key, ref.name === 'articleHeadline' ? 'headline' : 'body')));
  }
}
const ownerName = templateVariableReferences({body_they:'{{ownerName}}'})[0];
add(ownerName.name,'readonly',ownerName.meaning,ownerName.source,[{key:'fallback-hook/natal-you-placement-complete-final/{planet}/{sign}/{house}/{motion}',label:'Exact natal placement · Friend passage',surface:'Natal',fields:['body_they']}]);
for (const planet of natalRetrogradeBodies) for (let house=1;house<=12;house++) {
  const key=natalRetrogradeModifierKey(planet,house)!;
  add(ownerName.name,'readonly',ownerName.meaning,ownerName.source,[{key,label:words(key),surface:'Natal',fields:['body_they']}]);
}
for (const field of skyDailySummaryFields) for (const name of field.allowedSlots) {
  const prose = /(?:Summary|Sentence|Paragraph|Meaning)$/u.test(name);
  add(name, 'readonly', prose ? 'Assembled from the saved summary passages and calculated context. Edit those passages in Daily Sky Summary.' : `Calculated ${words(name).toLowerCase()} for this summary field.`, 'Daily Sky Summary · single braces',
    [{ key: field.key, label: field.label, surface: 'Daily Sky Summary' }], [], true);
}
for (const [surface, fields, single] of [
  ['Sky dignity', skyDebilityFields, true], ['Friction and flow', frictionFlowFields, true], ['Chart wheel tooltips', wheelTooltipFields, false]
] as const) for (const field of fields) for (const name of field.allowedSlots) {
  add(name, 'readonly', `The ${words(name).toLowerCase()} supplied to this ${surface.toLowerCase()} field.`, `${surface} runtime context`,
    [{key:field.key,label:field.label,surface}], [], single);
}
for (const name of calendarPassageVariables) {
  const condition = /^has[A-Z]/u.test(name);
  add(name, 'readonly', condition ? `Includes the enclosed wording when ${words(name).replace(/^Has /u, '').toLowerCase()} is present in the selected period.`
    : `The ${words(name).toLowerCase()} supplied by Calendar for the selected date, period and time zone.`,
    condition ? 'Calendar condition' : 'Calendar passage context',
    (['daily','weekly','monthly'] as const).map(period=>({key:calendarPassageKey(period),label:`${words(period)} Calendar passage`,surface:'Calendar'})),
    [], false, condition ? `{{#${name}}}…{{/${name}}}` : undefined);
}
for (const access of Object.values(writingSurfaceAdminAccess)) for (const starter of access.cmsStarters ?? []) for (const name of starter.allowedSlots) {
  add(name, 'readonly', `The ${words(name).toLowerCase()} supplied by this surface's runtime context.`, 'CMS surface template context',
    [{ key: starter.contentKey, label: access.readerLocation, surface: surfaceFor(starter.contentKey) }]);
}
const unmapped = [...variables.values()].filter(variable => variable.kind === 'unmapped');
if (unmapped.length) throw new Error(`Document template providers before building the catalog: ${[...new Set(unmapped.map(variable => variable.name))].join(', ')}`);
export const studioVariableCatalog: StudioVariableCatalog = { schema: 'studio-variables/v1', variables: [...variables.values()]
  .map(variable => { const reference = templateVariableReferences({ Body: variable.token })[0];
    const sources = variable.sources.flatMap(item => {
      const record = servingPackageRecords.get(item.key);
      if (item.field !== 'body' || !record) return [item];
      const fields = ['body', 'body_you', 'body_they', 'copy', 'template', 'opening', 'tension', 'development', 'close'].filter(field => typeof record[field] === 'string');
      return fields.length ? fields.map(field => ({...item, field, label: `${item.label} · ${field}`})) : [item];
    });
    return { ...variable, sources: [...new Map(sources.map(item => [`${item.key}#${item.field}`, item])).values()],
      retired: variable.usages.length > 0 && variable.usages.every(usage => usage.retired), example: reference?.example ?? '' }; })
  .sort((a, b) => a.name.localeCompare(b.name) || a.source.localeCompare(b.source)) };
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await mkdir(path.join(root, 'api/_generated'), { recursive: true });
await writeFile(path.join(root, 'api/_generated/studio-variable-names.json'), JSON.stringify([...new Set([...variables.values()].map(variable => variable.name))].sort(), null, 2) + '\n');
for (const app of ['admin', 'web']) {
  const directory = path.join(root, 'apps', app, 'public/generated');
  await mkdir(directory, { recursive: true });
  const usages = [...new Map(studioVariableCatalog.variables.flatMap(variable => variable.usages).map(item => [JSON.stringify(item), item])).values()];
  const sources = [...new Map(studioVariableCatalog.variables.flatMap(variable => variable.sources).map(item => [JSON.stringify(item), item])).values()];
  const usageIds = new Map(usages.map((item, index) => [JSON.stringify(item), index]));
  const sourceIds = new Map(sources.map((item, index) => [JSON.stringify(item), index]));
  const payload = { schema: studioVariableCatalog.schema, reservedNames: [...new Set([...variables.values()].map(variable => variable.name))].sort(), usages, sources, variables: studioVariableCatalog.variables.map(variable => ({ ...variable,
    usages: variable.usages.map(item => usageIds.get(JSON.stringify(item))), sources: variable.sources.map(item => sourceIds.get(JSON.stringify(item))) })) };
  await writeFile(path.join(directory, 'studio-variables-v1.json'), JSON.stringify(payload) + '\n');
  if (app === 'admin') await writeFile(path.join(root, 'api/_generated/studio-variables-v1.json'), JSON.stringify(payload) + '\n');
}
console.log(`Built Studio variable catalog: ${studioVariableCatalog.variables.length} contextual variable definitions.`);
