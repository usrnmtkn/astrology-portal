import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { store } from '../tests/helpers/sky-article-save-api.mts';
import publicationHandler from '../api/admin/content-publication';
import { defaultHoroscopeProfile, HOROSCOPE_PROFILE_PREFIX, horoscopeEditorialPrompt } from '../src/astro-writing/horoscopeWritingProfiles.mjs';
import { resolveStudioWritingProfile } from '../src/astro-writing/studioWritingProfileReceipt.mjs';
import { generateDraft } from '../src/astro-writing/generateDraft.mjs';
import { buildArgumentOutline, approveArgumentOutline, ARGUMENT_OUTLINE_FIELDS } from '../src/astro-writing/argumentGate.mjs';

const endpoint = '/api/admin/generated-content?writingProfiles=true';
const invoke = (method: string, body?: unknown) => store.invoke(method, body, endpoint);
const originalCount = store.rows.size;
assert.equal((await store.invoke('GET', undefined, endpoint, 'wrong')).status, 401);
const library = await invoke('GET');
assert.equal(library.status, 200, JSON.stringify(library.payload));
assert.deepEqual(library.payload.profiles.map((v: any) => [v.profile.period, v.id, v.revision]), [['daily', null, 0], ['weekly', null, 0], ['seasonal', null, 0]]);
assert.equal(store.rows.size, originalCount, 'Reading starter profiles never creates content');
for (const body of [null, [], {}, {profile: defaultHoroscopeProfile('weekly')}, {profile: {...defaultHoroscopeProfile('weekly'), prompt: '{{unknown}}'}, expectedUpdatedAt: null}, {profile: {...defaultHoroscopeProfile('weekly'), voiceGuidance: '{{period}}'}, expectedUpdatedAt: null}]) {
  assert.equal((await invoke('POST', body)).status, 400, JSON.stringify(body));
}
const profile = {...defaultHoroscopeProfile('weekly'), voiceGuidance: 'Fixture exact owner guidance.\n\nKeep punctuation — and spacing.  '};
const created = await invoke('POST', {profile, expectedUpdatedAt: null});
assert.equal(created.status, 200, JSON.stringify(created.payload));
let saved = created.payload.profile;
assert.equal(saved.revision, 1);
assert.deepEqual(saved.profile, profile);
assert.equal(saved.sha256, createHash('sha256').update(JSON.stringify(profile)).digest('hex'));
const row = store.rows.get(saved.id);
assert.equal(row.body, ''); assert.equal(row.summary, '');
assert.equal(row.status, 'DRAFT'); assert.equal(row.lane, 'reference');
assert.equal((await invoke('POST', {profile, expectedUpdatedAt: null})).status, 409);
assert.equal((await invoke('POST', {profile, expectedUpdatedAt: '2020-01-01T00:00:00Z'})).status, 409);
assert.equal((await store.invoke('PATCH', {id: saved.id, status: 'LIVE'})).status, 400);
assert.equal((await store.invoke('DELETE', {id: saved.id})).status, 400);
assert.equal((await store.invoke('POST', {contentKey: HOROSCOPE_PROFILE_PREFIX + 'daily', surface: 'sky', mode: 'article', status: 'LIVE', body: 'Private instructions'})).status, 400);
for (const action of ['publish', 'retire']) {
  const req: any = Readable.from([JSON.stringify({action, id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', contentKey: row.content_key, expectedUpdatedAt: saved.updatedAt})]);
  req.method = 'POST'; req.headers = {'x-content-generation-secret': 'calendar-api-fixture'};
  const res: any = {statusCode: 0, setHeader() {}, end(body: string) {this.body = JSON.parse(body);}};
  await publicationHandler(req, res);
  assert.equal(res.statusCode, 400, JSON.stringify(res.body));
}
const race = await Promise.all(['A', 'B'].map(suffix => invoke('POST', {profile: {...profile, voiceGuidance: profile.voiceGuidance + suffix}, expectedUpdatedAt: saved.updatedAt})));
assert.deepEqual(race.map(r => r.status).sort(), [200, 409], 'Concurrent saves cannot overwrite each other');
saved = race.find(r => r.status === 200)!.payload.profile;
assert.equal(saved.revision, 2);
for (const period of ['daily', 'seasonal'] as const) assert.equal((await invoke('POST', {profile: defaultHoroscopeProfile(period), expectedUpdatedAt: null})).status, 200);
assert.deepEqual((await invoke('GET')).payload.profiles.find((v: any) => v.profile.period === 'weekly'), saved);

// Exercise the real writer boundary with synthetic facts and an injected, unbilled provider.
// This tests configuration plumbing, not horoscope quality or a new horoscope renderer.
const plan = {object: 'fixture-object', sign: 'fixture-sign'};
const family = 'fixture-profile', surface = 'sky-placement-page';
const argumentInput = {...Object.fromEntries(ARGUMENT_OUTLINE_FIELDS.map(field => [field, `Fixture ${field}.`])), scope_breadth: {broad_mechanism: 'Fixture broad mechanism.', chosen_expression: 'Fixture expression.', other_valid_expressions: ['Fixture one.', 'Fixture two.', 'Fixture three.']}};
const outline = buildArgumentOutline(argumentInput, {plan, family, surface});
const argumentOutline = approveArgumentOutline(outline, {exactOwnerRuling: 'Synthetic test approval only; no real prose is approved.'});
const target = {surface, route: 'sky', renderer: 'renderSkyPlacement', contentKeyFamily: 'fixture', temporality: 'current_sky', voiceMode: 'current_sky_direct_address'};
let calls = 0, seen = '';
const modelClient = async ({input}: any) => { calls++; seen = input; return {tagline: 'Fixture.', hook: 'Fixture.', lived: 'Fixture.', turn: 'Fixture.'}; };
const args = {plan, context: {sharedEvidencePacket: {version: 'fixture', roles: {}}}, target, family, surface, register: 'collective', argumentOutline, spine: {status: 'recorded', id: 'fixture'}, modelClient, writingProfile: saved};
const candidate = await generateDraft(args);
assert(seen.includes(horoscopeEditorialPrompt(saved.profile)));
assert.equal(candidate.studioWritingProfile.sha256, saved.sha256);
assert.equal(candidate.studioWritingProfile.revision, 2);
assert.equal(candidate.ownerApproved, false); assert.equal(candidate.promotionAuthorized, false);
assert.equal('profile' in candidate.studioWritingProfile, false);
const edited = {...saved.profile, prompt: saved.profile.prompt + '\nFixture changed instruction.'};
const updated = await invoke('POST', {profile: edited, expectedUpdatedAt: saved.updatedAt});
assert.equal(updated.status, 200);
await generateDraft({...args, writingProfile: updated.payload.profile});
assert(seen.includes('Fixture changed instruction.'));
assert.notEqual(updated.payload.profile.sha256, candidate.studioWritingProfile.sha256);
await assert.rejects(generateDraft({...args, argumentOutline: outline}), /OWNER_APPROVED_ARGUMENT_OUTLINE_REQUIRED/);
await assert.rejects(generateDraft({...args, writingProfile: {...saved, sha256: '0'.repeat(64)}}), /changed after export/i);
assert.equal(calls, 2, 'Invalid approval or profile never reaches the provider');
assert.throws(() => resolveStudioWritingProfile(library.payload.profiles[0]), /saved/i);
console.log('PASS writing profiles: authenticated actual-handler CRUD, exact text, CAS races, period isolation, publication exclusion and real writer input/receipt with no billed calls');
