import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { seedPublicationRow } from '../tests/helpers/studio-publication-db.mjs';
import { createCalendarAspectPublicationStore } from '../tests/helpers/calendar-aspect-publication-store.mjs';
import { publicationLedgerKey } from '../apps/web/src/content/contentPublicationState.ts';
import lintModule from '../packages/astro-knowledge/scripts/lint-sky-voice.js';
import { loadReaderRows } from '../apps/web/src/services/readerContentClient.ts';

const env = { NODE_ENV: 'test', CONTENT_GENERATION_SECRET: 'calendar-ledger-fixture',
  SUPABASE_URL: 'https://calendar-ledger.invalid', SUPABASE_SERVICE_ROLE_KEY: 'fixture' };
Object.assign(process.env, env);
const { default: handler } = await import('../api/admin/generated-content.ts');
const { default: reader } = await import('../api/content-reader.ts');
const { default: writing } = await import('../api/admin/sky-draft-writing.ts');
const { default: liveStatus } = await import('../api/admin/content-live-status.ts');
const { default: publicationAction } = await import('../api/admin/content-publication.ts');
Object.assign(process.env, env);
const storage = await createCalendarAspectPublicationStore(env.SUPABASE_URL);
const db = storage.db;
const originalFetch = globalThis.fetch;
const key = 'sky.aspect.sun.sextile.jupiter.libra.leo';
const body = 'We may enjoy sharing an idea with someone who wants to hear more.\n\nTell them what you liked. Ask about it. Listen to their answer. Let them finish.';
const row = { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', content_key: key,
  updated_at: '2026-10-14T12:00:00.123456+00:00', status: 'DRAFT', lane: 'serving',
  review_state: 'sky-owner-approval-required', target_date: null, surface: 'sky', mode: 'feed',
  block_type: 'sky_aspect', provider: 'manual-admin', event_type: 'collective-aspect-card',
  headline: 'Synthetic Sun aspect', summary: '', body, sections: { RetrogradeBodyB: 'Complete synthetic retrograde version.' },
  facts: {}, flags: [], judge_gate: 'human-review', judge_score: null,
  source_snapshot: { review_status: 'needs_review', studioWritingCheck: null } };
