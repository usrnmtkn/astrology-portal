import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import fs from 'node:fs';
import handler, { readerRowIsEligible } from '../api/content-reader.ts';
import { projectReaderRow } from '../apps/web/src/content/readerRowProjection.mjs';
import { publicationLedgerKey } from '../apps/web/src/content/contentPublicationState.ts';
import { skyEvergreenSectionText } from '../apps/web/src/content/fallbackArchitectureV3/resolver/skyEvergreenSections.mjs';

process.env.SUPABASE_URL = 'https://reader-privacy.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'PRIVATE_SERVICE_KEY';
const id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const version = '2026-09-21T18:00:00.123456+00:00';
const text = '  Synthetic approved opening.\r\n\r\nComplete final sentence.  ';
const privateText = 'PRIVATE_UNAPPROVED_CANARY';
const row: any = { id, updated_at: version, content_key: 'cms/test/exact', surface: 'sky', mode: 'article',
  status: 'LIVE', lane: 'serving', review_state: null, target_date: null, body: text, headline: 'Synthetic fixture',
  sections: { sections: [{ heading: 'Fixture', body: text, privateNotes: privateText }],
    packageOriginalRecord: { body: privateText }, packageDraft: { body: privateText },
    dashboardEditHistory: [{ body: privateText }], arbitraryFutureField: privateText },
  source_snapshot: { contentType: 'manual', editorialImport: { text: privateText }, internalNotes: privateText },
  facts: { privateBirthRecord: privateText }, reviewer_notes: privateText };
const initial = structuredClone(row);
let stored = [row];
let ledger: any[] = [{ content_key: publicationLedgerKey, state: 'live', revision: 1, row_id: null, row_updated_at: null, updated_at: version },
  { content_key: row.content_key, state: 'live', revision: 1, row_id: id, row_updated_at: version, updated_at: version }];
let calls: URL[] = [];
const original = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input)); calls.push(url);
  assert.equal(url.origin, 'https://reader-privacy.invalid');
  assert.equal(new Headers(init?.headers).get('apikey'), 'PRIVATE_SERVICE_KEY');
  if (url.pathname.endsWith('/content_publications')) return Response.json(ledger);
  assert.equal(url.pathname, '/rest/v1/generated_interpretations');
  assert.equal(url.searchParams.get('status'), 'eq.LIVE');
  assert.equal(url.searchParams.get('lane'), 'eq.serving');
  assert.equal(url.searchParams.get('review_state'), 'is.null');
  return Response.json(stored);
};
async function request(query: unknown = {}, method = 'POST') {
  const req: any = Readable.from([JSON.stringify(query)]); req.method = method; req.headers = {};
  const headers: Record<string, unknown> = {};
  const res: any = { statusCode: 200, setHeader(k: string, v: unknown) { headers[k] = v; }, end(body: string) { this.body = body; this.value = JSON.parse(body); } };
  await handler(req, res); return { ...res, headers };
}
try {
  const result = await request({ keys: [row.content_key] });
  assert.equal(result.statusCode, 200);
  assert.equal(result.value.rows[0].body, text);
  assert.equal(result.value.rows[0].sections.sections[0].body, text);
  assert.equal(result.body.includes(privateText), false);
  assert.equal(result.body.includes('PRIVATE_SERVICE_KEY'), false);
  assert.equal(result.headers['Cache-Control'], 'no-store');
  assert.deepEqual(row, initial, 'Projection must not mutate the original, history or draft');
  const calendarWriting = Object.fromEntries(['weeklyOverview', 'weeklyIntegration', 'monthlyOverview', 'monthlyIntegration',
    'seasonOverview', 'lunarOverview', 'transitOverview', 'seasonOpening', 'planetaryHighlights', 'newMoonOverview',
    'fullMoonOverview', 'lunationConnection'].map(field => [field, `${field}: ${text}`]));
  stored = [{ ...row, sections: { calendarOverview: { ...calendarWriting, internalNotes: privateText } } }];
  const calendar = await request({ keys: [row.content_key] });
  assert.deepEqual(calendar.value.rows[0].sections.calendarOverview, calendarWriting, 'Complete Calendar passage fields must survive public projection');
  assert.equal(calendar.body.includes(privateText), false);
  for (const mutation of [{ status: 'DRAFT' }, { lane: 'reference' }, { review_state: 'needs-review' },
    { facts: { sampleOnly: true } }, { flags: ['BLOCKLIST_MATCH'] },
    { source_snapshot: { content_role: 'source_material' } }]) {
    stored = [{ ...row, ...mutation }];
    assert.deepEqual((await request()).value.rows, [], JSON.stringify(mutation));
  }
  stored = [row];
  calls = [];
  assert.equal((await request({ scope: 'sky-list', vocabularyOnly: true })).statusCode, 200);
  const scopes = calls[0].searchParams.getAll('or');
  assert(scopes.some(value => value.includes('sky-context')));
  assert(scopes.some(value => value.includes('cc/planet/')));
  assert.equal((await request({ scope: 'raw-authoring' })).statusCode, 400);
  ledger[1].state = 'retired'; assert.deepEqual((await request()).value.rows, []);
  ledger[1].state = 'live'; ledger[1].row_updated_at = '2026-09-21T18:00:00.123457+00:00';
  assert.deepEqual((await request()).value.rows, [], 'Microsecond stale publication must not serve');
  ledger[1].row_updated_at = version;
  const savedLedger = ledger; ledger = []; assert.equal((await request()).statusCode, 503); ledger = savedLedger;
  for (const query of [{ select: '*' }, { keys: ['x),status.eq.DRAFT'] }, { provider: 'private' }, { ids: ['not-a-uuid'] }, { afterId: '../anything' }, { latestVersion: true }]) {
    calls = []; assert.equal((await request(query)).statusCode, 400); assert.equal(calls.length, 0);
  }
  assert.equal((await request({}, 'GET')).statusCode, 405);
  stored = Array.from({ length: 250 }, (_, i) => ({ ...row, id: `aaaaaaaa-aaaa-aaaa-aaaa-${String(i).padStart(12, '0')}`, status: 'DRAFT' }));
  const filtered = await request(); assert.deepEqual(filtered.value.rows, []);
  assert.equal(filtered.value.nextCursor, stored.at(-1)!.id, 'Filtered pages must still advance through storage');
  globalThis.fetch = async () => new Response('upstream private diagnostic', { status: 500 });
  const failed = await request(); assert.equal(failed.statusCode, 503); assert(!failed.body.includes('private diagnostic'));
} finally { globalThis.fetch = original; }

