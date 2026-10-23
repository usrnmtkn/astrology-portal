const assert = require('node:assert/strict');
const { test } = require('node:test');
const { withApprovedSynastryVoice } = require('../../api/_lib/synastry-approved-voice.cjs');
const { syntheticSynastryVoice, encodedSynastryVoice, installSyntheticSynastryApproval } = require('../fixtures/synastry-approved-voice.cjs');

test('protected defaults preserve complete approved units and bind a text-free document receipt', () => {
  const previous = process.env.PRIVATE_REPORT_DOCUMENTS;
  const restore = installSyntheticSynastryApproval();
  try {
    process.env.PRIVATE_REPORT_DOCUMENTS = encodedSynastryVoice();
    const input = { facts: {}, sourceSnapshot: { existingDraft: { text: 'Synthetic preserved draft.' } } };
    const before = JSON.stringify(input);
    const result = withApprovedSynastryVoice(input);
    assert.equal(JSON.stringify(input), before);
    assert.equal(result.sourceSnapshot.positiveVoiceReferences.length, 8);
    for (const [i, reference] of result.sourceSnapshot.positiveVoiceReferences.entries()) {
      assert.equal(reference.text, syntheticSynastryVoice().entries[i].text);
      assert.equal(reference.sha256, syntheticSynastryVoice().entries[i].sha256);
      assert(!JSON.stringify(result.sourceSnapshot.protectedSynastryVoice).includes(reference.text));
    }
    assert.equal(result.sourceSnapshot.protectedSynastryVoice.referenceCount, 8);
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
    process.env.PRIVATE_REPORT_DOCUMENTS = 'invalid';
    assert.throws(() => withApprovedSynastryVoice(input), /APPROVED_VOICE_UNAVAILABLE/);
    assert.equal(withApprovedSynastryVoice(result), result, 'An explicit selection does not depend on a default store.');
  } finally {
    restore();
    if (previous === undefined) delete process.env.PRIVATE_REPORT_DOCUMENTS;
    else process.env.PRIVATE_REPORT_DOCUMENTS = previous;
  }
});
