const { createHash } = require('node:crypto');
const { gzipSync } = require('node:zlib');
const fs = require('node:fs');
const source = 'private:writing/synastry/approved-sample-20261022';
const hash = text => createHash('sha256').update(text).digest('hex');
// Synthetic storage/approval-shape fixture only, never owner prose evidence.
function syntheticSynastryVoice() {
  return { schema: 'synastry-approved-voice/v1', approval: {
    sourceUri: 'thread:01a15c03-cf10-71e3-b5e9-798c9f87bd3b', sourceDate: '2026-10-22',
    toolCall: 'call_523ff83c43574e3eab4fe2bdeb55d597', exactOwnerAnswer: 'Approve all eight as written'
  }, entries: Array.from({ length: 8 }, (_, i) => {
    const text = `Complete synthetic voice reference ${i + 1}. Its entire final sentence remains present.`;
    return { caseId: `synthetic-${i + 1}`, text, sha256: hash(text) };
  }) };
}
function encodedSynastryVoice(bundle = syntheticSynastryVoice()) {
  const body = JSON.stringify(bundle);
  return gzipSync(JSON.stringify({ schema: 'private-reports/v1', documents: { [source]: { body, sha256: hash(body) } } })).toString('base64');
}
function installSyntheticSynastryApproval() {
  const original = fs.readFileSync;
  const bundle = syntheticSynastryVoice();
  const manifest = { schema: 'synastry-voice-approval/v1', sourceId: source,
    sourceUri: bundle.approval.sourceUri, sourceDate: bundle.approval.sourceDate,
    approvalToolCall: bundle.approval.toolCall, exactOwnerAnswer: bundle.approval.exactOwnerAnswer,
    references: bundle.entries.map(entry => ({ caseId: entry.caseId, textSha256: entry.sha256 })) };
  fs.readFileSync = function(file, ...args) {
    if (String(file).endsWith('/data/writing/synastry-voice-approval-20261022.json')) return JSON.stringify(manifest);
    return original.call(this, file, ...args);
  };
  return () => { fs.readFileSync = original; };
}
module.exports = { syntheticSynastryVoice, encodedSynastryVoice, installSyntheticSynastryApproval };
