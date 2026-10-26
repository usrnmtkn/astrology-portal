import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { prepareNatalPlacementSectWriting, runNatalPlacementSectWriting, natalPlacementSectDigest, validateNatalPlacementSectDraft } from '../../src/astro-writing/natalPlacementSectWriting.mjs';
import { natalProfileDigest } from '../../src/astro-writing/natalWritingProfile.mjs';
import openAI from '../../src/astro-writing/openAIResponses.cjs';

function fixture(audience = 'you') {
  const selection = { planet: 'jupiter', sign: 'leo', house: 3, sect: 'day', audience };
  const contentKey = `cms/natal-planet-sect/${audience}/jupiter/leo/house-3/day`;
  const text = 'Complete synthetic voice reference. Final voice sentence.';
  const profile = { schema: 'natal-writing-profile/v1', sourceUri: 'thread:synthetic-test', surfaces: ['you-natal', 'friends-natal'], guidance: 'Synthetic natal guidance.',
    voiceReferences: [{ id: 'voice', role: 'owner-selected-style', text, sha256: natalProfileDigest(text), sourceUri: 'file:/synthetic-voice', factUseAuthorized: false, ownerAuthored: false, readerServing: false }],
    comparisons: [{ id: 'rejection', role: 'owner-rejected-draft', text: 'Complete rejected synthetic draft.', sha256: natalProfileDigest('Complete rejected synthetic draft.'), ownerReason: 'Synthetic rejection.', sourceUri: 'thread:synthetic-test', useAsPositiveVoiceEvidence: false, ownerApproved: false }] };
  const source = (role, id = role) => ({ id, role, text: `${role} complete source. Final ${role} sentence.`, sourceUri: 'file:/synthetic-source', sha256: natalPlacementSectDigest(`${role} complete source. Final ${role} sentence.`), selection, ...(role === 'correction' ? { scope: 'natal' } : {}) });
  return { family: 'natal-placement-sect', selection, contentKey, brief: 'Develop the usefulness of third-house support without repeating the sign reading.', previewNames: ['SampleName'],
    target: { surface: audience === 'you' ? 'you-natal' : 'friends-natal', route: audience === 'you' ? 'you' : 'friends', renderer: 'renderNatalPlacement', contentKeyFamily: 'cms/natal-planet-sect', temporality: 'natal', voiceMode: audience === 'you' ? 'second_person' : 'friend' },
    facts: { contextKind: 'editorial-combination', planet: 'jupiter', sign: 'leo', house: 3, houseSystem: 'whole-sign', sect: 'day', motion: 'direct' },
    writingProfile: { id: 'fixture', revision: 1, updatedAt: '2026-10-25T00:00:00Z', profile, sha256: natalProfileDigest(profile) },
    sources: [source('base'), source('generic-sect', `cms/natal-planet-sect/${audience}/jupiter/day`), source('meaning'), source('correction')],
    feedback: { complete: true, retrievedAt: '2026-10-25T00:00:00Z', targetKeys: ['writing/all', 'writing/natal', contentKey, `cms/natal-planet-sect/${audience}/jupiter/day`],
      stores: ['studio_writing_feedback', 'studio_memory_feedback'].map(name => ({ name, status: 'retrieved', rows: [] })) } };
}

test('complete context and designated natal voice reach the actual governed provider request once', async () => {
  for (const audience of ['you', 'they']) {
    const request = fixture(audience);
    const before = JSON.stringify(request);
    const prepared = await runNatalPlacementSectWriting(request, { prepareOnly: true });
    assert.equal(prepared.dispatched, false);
    assert.equal(prepared.report.billedCalls, 0);
    assert.equal(JSON.stringify(request), before);
    const provider = prepared.request;
    const packet = JSON.parse(provider.input);
    assert.deepEqual(packet.sources, request.sources);
    assert.deepEqual(packet.facts, request.facts);
    assert.deepEqual(packet.natalProfile.voiceReferences, request.writingProfile.profile.voiceReferences);
    assert.deepEqual(packet.natalProfile.correctionContext, request.writingProfile.profile.comparisons);
    assert.match(provider.instructions, /NATAL READER VOICE/);
    assert.match(provider.instructions, /complete replacement/);
    assert.match(provider.instructions, /GHOSTWRITER CRAFT GUIDANCE/);
    let calls = 0;
    await openAI.callOpenAIResponses({ apiKey: 'synthetic', role: provider.role, family: provider.family, surface: provider.surface, governedInstructions: provider.instructions,
      request: { model: 'synthetic-model', input: provider.input, text: { format: { type: 'json_schema', name: 'fixture', strict: true, schema: provider.schema } } },
      fetchImpl: async (_url, options) => {
        calls++;
        const sent = JSON.parse(options.body);
        assert.equal(sent.instructions, provider.instructions, 'No older article instructions or compulsory advice may be appended');
        assert.equal(sent.input, provider.input);
        assert.equal(sent.instructions.match(/NATAL READER VOICE natal-reader/g).length, 1);
        return Response.json({ id: 'resp_fixture', output_text: '{}' });
      } });
    assert.equal(calls, 1);
    assert.equal(prepared.ownerApproved, false);
    assert.equal(prepared.promotionAuthorized, false);
  }
});

