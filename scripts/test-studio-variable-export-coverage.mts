import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { decodeStudioVariableCatalog } from '../apps/admin/src/studioVariableCatalog.ts';
import { studioVariableExportRows, packVariableExportRows, expandVariableExportRows } from '../apps/admin/src/studioVariableExport.ts';
import { servingPackageRecords } from '../api/_lib/serving-package-records.ts';
import {studioVariableExportPage} from '../api/_lib/studio-variable-export.ts';
import {createHash} from 'node:crypto';

const read = async (file: string) => JSON.parse(await readFile(file, 'utf8'));
const catalogJson = await read('api/_generated/studio-variables-v1.json');
const catalog = decodeStudioVariableCatalog(catalogJson).variables;

// The page and export use the same complete catalog. Independently scan reader
// fields as well as declared dependencies so two incomplete generated lists
// cannot agree with each other and silently pass.
const listed = new Set(catalog.map(variable => variable.name));
const missing = (catalogJson.reservedNames as string[]).filter(name => !listed.has(name));
assert.deepEqual(missing, [], `Template variables missing from the catalog: ${missing.join(', ')}`);
function scan(value: unknown, key: string, path: string) {
  if (typeof value === 'string') for (const match of value.matchAll(/\{\{\s*[#\/^]?\s*([\w.-]+)\s*\}\}/gu)) {
    if (match[1] !== '.') assert(listed.has(match[1]), `${key}#${path}: ${match[1]} is missing from the catalog`);
  }
  else if (Array.isArray(value)) value.forEach((item, index) => scan(item, key, `${path}.${index}`));
  else if (value && typeof value === 'object') for (const [field, item] of Object.entries(value)) scan(item, key, `${path}.${field}`);
}
for (const record of servingPackageRecords.values()) {
  for (const field of ['body','body_you','body_they','headline','summary','template','copy','question','title','tagline','focus','strategy','opening','tension','development','close','placementArticle','placementArticleDirect','placementArticleRetrograde','fallback']) scan(record[field], record.contentKey, field);
  for (const name of [...(record.requiredSlots ?? []), ...(record.optionalSlots ?? [])]) assert(listed.has(name), `${record.contentKey} declares missing ${name}`);
  for (const module of record.ingress?.modules ?? []) scan(module.template, record.contentKey, `ingress.modules.${module.id}.template`);
  for (const [name, source] of Object.entries(record.ingress?.sources ?? {}) as [string, any][]) {
    assert(listed.has(name), `${record.contentKey} defines missing ${name}`);
    scan(source.text, record.contentKey, `ingress.sources.${name}.text`);
  }
}
assert(catalog.every(variable => variable.kind !== 'unmapped'));
assert(catalog.every(variable => variable.usages.every(usage => Array.isArray(usage.fields))));
assert(catalog.filter(variable => variable.retired).some(variable => variable.name === 'placementLine'));
for (const name of ['personSubject','personPreferredName','nameA','nameB','dateLine']) assert(catalog.some(variable => variable.name === name && variable.kind === 'readonly' && !variable.source.includes('No canonical')));

// The export carries the natal template writing with its saved text.
const writing = catalog.filter(variable => ['houseMeaning','placementHouseSentences','modifierSentences','planetIntro','natalCore','articleHeadline'].includes(variable.name));
const rows = studioVariableExportRows(writing, servingPackageRecords, [], [], true);
assert.deepEqual(expandVariableExportRows(packVariableExportRows(rows)),rows,'Transport deduplication preserves every exported field');
assert.throws(() => expandVariableExportRows({rows:[{fieldContract:99}],fieldContracts:['body']}),/incomplete/u);
const rowsFor = (token: string) => rows.filter(row => row.token === token);
const houseMeaning = rowsFor('{{houseMeaning}}');
assert.equal(new Set(houseMeaning.map(row => row.sourceKey)).size, 12, 'houseMeaning covers all 12 houses');
assert(houseMeaning.every(row => row.type === 'Saved writing' && row.contentStatus === 'Has content'));
for (const row of rows) if (row.version === 'Package') assert.equal(row.content, row.field.split('.').reduce((record: any, field) => record?.[field], servingPackageRecords.get(row.sourceKey)), `${row.sourceKey}#${row.field} preserves exact writing`);
const placementHouse = rowsFor('{{placementHouseSentences}}');
assert(placementHouse.some(row => row.audience === 'You') && placementHouse.some(row => row.audience === 'They'), 'placementHouseSentences exports You and They');
for (const token of ['{{modifierSentences}}', '{{planetIntro}}', '{{natalCore}}']) assert(rowsFor(token).some(row => row.contentStatus === 'Has content'), `${token} exports saved text`);
assert(rowsFor('{{articleHeadline}}').every(row => row.field === 'headline'));
const legacyKey='fallback-hook/house-meaning/4';
const legacyText='Synthetic complete legacy opening.\n\nSynthetic complete legacy final sentence.';
const legacyRows=studioVariableExportRows(writing.filter(variable=>variable.name==='houseMeaning'),servingPackageRecords,[
  {content_key:legacyKey,status:'DRAFT',updated_at:'2026-11-13T12:00:00Z',body:legacyText,sections:{}}
]);
assert.equal(legacyRows.filter(row=>row.sourceKey===legacyKey&&row.version==='Saved draft'&&row.field==='body'&&row.content===legacyText).length,1,'Legacy body-only saves export their actual complete field once');

// A shared reference is text, not serialized source JSON. Resolve the pinned
// target from the same version; stale hashes are explicit failures, not prose.
const ownerKey = 'sky-placement/article/sun/virgo', targetKey = 'sky-placement/article/sun/aries';
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
const originalText = 'Synthetic complete first paragraph.\n\nSynthetic complete final sentence.';
const newerText = originalText + '\n\nSynthetic saved target final paragraph.';
const target = {contentKey:targetKey, ingress:{sources:{planetRole:{kind:'planet',text:originalText}}}};
const reference = {contentKey:targetKey,field:'ingress.sources.planetRole',sha256:hash(originalText)};
const owner = {contentKey:ownerKey,ingress:{sources:{planetRole:{kind:'planet',reference}}}};
const variable = catalog.find(variable => variable.name === 'planetRole')!;
const fixture = {...variable,sources:[{key:ownerKey,field:'ingress.sources.planetRole',label:'Synthetic reference'}]};
const records = new Map<string,any>([[ownerKey,owner],[targetKey,target]]);
const exported = studioVariableExportRows([fixture],records,[]);
assert.equal(exported[0].content,originalText);
assert.deepEqual(JSON.parse(exported[0].reference),reference);
assert(exported[0].allowedFields.includes('ingress.modules.*.template'));
const draftReference = {...reference,sha256:hash(newerText)};
const drafts = [
  {content_key:ownerKey,status:'DRAFT',updated_at:'2026-11-13T12:00:00Z',sections:{packageDraft:{...owner,ingress:{sources:{planetRole:{kind:'planet',reference:draftReference}}}}}},
  {content_key:targetKey,status:'DRAFT',updated_at:'2026-11-13T12:00:00Z',sections:{packageDraft:{...target,ingress:{sources:{planetRole:{kind:'planet',text:newerText}}}}}}
];
assert.equal(studioVariableExportRows([fixture],records,drafts).find(row => row.version === 'Saved draft')?.content,newerText);
const stale = studioVariableExportRows([fixture],records,[drafts[1],{...drafts[0],sections:{packageDraft:owner}}]);
assert.match(stale.find(row => row.version === 'Saved draft')?.contentStatus ?? '',/Unresolved reference/u);
assert.equal(stale.find(row => row.version === 'Saved draft')?.content,'');
const signKey='sky-placement/article/moon/virgo';
const signText='Synthetic complete shared sign opening.\n\nSynthetic shared sign final sentence.';
const signTarget={contentKey:signKey,ingress:{sources:{signRole:{kind:'sign',text:signText}}}};
const signReference={contentKey:signKey,field:'ingress.sources.signRole',sha256:hash(signText)};
const signOwner={contentKey:ownerKey,ingress:{sources:{signRole:{kind:'sign',reference:signReference}}}};
const signVariable={...fixture,name:'signRole',token:'{{signRole}}',sources:[{key:ownerKey,field:'ingress.sources.signRole',label:'Synthetic sign reference'}]};
const signRows=studioVariableExportRows([signVariable],new Map([[ownerKey,signOwner],[signKey,signTarget]]),[]);
assert.equal(signRows[0].content,signText);
assert.deepEqual(JSON.parse(signRows[0].reference),signReference);

// Exercise the server page's reference-dependency reads across page boundaries.
const previousOwner = servingPackageRecords.get(ownerKey), previousTarget = servingPackageRecords.get(targetKey);
const reads: string[] = [];
try {
  servingPackageRecords.set(ownerKey,owner); servingPackageRecords.set(targetKey,target);
  const storage:any = async (query:URLSearchParams) => {
    const filter = query.get('content_key') ?? ''; reads.push(filter);
    return {ok:true,payload:drafts.filter(row => filter.slice(4,-1).split(',').includes(row.content_key))};
  };
  const page = await studioVariableExportPage(storage,'0',ownerKey);
  assert(reads.some(filter => filter === `in.(${targetKey})`),'Saved reference targets are read even outside the selected source page');
  assert(page.rows.some(row => row.token === '{{planetRole}}' && row.sourceKey === ownerKey && row.version === 'Saved draft' && row.content === newerText));
} finally {
  servingPackageRecords.set(ownerKey,previousOwner); servingPackageRecords.set(targetKey,previousTarget);
}
console.log(`PASS: all ${listed.size} names are in the catalog; exact saved hooks, field contracts, providers, retired slots and pinned shared-reference exports are covered.`);