const packageRow: any = { ...row, provider: 'tldrastro-fallback-architecture-v3', content_key: 'fallback-hook/test',
  source_snapshot: { content_role: 'fallback_hook', review_status: 'approved' },
  sections: { ...row.sections, packageRecord: { contentKey: 'fallback-hook/test', content_role: 'fallback_hook', review_status: 'approved',
    body: text, body_you: text, body_they: text, studio_source_baseline: { body: privateText },
    arbitraryFutureField: { body: privateText },
    fallback: { sections: [{ id: 'main', label: 'Synthetic', phrases: [{ id: 'one', text, joinBefore: '\n', source: privateText }] }] },
    ingress: { enabled: true, version: 1, sources: { openingHook: { kind: 'placement', text, privateNotes: privateText }, unknown: { text: privateText } } }
  } } };
assert(readerRowIsEligible(packageRow));
const projected: any = projectReaderRow(packageRow);
assert.equal(projected.sections.packageRecord.body, text);
assert.equal(projected.sections.packageRecord.body_you, text);
assert.equal(projected.sections.packageRecord.body_they, text);
assert.equal(projected.sections.packageRecord.ingress.sources.openingHook.text, text);
assert.equal(skyEvergreenSectionText(projected.sections.packageRecord.fallback.sections[0]), '\n' + text);
assert(!JSON.stringify(projected).includes(privateText));
assert(!readerRowIsEligible({ ...packageRow, source_snapshot: { review_status: 'needs_review' } }));
for (const fields of [{review_status:'needs_review'}, {body_they_review_status:'needs_review'}, {content_role:'source_material'}]) {
  assert(!readerRowIsEligible({ ...packageRow, sections: { ...packageRow.sections, packageRecord: { ...packageRow.sections.packageRecord, ...fields } } }), 'An approved mirror must not override an unapproved source or audience passage');
}
const custom: any = projectReaderRow({ ...packageRow, sections: { packageRecord: { ...packageRow.sections.packageRecord,
  placementArticle: '{{directNote}}', ingress: { enabled:true, sources: { directNote: { kind:'placement', text, privateNotes:privateText }, unusedPrivateNote: {kind:'placement',text:privateText} } },
  lunarJournal: {blocks:[{type:'ritual',label:'Synthetic',steps:[text],notes:[text],editorialNotes:privateText},{type:'bysign',items:[{sign:'Aries',house:'1',text,privateNotes:privateText}]}] }
} } });
assert.equal(custom.sections.packageRecord.ingress.sources.directNote.text,text);
assert.equal(custom.sections.packageRecord.lunarJournal.blocks[0].notes[0],text);
assert.equal(custom.sections.packageRecord.lunarJournal.blocks[1].items[0].text,text);
assert(!JSON.stringify(custom).includes(privateText));


// Exercise the complete checked-in offline inventory without printing its copy.
const snapshot = JSON.parse(fs.readFileSync('apps/web/public/content-studio-last-known-good.json', 'utf8'));
let admitted = 0;
for (const source of snapshot.rows) {
  const result: any = projectReaderRow(source);
  assert(result, `Missing identity for ${source.content_key}`);
  assert.equal(result.body, source.body);
  for (const field of ['body', 'body_you', 'body_they', 'Body', 'Summary', 'Headline', 'placementArticle', 'placementArticleDirect', 'placementArticleRetrograde']) {
    if (typeof source.sections?.packageRecord?.[field] === 'string') assert.equal(result.sections.packageRecord[field], source.sections.packageRecord[field]);
  }
  if (readerRowIsEligible(source)) admitted++;
}
console.log(`PASS reader API privacy, admission, retirement, cursor and failure contracts; exact projection of ${snapshot.rows.length} offline rows (${admitted} admitted).`);
