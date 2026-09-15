import { servingPackageRecords } from "../../api/_lib/content-live-status";
// Actual handler, isolated storage, realistic latest-first/limit-one reads.
import { createApiStore } from './calendar-review-api.mjs';
import { skyPlacementSourceRecords } from '../../api/_lib/sky-placement-sources';
const key = 'sky-placement/article/sun/virgo';
const record = { ...structuredClone(skyPlacementSourceRecords.get(key)), placementArticle: 'During this transit, fixture existing article.',
 owner_approved: true, serving_enabled: true, review_status: 'approved' };
record.fallback.hook = 'During this transit, fixture governed opening.';
record.tldrTakeaway = 'Fixture governed ending.';
const live = { id: 'live-sun-virgo', content_key: key, surface: 'sky', mode: 'in_depth', status: 'LIVE', lane: 'serving', review_state: null,
 event_type: 'fallback-hook', block_type: 'fallback_hook', provider: 'tldrastro-fallback-architecture-v3', headline: record.headline, summary: record.summary, body: record.placementArticle,
 sections: { packageRecord: record }, facts: { fallbackArchitectureV3: true }, source_snapshot: { sourcePackage: record.source_package, content_role: record.content_role },
 updated_at: '2026-09-14T00:55:45.864Z', target_date: null };
const revision = { ...structuredClone(live), id: 'revision-sun-virgo', mode: 'studio-draft', lane: 'reference',
 status: process.env.SKY_SAVE_LEGACY_DRAFT ? 'DRAFT' : 'ARCHIVED', review_state: process.env.SKY_SAVE_LEGACY_DRAFT ? 'owner-review-required' : 'published-revision',
 event_type: 'sky-v4-reader-copy-draft', updated_at: '2026-09-14T00:55:46.035Z',
 sections: { packageRecord: { ...structuredClone(record), owner_approved: false, serving_enabled: false }, packageDraft: structuredClone(record) },
 source_snapshot: { ...live.source_snapshot, targetRowId: live.id, targetRowUpdatedAt: process.env.SKY_SAVE_LEGACY_DRAFT ? live.updated_at : '2026-09-14T00:50:00.000Z' } };
const template = structuredClone(servingPackageRecords.get('fallback-template/natal.angle-in-sign')!);
template.body = 'Fixture {{signTitle}}. TARGET';
const templateRow = {...structuredClone(live), id: 'fixture-natal-template', content_key: template.contentKey, surface: 'natal', event_type: 'fallback-template', block_type: 'fallback_template', headline: 'Fixture sign-aware template', body: template.body, sections: {packageRecord: template}, source_snapshot: {sourcePackage: 'tldrastro-fallback-architecture-v3', content_role: 'template'}};
export const store = await createApiStore(process.env.ZODIAC_TEMPLATE_FIXTURE ? [templateRow] : [revision, live]);
const matches = (row: any, params: URLSearchParams) => [...params].every(([field, value]) => {
 if (['select', 'order', 'limit', 'offset', 'on_conflict'].includes(field)) return true;
 if (value === 'is.null') return row[field] == null;
 if (value.startsWith('like.')) return String(row[field] ?? '').startsWith(value.slice(5).replace(/\*$/u, ''));
 if (value.startsWith('eq.')) return String(row[field] ?? '') === value.slice(3);
 if (value.startsWith('neq.')) return String(row[field] ?? '') !== value.slice(4);
 if (value.startsWith('in.(')) return value.slice(4, -1).split(',').map(v => v.replaceAll('"', '')).includes(String(row[field]));
 throw new Error(`Unmodeled storage filter ${field}=${value}`);
});
globalThis.fetch = async (input: any, options: any = {}) => {
 const url = new URL(String(input));
 if (url.origin !== 'https://calendar-api.invalid') throw new Error('Fixture refuses external storage');
 if (url.pathname === '/rest/v1/content_publications') return Response.json([...store.rows.values()].filter((r: any) => r.status === 'LIVE').map((r: any) => ({ content_key: r.content_key, row_id: r.id, state: 'live', row_updated_at: r.updated_at })));
 if (url.pathname !== '/rest/v1/generated_interpretations') throw new Error(`Unexpected storage path ${url.pathname}`);
 const found = [...store.rows.values()].filter(row => matches(row, url.searchParams));
 if (!options.method || options.method === 'GET') {
  if (url.searchParams.get('order')?.startsWith('updated_at.desc')) found.sort((a: any, b: any) => b.updated_at.localeCompare(a.updated_at));
  const offset = Number(url.searchParams.get('offset') ?? 0);
  return Response.json(found.slice(offset, offset + Number(url.searchParams.get('limit') ?? found.length)));
 }
 if (options.method === 'DELETE') { found.forEach(row => store.rows.delete(row.id)); return Response.json(found); }
 const patch = JSON.parse(String(options.body));
 if (options.method === 'PATCH') {
  const updated = found.map(row => ({ ...row, ...patch })); updated.forEach(row => store.rows.set(row.id, row)); return Response.json(updated);
 }
 if (options.method === 'POST') {
  if ([...store.rows.values()].some((r: any) => r.content_key === patch.content_key && r.mode === patch.mode && r.target_date == patch.target_date)) return Response.json({message: 'duplicate target'}, {status: 409});
  const created = { ...patch, id: `new-${store.rows.size}` }; store.rows.set(created.id, created); return Response.json([created]);
 }
 throw new Error(`Unexpected storage method ${options.method}`);
};
if (process.send) process.on('message', async ({ id, method, body, url }: any) => {
 try { process.send!({ id, result: method === 'rows' ? [...store.rows.values()] : await store.invoke(method, body, url) }); }
 catch (error) { process.send!({ id, error: String(error) }); }
});
if (process.send) process.send({ ready: true });
