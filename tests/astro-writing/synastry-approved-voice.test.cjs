const assert = require('node:assert/strict');
const { test } = require('node:test');
const { withApprovedSynastryVoice, synastryVoicePromptReferences } = require('../../api/_lib/synastry-approved-voice.cjs');
const { syntheticLatestTen, syntheticApprovedTen, syntheticSynastryVoice, encodedSynastryVoice, installSyntheticSynastryApproval } = require('../fixtures/synastry-approved-voice.cjs');

test('primary natal benchmarks preserve complete published units without duplicating explicit references', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const source = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../data/writing/synastry-primary-style-20261024.json'), 'utf8'));
  const published = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../packages/astro-knowledge/canonical-content/index/canonical-content-index.json'), 'utf8'));
  const explicit = { sourceSnapshot: { positiveVoiceReferences: source.references } };
  const original = JSON.stringify(explicit);
  const selected = withApprovedSynastryVoice(explicit);
  assert.equal(JSON.stringify(explicit), original);
  assert.deepEqual(selected.sourceSnapshot.primarySynastryStyleReferences, source.references);
  const prompt = synastryVoicePromptReferences(selected.sourceSnapshot);
  assert.deepEqual(prompt.primaryNatalStyleBenchmarks, source.references);
  assert.deepEqual(prompt.supportingSynastryExamples, []);
  for (const reference of source.references) {
    assert.equal(require('node:crypto').createHash('sha256').update(reference.text).digest('hex'), reference.sha256);
    const contentHash = reference.publishedSourcePath.match(/#contentSha256=([a-f0-9]{64})\//u)[1];
    assert.equal(published.contentBlobs.find(blob => blob.contentSha256 === contentHash)?.byPerspective.you.body, reference.text,
      'The primary reference is the complete published natal passage, including its final sentence.');
  }
  const invalid = structuredClone(selected);
  invalid.sourceSnapshot.primarySynastryStyleReferences[0].text += ' Changed.';
  assert.throws(() => withApprovedSynastryVoice(invalid), /PRIMARY_STYLE_UNAVAILABLE/);
  assert.throws(() => synastryVoicePromptReferences(invalid.sourceSnapshot), /PRIMARY_STYLE_UNAVAILABLE/);
  const originalRead = fs.readFileSync;
  try {
    fs.readFileSync = function(file, ...args) {
      if (String(file).endsWith('/synastry-primary-style-20261024.json')) return JSON.stringify({ ...source, references: source.references.slice(1) });
      return originalRead.call(this, file, ...args);
    };
    assert.throws(() => withApprovedSynastryVoice(explicit), /PRIMARY_STYLE_UNAVAILABLE/);
  } finally { fs.readFileSync = originalRead; }
});

