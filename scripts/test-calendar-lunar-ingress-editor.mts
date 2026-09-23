import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { rmSync } from 'node:fs';
import { createApiStore } from '../tests/helpers/calendar-review-api.mjs';
import { calendarMoonIngressPackageRecords as records, isCalendarMoonIngressContentKey } from '../api/_lib/calendar-moon-ingress-sources';
import { lunarContentIdentity } from '../apps/admin/src/lunarCalendarContent';
import { calendarWritingStudioHref } from '../apps/web/src/features/calendar/calendarWritingStudio';

const store = await createApiStore([]);
const bundle = join(tmpdir(), `lunar-ingress-reader-${process.pid}.mjs`);
await build({ stdin: { contents: `export { loadLiveGeneratedContentForKeys } from './apps/web/src/services/generatedContent.ts'; export { normalizeCalendarEventSurface } from './apps/web/src/features/calendar/LunarCalendar.tsx';`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, outfile: bundle, platform: 'node', format: 'esm', define: { 'import.meta.env': JSON.stringify({ VITE_SUPABASE_URL: 'https://calendar-api.invalid', VITE_SUPABASE_ANON_KEY: 'calendar-api-fixture-key' }) }, loader: { '.css': 'empty' }, logLevel: 'silent' });
const { contentLiveStatuses } = await import('../api/_lib/content-live-status');
const reader = await import(pathToFileURL(bundle).href);
const inventory = (params: URLSearchParams) => store.invoke('GET', undefined, `/api/admin/generated-content-inventory?${params}`);
try {
  const list = await inventory(new URLSearchParams({ contentKeyPrefix: 'authored/calendar-moon-transition/', status: 'all', visibility: 'all' }));
  assert.equal(list.status, 200);
  assert.equal(list.payload.rows.length, 12);
  assert.ok(list.payload.rows.every(row => row.inventory_only && !row.body));
  assert.equal(store.rows.size, 0, 'Browsing never saves a row.');
  for (const record of records) {
    const key = record.contentKey;
    assert.equal(lunarContentIdentity(key)?.title, record.headline);
    assert.equal(new URLSearchParams(new URL(calendarWritingStudioHref(key)).hash.split('?')[1]).get('view'), 'lunar-ingresses');
    assert.equal(record.calendarWritingSource.bodySha256, createHash('sha256').update(record.body).digest('hex'));
    const detail = await inventory(new URLSearchParams({ contentKey: key }));
    assert.equal(detail.payload.rows[0].body, record.body);
    const body = 'Synthetic ingress opening preserved in full.\n\nSynthetic ingress final sentence.';
    const saved = await store.invoke('POST', { contentKey: key, surface: 'sky', mode: 'in_depth', status: 'DRAFT', lane: 'reference',
      headline: record.headline, summary: '', body, eventType: 'fallback-hook', blockType: 'fallback_hook', promptVersion: 'manual-admin', model: 'manual', provider: 'tldrastro-fallback-architecture-v3',
      sections: { packageRecord: record, packageOriginalRecord: record, packageDraft: { body } },
      facts: { fallbackArchitectureV3: true }, sourceSnapshot: { sourcePackage: record.source_package, content_role: 'full_copy', review_status: 'needs_review' } });
    assert.equal(saved.status, 200, JSON.stringify(saved.payload));
    const draft = saved.payload.rows[0];
    assert.equal((await inventory(new URLSearchParams({ contentKey: key }))).payload.rows.length, 1, 'Saved row replaces the starter.');
    assert.equal((await reader.loadLiveGeneratedContentForKeys([key])).has(key), false, 'Drafts cannot reach readers.');
    const published = await store.invoke('PATCH', { id: draft.id, expectedUpdatedAt: draft.updated_at, ownerAction: 'approve-package-revision' });
    assert.equal(published.status, 200, JSON.stringify(published.payload));
    const row = published.payload.rows[0];
    assert.equal(row.body, body);
    assert.equal(row.status, 'LIVE');
    assert.equal(contentLiveStatuses([row], [row])[0].live, true);
    const generated = await reader.loadLiveGeneratedContentForKeys([key]);
    assert.equal(generated.get(key)?.body, body);
    const event = { type: 'ingress', planet: 'Moon', fromSign: record.fromSign, toSign: record.toSign, sign: record.toSign, startsAt: '2026-09-23T23:23:00Z', dateKey: '2026-09-23' };
    assert.equal(reader.normalizeCalendarEventSurface(event, null, 'Today', null, null, null, generated).sections[0]?.body, body);
    assert.equal((await store.invoke('PATCH', { id: row.id, expectedUpdatedAt: draft.updated_at, body: 'Obsolete revision' })).status, 409);
    assert.equal(store.rows.get(row.id).body, body);
    const revision = await store.invoke('PATCH', { id: row.id, expectedUpdatedAt: row.updated_at, sections: { ...row.sections, packageDraft: { body: body + '\n\nSynthetic second revision.' } }, reviewStatus: 'needs_review' });
    assert.equal(revision.status, 200, JSON.stringify(revision.payload));
    const readBack = await inventory(new URLSearchParams({ contentKey: key }));
    assert.equal(readBack.payload.rows.length, 1, 'One editable source per ingress after editing a publication.');
  }
  for (const key of ['authored/calendar-moon-transition/aries/pisces', 'authored/calendar-moon-transition/aquarius/unknown']) assert.equal(isCalendarMoonIngressContentKey(key), false);
  const denied = await store.invoke('GET', undefined, '/api/admin/generated-content-inventory?contentKeyPrefix=authored/calendar-moon-transition/', 'invalid');
  assert.equal(denied.status, 401);
  console.log('PASS: all twelve ingress sources browse, open, save, publish, reach the actual Calendar reader, and reject stale/unauthorized requests.');
} finally { rmSync(bundle, { force: true }); store.close(); }
