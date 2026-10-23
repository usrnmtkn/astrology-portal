const assert = require('node:assert/strict');
const { test } = require('node:test');
const { withApprovedSynastryVoice } = require('../../api/_lib/synastry-approved-voice.cjs');
const { syntheticApprovedTen, syntheticSynastryVoice, encodedSynastryVoice, installSyntheticSynastryApproval } = require('../fixtures/synastry-approved-voice.cjs');

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
    assert.equal(result.sourceSnapshot.positiveVoiceReferences.length, 18);
    for (const [i, reference] of result.sourceSnapshot.positiveVoiceReferences.entries()) {
      assert.equal(reference.text, [...syntheticSynastryVoice().entries, ...syntheticApprovedTen().entries][i].text);
      assert.equal(reference.sha256, [...syntheticSynastryVoice().entries, ...syntheticApprovedTen().entries][i].sha256);
      assert(!JSON.stringify(result.sourceSnapshot.protectedSynastryVoice).includes(reference.text));
    }
    assert.equal(result.sourceSnapshot.protectedSynastryVoice.referenceCount, 18);
    assert.deepEqual(result.sourceSnapshot.protectedSynastryVoice.sources.map(source => source.referenceCount), [8, 10]);
    assert.deepEqual(result.sourceSnapshot.protectedSynastryVoice.sources.map(source => source.approvalToolCall), [
      syntheticSynastryVoice().approval.toolCall, syntheticApprovedTen().approval.toolCall
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
    assert.equal(withApprovedSynastryVoice({ sourceSnapshot: {} }).sourceSnapshot.positiveVoiceReferences.length, 18);
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