async function invoke(target: typeof handler, method: string, input: unknown, secret = env.CONTENT_GENERATION_SECRET, url = '/api/admin/generated-content') {
  const req = Object.assign(Readable.from(input === undefined ? [] : [JSON.stringify(input)]), { method, url,
    headers: { 'x-content-generation-secret': secret } });
  const res = { statusCode: 200, result: {} as any, setHeader() {}, end(text: string) { this.result = JSON.parse(text); } };
  await target(req, res as any);
  return { status: res.statusCode, ...res.result };
}
try {
  await db.query("select set_config('request.headers','{}',false)");
  await seedPublicationRow(db, row);
  const opened: any = (await db.query('select to_jsonb(g) as row from generated_interpretations g where id=$1', [row.id])).rows[0].row;
  await db.query('insert into content_publications(content_key,state) values($1,$2)', [publicationLedgerKey, 'live']);
  globalThis.fetch = async (input, init = {}) => {
    if (String(input) === '/api/content-reader') {
      const result = await invoke(reader as any, 'POST', JSON.parse(String(init.body)));
      const { status, ...payload } = result;
      return Response.json(payload, { status });
    }
    return storage.fetch(input, init);
  };
  const before = await invoke(reader as any, 'POST', { keys: [key] });
  assert.equal(before.rows.length, 0, 'Unpublished drafts cannot serve');
  assert.equal(lintModule.lintCard(body).score, 2, 'Generated drafts retain their existing warning score');
  assert.equal((await invoke(handler, 'PATCH', { id: row.id, expectedUpdatedAt: opened.updated_at,
    ownerAction: 'approve-and-schedule' })).status, 409, 'Unchecked writing still requires a current check');
  const checked = await invoke(writing as any, 'POST', { contentKey: key, expectedUpdatedAt: opened.updated_at, action: 'recheck' });
  assert.equal(checked.status, 200, JSON.stringify(checked));
  const ready = checked.rows[0];
  assert.equal(ready.body, body, 'The real saved-text checker must preserve the full passage');
  assert.equal(ready.source_snapshot.skyAspectVoiceLint.fails, 0);
  assert.ok(ready.source_snapshot.skyAspectVoiceLint.warns > 0, 'The synthetic short ending must retain its editorial warnings');
  assert.deepEqual(checked.issues, [], 'Editorial warnings must not block the owner from reviewing saved copy');
  assert.equal((await invoke(handler, 'PATCH', { id: row.id, expectedUpdatedAt: row.updated_at,
    ownerAction: 'approve-and-schedule' }, 'wrong')).status, 401);
  assert.equal((await invoke(handler, 'PATCH', { id: row.id, expectedUpdatedAt: '2000-01-01T00:00:00Z',
    ownerAction: 'approve-and-schedule' })).status, 409);
  const result = await invoke(handler, 'PATCH', { id: row.id, expectedUpdatedAt: ready.updated_at, ownerAction: 'approve-and-schedule' });
  assert.equal(result.status, 200, JSON.stringify(result));
  const saved = result.rows[0];
  assert.equal(saved.status, 'LIVE');
  assert.equal(saved.body, body);
  const ledger: any = (await db.query('select to_jsonb(p) as row from content_publications p where content_key=$1', [key])).rows[0]?.row;
  assert.ok(ledger, 'Owner approval must create the actual database publication ledger, not only mark a row LIVE');
  assert.equal(ledger.row_id, saved.id);
  assert.equal(ledger.row_updated_at, saved.updated_at);
  const delivered = await invoke(reader as any, 'POST', { keys: [key] });
  assert.equal(delivered.status, 200, JSON.stringify(delivered));
  assert.equal(delivered.rows[0]?.body, body, 'Public reader must deliver the complete approved passage');
  assert.equal(delivered.rows[0]?.sections.RetrogradeBodyB, row.sections.RetrogradeBodyB);
  assert.equal((await invoke(liveStatus as any, 'POST', { ids: [saved.id] })).statuses[0]?.live, true,
    'The actual Studio status handler must agree with the actual public reader');
  const coldRead = await loadReaderRows({ keys: [key] });
  assert.equal(coldRead.error, null);
  assert.equal(coldRead.data?.[0]?.body, body, 'Cold reader transport must hydrate the full approved body');
  const revisedBody = 'We may enjoy hearing more about an idea someone has made their own.\n\nAsk what interested them and give them time to explain it.';
  const revision = await invoke(handler, 'PATCH', { id: saved.id, expectedUpdatedAt: saved.updated_at,
    status: 'DRAFT', body: revisedBody });
  assert.equal(revision.status, 200, JSON.stringify(revision));
  const revised = revision.rows[0];
  assert.equal(revised.status, 'DRAFT', 'Editing published Sky copy must return the draft requested by the editor');
  assert.equal(revised.body, revisedBody);
  assert.equal(revised.source_snapshot.studioWritingCheck, null, 'A revised passage needs fresh checks');
  assert.equal(revised.sections.RetrogradeBodyB, row.sections.RetrogradeBodyB);
  assert.equal((await invoke(reader as any, 'POST', { keys: [key] })).rows.length, 0, 'Unreviewed changes cannot serve');
  const revisionCheck = await invoke(writing as any, 'POST', { contentKey: key, expectedUpdatedAt: revised.updated_at, action: 'recheck' });
  assert.equal(revisionCheck.status, 200, JSON.stringify(revisionCheck));
  const republished = await invoke(handler, 'PATCH', { id: revised.id, expectedUpdatedAt: revisionCheck.rows[0].updated_at,
    ownerAction: 'approve-and-schedule' });
  assert.equal(republished.status, 200, JSON.stringify(republished));
  const afterRevision = await invoke(reader as any, 'POST', { keys: [key] });
  assert.equal(afterRevision.rows[0]?.body, revisedBody, 'Reapproval must serve the exact revised passage');
  assert.equal(afterRevision.rows[0]?.sections.RetrogradeBodyB, row.sections.RetrogradeBodyB);
  const publishedRevision = republished.rows[0];
  const retired = await invoke(publicationAction as any, 'POST', { action: 'retire', contentKey: key,
    id: publishedRevision.id, expectedUpdatedAt: publishedRevision.updated_at });
  assert.equal(retired.status, 200, JSON.stringify(retired));
  assert.equal((await loadReaderRows({ keys: [key] })).data?.length, 0, 'A warmed reader must honor retirement');
  assert.equal((await invoke(liveStatus as any, 'POST', { ids: [saved.id] })).statuses[0]?.live, false);
  const restored = await invoke(handler, 'PATCH', { id: saved.id, expectedUpdatedAt: publishedRevision.updated_at,
    ownerAction: 'approve-and-schedule' });
  assert.equal(restored.status, 200, JSON.stringify(restored));
  assert.equal((await loadReaderRows({ keys: [key] })).data?.[0]?.body, revisedBody);
  const { calendarAspectDraft } = await import('../apps/admin/src/calendarAspectSources.ts');
  const draft = calendarAspectDraft({ first: 'sun', firstSign: 'libra', aspect: 'trine', second: 'uranus', secondSign: 'gemini' })!;
  const { id: _emptyId, ...createInput } = draft;
  const created = await invoke(handler, 'POST', { ...createInput, body, eventType: 'collective-aspect-card' });
  assert.equal(created.status, 200, JSON.stringify(created));
  const newRow = created.rows[0];
  assert.equal(newRow.body, body);
  assert.equal(newRow.status, 'DRAFT');
  const reopened = await invoke(handler, 'GET', undefined, env.CONTENT_GENERATION_SECRET,
    `/api/admin/generated-content?contentKey=${encodeURIComponent(newRow.content_key)}&status=all`);
  assert.equal(reopened.rows[0]?.body, body, 'Reopening a created row must retrieve the complete passage');
  assert.equal((await invoke(handler, 'POST', { ...createInput, body: 'Competing draft.', eventType: 'collective-aspect-card' })).status, 409);
  const newCheck = await invoke(writing as any, 'POST', { contentKey: newRow.content_key, expectedUpdatedAt: newRow.updated_at, action: 'recheck' });
  assert.equal(newCheck.status, 200, JSON.stringify(newCheck));
  const newPublication = await invoke(handler, 'PATCH', { id: newRow.id, expectedUpdatedAt: newCheck.rows[0].updated_at,
    ownerAction: 'approve-and-schedule' });
  assert.equal(newPublication.status, 200, JSON.stringify(newPublication));
  assert.equal((await loadReaderRows({ keys: [newRow.content_key] })).data?.[0]?.body, body);
  await db.query('delete from content_publications where content_key=$1', [key]);
  storage.suppressPublicationSignal(true);
  const unconfirmed = await invoke(handler, 'PATCH', { id: saved.id, expectedUpdatedAt: restored.rows[0].updated_at,
    ownerAction: 'approve-and-schedule' });
  assert.equal(unconfirmed.status, 503, 'A successful source write without the database signal must never report publication success');
  assert.equal(unconfirmed.code, 'PUBLICATION_UNCONFIRMED');
  assert.equal((await invoke(reader as any, 'POST', { keys: [key] })).rows.length, 0);
  assert.equal((await invoke(liveStatus as any, 'POST', { ids: [saved.id] })).statuses[0]?.live, false);
  storage.suppressPublicationSignal(false);
  const recoveryRow: any = (await db.query('select to_jsonb(g) as row from generated_interpretations g where id=$1', [saved.id])).rows[0].row;
  const recovered = await invoke(handler, 'PATCH', { id: saved.id, expectedUpdatedAt: recoveryRow.updated_at,
    ownerAction: 'approve-and-schedule' });
  assert.equal(recovered.status, 200, JSON.stringify(recovered));
  assert.equal((await loadReaderRows({ keys: [key] })).data?.[0]?.body, revisedBody);
  const invalid = { ...row, id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', content_key: 'sky.aspect.sun.opposition.neptune.libra.aries',
    body: 'We may notice a 2 degree orb in this example.\n\nCheck the timing.', source_snapshot: { review_status: 'needs_review', studioWritingCheck: null } };
  await db.query("select set_config('request.headers','{}',false)");
  await seedPublicationRow(db, invalid);
  const openedInvalid: any = (await db.query('select to_jsonb(g) as row from generated_interpretations g where id=$1', [invalid.id])).rows[0].row;
  const invalidCheck = await invoke(writing as any, 'POST', { contentKey: invalid.content_key, expectedUpdatedAt: openedInvalid.updated_at, action: 'recheck' });
  assert.equal(invalidCheck.status, 200, JSON.stringify(invalidCheck));
  assert.ok(invalidCheck.rows[0].source_snapshot.skyAspectVoiceLint.fails > 0, 'Reader-boundary failures still block saved copy');
  assert.ok(invalidCheck.issues.length > 0);
  assert.equal((await invoke(handler, 'PATCH', { id: invalid.id, expectedUpdatedAt: invalidCheck.rows[0].updated_at, ownerAction: 'approve-and-schedule' })).status, 409);
  assert.equal((await invoke(reader as any, 'POST', { keys: [invalid.content_key] })).rows.length, 0);
  const deletable = invalidCheck.rows[0];
  const deleted = await invoke(handler, 'DELETE', undefined, env.CONTENT_GENERATION_SECRET,
    `/api/admin/generated-content?id=${deletable.id}&expectedUpdatedAt=${encodeURIComponent(deletable.updated_at)}`);
  assert.equal(deleted.status, 200, JSON.stringify(deleted));
  assert.equal((await db.query('select id from generated_interpretations where id=$1', [deletable.id])).rows.length, 0);
  console.log('PASS Calendar aspect lifecycle: actual create/reopen/edit/check/approve/retire/delete handlers, SQL ledger, cold and warm reader transport, Studio status parity, Rx preservation, signal-loss refusal and recovery, stale/unauthorized/duplicate refusal.');
} finally {
  globalThis.fetch = originalFetch;
  await db.close();
}