test('mismatched house, source, sect, feedback or voice stops before a writer call', async () => {
  const changes = [
    r => { r.selection.house = 4; }, r => { r.selection.sect = 'night'; }, r => { r.selection.house = 0; },
    r => { delete r.selection.house; delete r.facts.house; r.contentKey = 'cms/natal-planet-sect/you/jupiter/leo/day'; },
    r => { r.facts.houseSystem = 'quadrant'; }, r => { r.sources[0].selection = { ...r.selection, house: 4 }; },
    r => { r.sources[0].text += ' edited'; }, r => { r.sources = r.sources.filter(s => s.role !== 'meaning'); },
    r => { r.feedback.targetKeys = r.feedback.targetKeys.filter(k => k !== 'writing/natal'); },
    r => { r.feedback.stores.pop(); }, r => { delete r.writingProfile; },
    r => { r.writingProfile.profile.voiceReferences[0].text += ' changed'; },
    r => { delete r.sources.find(s => s.role === 'correction').scope; },
    r => { r.sources.find(s => s.role === 'correction').scope = 'sky-ingress'; }
  ];
  let calls = 0;
  for (const change of changes) {
    const request = fixture(); change(request);
    await assert.rejects(runNatalPlacementSectWriting(request, { authorized: true, writerClient: async () => { calls++; return { body: 'Synthetic response.' }; } }));
  }
  await assert.rejects(runNatalPlacementSectWriting(fixture(), { writerClient: async () => { calls++; } }), /authorization/);
  assert.equal(calls, 0);
});

test('scoped corrections and complete supplementary voice stay separate from meaning and rejected drafts', async () => {
  const request = fixture('they');
  const voice = { id: 'supplementary-voice', role: 'voice', text: 'Complete synthetic approved source. Its final sentence.',
    sourceUri: 'file:/synthetic-approved-voice', approvalSourceUri: 'thread:synthetic-approval', ownerApproved: true,
    factUseAuthorized: false, readerServing: false };
  request.sources.push({ ...voice, sha256: natalPlacementSectDigest(voice.text) });
  const packet = prepareNatalPlacementSectWriting(request);
  assert.deepEqual(JSON.parse(packet.input).sources.at(-1), request.sources.at(-1));
  assert.match(packet.instructions, /They do not require a separate sign summary/);
  assert.match(packet.instructions, /does not establish the person's ability to recognize help/);
  assert.match(packet.instructions, /External craft observations are editorial analysis/);
  request.sources.at(-1).factUseAuthorized = true;
  await assert.rejects(runNatalPlacementSectWriting(request, { authorized: true, writerClient: () => { throw Error('must not dispatch'); } }), /voice_authority/);
});

test('the owner natal correction is included while unrelated passage feedback is excluded', () => {
  const request = fixture();
  request.feedback.stores[0].rows = ['writing/natal', 'unrelated/exact-key'].map((key, index) => ({ id: `fixture-${index}`, version: 1, kind: 'rejection', status: 'active', target_keys: [key], rejected_text: 'Whole rejected fixture.', owner_reason: 'Owner correction fixture.', source_roles: null, source_uri: 'thread:synthetic-test', source_date: '2026-10-25T00:00:00Z' }));
  const packet = JSON.parse(prepareNatalPlacementSectWriting(request).input);
  assert.deepEqual(packet.feedback.explicit.rows.map(row => row.id), ['fixture-0']);
});

test('one authorized injected draft stays unapproved and keeps Friend placeholders', async () => {
  const request = fixture('they');
  let calls = 0;
  const result = await runNatalPlacementSectWriting(request, { authorized: true, writerClient: async () => { calls++; return { body: '{{ownerName}} complete synthetic opening.\n\nComplete synthetic ending.' }; } });
  assert.equal(calls, 1);
  assert.deepEqual(result.findings, []);
  assert.equal(result.ownerApproved, false);
  assert.equal(result.needs_review, true);
  assert.equal(result.report.retries, 0);
  assert(validateNatalPlacementSectDraft({ body: 'SampleName opening.' }, request).includes('preview_name_leak'));
  assert(validateNatalPlacementSectDraft({ body: '{{ownerName}} unknown {{birthDate}}.' }, request).includes('audience_placeholder'));
});

test('the canonical CLI prepares without credentials and refuses dispatch without explicit authorization', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'natal-sect-prep-'));
  const input = path.join(directory, 'request.json'), output = path.join(directory, 'prepared.json');
  fs.writeFileSync(input, JSON.stringify(fixture()));
  const args = ['scripts/run-astro-writing-harness.mjs', '--request', input, '--out', output];
  const prepared = spawnSync(process.execPath, [...args, '--prepare-only'], { cwd: process.cwd(), encoding: 'utf8' });
  assert.equal(prepared.status, 0, prepared.stderr);
  assert.equal(JSON.parse(fs.readFileSync(output)).dispatched, false);
  const denied = spawnSync(process.execPath, args, { cwd: process.cwd(), encoding: 'utf8' });
  assert.notEqual(denied.status, 0);
  assert.match(denied.stderr, /explicit owner authorization/);
  fs.rmSync(directory, { recursive: true, force: true });
});