test('protected defaults preserve complete approved units and bind a text-free document receipt', () => {
  const previous = process.env.PRIVATE_REPORT_DOCUMENTS;
  const previousVoice = process.env.PRIVATE_SYNASTRY_VOICE_REFERENCES;
  delete process.env.PRIVATE_SYNASTRY_VOICE_REFERENCES;
  const restore = installSyntheticSynastryApproval();
  try {
    process.env.PRIVATE_REPORT_DOCUMENTS = encodedSynastryVoice();
    const input = { facts: {}, sourceSnapshot: { existingDraft: { text: 'Synthetic preserved draft.' } } };
    const before = JSON.stringify(input);
    const result = withApprovedSynastryVoice(input);
    assert.equal(JSON.stringify(input), before);
    assert.equal(result.sourceSnapshot.primarySynastryStyleReferences?.length, 4, 'Studio defaults must include the four owner-designated natal style benchmarks.');
    assert.equal(result.sourceSnapshot.primarySynastryStyleReferences[0].selectionPriority, 'primary_owner_designated_style');
    assert.equal(result.sourceSnapshot.positiveVoiceReferences.length, 28);
    for (const [i, reference] of result.sourceSnapshot.positiveVoiceReferences.entries()) {
      assert.equal(reference.text, [...syntheticSynastryVoice().entries, ...syntheticApprovedTen().entries, ...syntheticLatestTen().entries][i].text);
      assert.equal(reference.sha256, [...syntheticSynastryVoice().entries, ...syntheticApprovedTen().entries, ...syntheticLatestTen().entries][i].sha256);
      assert(!JSON.stringify(result.sourceSnapshot.protectedSynastryVoice).includes(reference.text));
    }
    assert.equal(result.sourceSnapshot.protectedSynastryVoice.referenceCount, 28);
    assert.deepEqual(result.sourceSnapshot.protectedSynastryVoice.sources.map(source => source.referenceCount), [8, 10, 10]);
    assert.deepEqual(result.sourceSnapshot.protectedSynastryVoice.sources.map(source => source.approvalToolCall), [
      syntheticSynastryVoice().approval.toolCall, syntheticApprovedTen().approval.toolCall, syntheticLatestTen().approval.toolCall
    ]);
    assert.equal(withApprovedSynastryVoice(result), result, 'Explicit complete source selection retains precedence.');
    const changed = syntheticSynastryVoice(); changed.entries[0].text += ' Changed.';
    process.env.PRIVATE_REPORT_DOCUMENTS = encodedSynastryVoice(changed);
    assert.throws(() => withApprovedSynastryVoice(input), /APPROVED_VOICE_UNAVAILABLE/);
    for (const mutate of [
      bundle => { bundle.approval.toolCall = 'unverified'; },
      bundle => { bundle.entries.pop(); },
      bundle => { bundle.entries[1].caseId = bundle.entries[0].caseId; },
      bundle => { bundle.entries[0] = null; },
      bundle => { bundle.entries[0].text += ' Unapproved change.'; bundle.entries[0].sha256 = require('node:crypto').createHash('sha256').update(bundle.entries[0].text).digest('hex'); }
    ]) {
      const invalid = syntheticSynastryVoice(); mutate(invalid);
      process.env.PRIVATE_REPORT_DOCUMENTS = encodedSynastryVoice(invalid);
      assert.throws(() => withApprovedSynastryVoice(input), /APPROVED_VOICE_UNAVAILABLE/);
    }
    for (const mutate of [
      bundle => { bundle.approval.exactOwnerStatement += ' Changed.'; },
      bundle => { bundle.approval.sourceSha256 = 'different-attachment'; },
      bundle => { bundle.approval.scope = ['publication_only']; },
      bundle => { bundle.approval.toolCall = syntheticSynastryVoice().approval.toolCall; },
      bundle => { bundle.entries[0].text += ' Changed.'; bundle.entries[0].sha256 = require('node:crypto').createHash('sha256').update(bundle.entries[0].text).digest('hex'); }
    ]) {
      const ten = syntheticApprovedTen(); mutate(ten);
      process.env.PRIVATE_REPORT_DOCUMENTS = encodedSynastryVoice(syntheticSynastryVoice(), ten);
      assert.throws(() => withApprovedSynastryVoice(input), /APPROVED_VOICE_UNAVAILABLE/);
    }
    process.env.PRIVATE_REPORT_DOCUMENTS = encodedSynastryVoice(syntheticSynastryVoice(), null);
    assert.throws(() => withApprovedSynastryVoice(input), /APPROVED_VOICE_UNAVAILABLE/, 'The earlier eight do not silently replace the selected ten.');
    for (const mutate of [
      bundle => { delete bundle.approval.voiceDesignationStatement; },
      bundle => { bundle.approval.voiceDesignationStatement += ' Changed.'; },
      bundle => { bundle.approval.scope = ['publication_only']; }
    ]) {
      const latest = syntheticLatestTen(); mutate(latest);
      process.env.PRIVATE_REPORT_DOCUMENTS = encodedSynastryVoice(syntheticSynastryVoice(), syntheticApprovedTen(), latest);
      assert.throws(() => withApprovedSynastryVoice(input), /APPROVED_VOICE_UNAVAILABLE/, 'Publication alone cannot establish voice use.');
    }
    process.env.PRIVATE_REPORT_DOCUMENTS = encodedSynastryVoice(syntheticSynastryVoice(), syntheticApprovedTen(), null);
    assert.throws(() => withApprovedSynastryVoice(input), /APPROVED_VOICE_UNAVAILABLE/, 'Missing latest references cannot silently revert to the prior eighteen.');
    process.env.PRIVATE_REPORT_DOCUMENTS = 'invalid';
    assert.throws(() => withApprovedSynastryVoice(input), /APPROVED_VOICE_UNAVAILABLE/);
    assert.equal(withApprovedSynastryVoice(result), result, 'An explicit selection does not depend on a default store.');
  } finally {
    restore();
    if (previous === undefined) delete process.env.PRIVATE_REPORT_DOCUMENTS;
    else process.env.PRIVATE_REPORT_DOCUMENTS = previous;
    if (previousVoice === undefined) delete process.env.PRIVATE_SYNASTRY_VOICE_REFERENCES;
    else process.env.PRIVATE_SYNASTRY_VOICE_REFERENCES = previousVoice;
  }
});

test('dedicated writing storage preserves report storage and fails closed when corrupt', () => {
  const previous = process.env.PRIVATE_REPORT_DOCUMENTS;
  const previousVoice = process.env.PRIVATE_SYNASTRY_VOICE_REFERENCES;
  const restore = installSyntheticSynastryApproval();
  const { createHash } = require('node:crypto');
  const { gzipSync } = require('node:zlib');
  const { readPrivateReportDocument } = require('../../api/_lib/private-report-documents.cjs');
  try {
    const body = 'Complete synthetic original report. Its final sentence remains unchanged.';
    process.env.PRIVATE_REPORT_DOCUMENTS = gzipSync(JSON.stringify({ schema: 'private-reports/v1', documents: {
      'private:report/general-2026': { body, sha256: createHash('sha256').update(body).digest('hex') }
    } })).toString('base64');
    const reportStore = process.env.PRIVATE_REPORT_DOCUMENTS;
    process.env.PRIVATE_SYNASTRY_VOICE_REFERENCES = encodedSynastryVoice();
    assert.equal(withApprovedSynastryVoice({ sourceSnapshot: {} }).sourceSnapshot.positiveVoiceReferences.length, 28);
    assert.equal(readPrivateReportDocument('private:report/general-2026'), body);
    assert.equal(process.env.PRIVATE_REPORT_DOCUMENTS, reportStore);
    process.env.PRIVATE_REPORT_DOCUMENTS = encodedSynastryVoice();
    process.env.PRIVATE_SYNASTRY_VOICE_REFERENCES = 'invalid';
    assert.throws(() => withApprovedSynastryVoice({ sourceSnapshot: {} }), /APPROVED_VOICE_UNAVAILABLE/,
      'A corrupt dedicated store must not fall back to different report-store evidence.');
  } finally {
    restore();
    if (previous === undefined) delete process.env.PRIVATE_REPORT_DOCUMENTS;
    else process.env.PRIVATE_REPORT_DOCUMENTS = previous;
    if (previousVoice === undefined) delete process.env.PRIVATE_SYNASTRY_VOICE_REFERENCES;
    else process.env.PRIVATE_SYNASTRY_VOICE_REFERENCES = previousVoice;
  }
});
