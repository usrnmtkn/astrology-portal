import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { loadSkySeasonMeaning } from '../api/_lib/sky-season-meaning.ts';
import { lunarJournalPackageRecords } from '../api/_lib/lunar-journal-sources.ts';
import { HOROSCOPE_SIGNS } from '../apps/web/src/content/horoscopeEditions.mjs';
import { SEASONAL_MEANING_BANK } from '../src/astro-writing/seasonalHoroscopeMeaning.mjs';

Object.assign(process.env, { SUPABASE_URL: 'https://season-meaning.invalid', SUPABASE_SERVICE_ROLE_KEY: 'synthetic' });
const originalFetch = globalThis.fetch;
let rows: any[] = [], calls = 0, unavailable = false;
const hash = (body: string) => createHash('sha256').update(body).digest('hex');
globalThis.fetch = async (url, init = {}) => {
  calls++;
  assert(String(url).startsWith('https://season-meaning.invalid/rest/v1/generated_interpretations?'));
  assert.equal(init.method ?? 'GET', 'GET');
  const query = new URL(String(url)).searchParams;
  assert.equal(query.get('target_date'), 'is.null');
  assert(query.get('or')?.includes('fallback-hook/zodiac-season/'));
  assert(query.get('or')?.includes('authored/lunar-journal/season/'));
  return unavailable ? Response.json({ error: 'synthetic outage' }, { status: 503 }) : Response.json(rows);
};
try {
  const bank = JSON.parse(fs.readFileSync(SEASONAL_MEANING_BANK, 'utf8'));
  for (const sign of HOROSCOPE_SIGNS) {
    const context = await loadSkySeasonMeaning('sun', sign);
    assert(context);
    const packet = JSON.parse(context.prompt.split('\n\n')[2]);
    const season = bank.collections.find((c: any) => c.id === 'sign-season-content').entries.find((e: any) => e.id === sign);
    const axis = bank.collections.find((c: any) => c.id === 'sign-axis-tensions').entries.find((e: any) => e.signs.includes(sign));
    assert.equal(packet.sources[0].body, season.body);
    assert.equal(packet.sources[1].body, axis.body);
    const calendar = lunarJournalPackageRecords.filter(record => record.type === 'season' && record.sign.toLowerCase() === sign);
    assert.deepEqual(packet.sources.slice(2).map((source: any) => source.body), calendar.map(record => record.body));
    for (const source of packet.sources) {
      assert.equal(source.bodySha256, hash(source.body));
      const receipt = context.receipt.sources.find((item: any) => item.contentKey === source.contentKey);
      assert.equal(receipt.bodySha256, source.bodySha256);
      assert.equal(receipt.wordCount, source.body.trim().split(/\s+/u).length);
      assert.equal(receipt.positiveVoiceEvidence, false);
      assert.equal(receipt.factUseAuthorized, false);
      assert(!('body' in receipt));
    }
    assert(context.prompt.includes('Current writer instructions, owner corrections and eligible complete voice examples determine voice'));
    assert(context.prompt.includes('Dated articles use the calculated visit window'));
    assert(context.prompt.includes('Reusable articles retain their validation-only timing scope'));
    assert(context.prompt.includes('does not establish a current transit or lunation'));
  }
  const calendarKey = lunarJournalPackageRecords.find(record => record.type === 'season' && record.sign === 'Libra')!.contentKey;
  const row = { id: 'synthetic-calendar', content_key: calendarKey, status: 'DRAFT', updated_at: '2026-10-21T12:00:00Z',
    body: 'Older root body.', sections: { packageDraft: { contentKey: calendarKey, body: 'Complete saved Calendar opening.\n\nComplete saved Calendar ending.' } } };
  rows = [{ ...row, id: 'live', status: 'LIVE', updated_at: '2026-10-22T12:00:00Z', body: 'Live body must not replace an editable draft.', sections: {} }, row,
    { id: 'synthetic-knowledge', content_key: 'fallback-hook/zodiac-season/libra', status: 'DRAFT', updated_at: row.updated_at,
      body: 'Complete saved knowledge meaning with its exact final sentence.' }];
  const saved = await loadSkySeasonMeaning('sun', 'libra');
  const packet = JSON.parse(saved!.prompt.split('\n\n')[2]);
  assert.equal(packet.sources[0].body, rows[2].body);
  assert.equal(packet.sources[2].body, row.sections.packageDraft.body);
  assert.equal(packet.sources[2].provenance.rowId, row.id);
  assert.equal(packet.sources[2].provenance.updatedAt, row.updated_at);
  const before = JSON.stringify(rows);
  await loadSkySeasonMeaning('sun', 'libra');
  assert.equal(JSON.stringify(rows), before, 'Meaning retrieval never mutates saved writing.');
  for (const invalid of ['', 'Unresolved {{instruction}}.']) {
    rows = [{ ...row, sections: { packageDraft: { contentKey: calendarKey, body: invalid } } }];
    await assert.rejects(loadSkySeasonMeaning('sun', 'libra'), /Complete the Calendar season passage/);
  }
  rows = [{ ...row, sections: { packageDraft: { contentKey: 'wrong-source', body: 'Complete source.' } } }];
  await assert.rejects(loadSkySeasonMeaning('sun', 'libra'), /identity does not match/);
  rows = [{ ...row, updated_at: 'invalid' }];
  await assert.rejects(loadSkySeasonMeaning('sun', 'libra'), /source version is missing/);
  rows = [{ ...row, status: 'ARCHIVED' }];
  await assert.rejects(loadSkySeasonMeaning('sun', 'libra'), /Calendar season writing is unavailable/);
  rows = [{ id: 'synthetic-empty-knowledge', content_key: 'fallback-hook/zodiac-season/libra', status: 'DRAFT', updated_at: row.updated_at, body: '' }];
  await assert.rejects(loadSkySeasonMeaning('sun', 'libra'), /Complete the shared zodiac-season source/);
  rows = Array.from({ length: 101 }, () => row);
  await assert.rejects(loadSkySeasonMeaning('sun', 'libra'), /inventory needs review/);
  rows = [];
  unavailable = true;
  await assert.rejects(loadSkySeasonMeaning('sun', 'libra'), /could not load/);
  const count = calls;
  assert.equal(await loadSkySeasonMeaning('venus', 'libra'), null);
  assert.equal(calls, count, 'Other planets retain their existing meaning workflow.');
  const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  for (const key of ['api/admin/sky-article-writing.ts', 'api/admin/sky-article-template-slots.ts']) {
    const pattern = config.functions[key].includeFiles;
    assert(pattern.length <= 256);
    const files = new Set(fs.globSync(pattern));
    assert(files.has(SEASONAL_MEANING_BANK), `${key}: package the knowledge bank.`);
    assert(files.has('apps/web/src/features/calendar/data/lunar-journal.entries.json'), `${key}: package the full Calendar sources.`);
  }
  console.log('PASS Sky season meaning: all 12 seasons, exact complete knowledge/axis/Calendar sources, hashes and versions, draft precedence, retired/empty/malformed/outage failures, read-only scope and deployment files.');
} finally { globalThis.fetch = originalFetch; }
