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
function syntheticApprovedTen() {
  return { schema: 'synastry-approved-voice/v1', approval: {
    sourceUri: 'thread:01a15c03-cf10-71e3-b5e9-798c9f87bd3b', sourceDate: '2026-10-23',
    toolCall: 'call_dbde683ecad34036a709b8b3520b50fb',
    exactOwnerAnswer: 'Use the second attachment: Ten Synastry Readings (Recommended)',
    exactOwnerStatement: 'Synthetic explicit publication and voice-use statement.',
    sourceSha256: hash('Synthetic selected attachment.'), scope: ['positive_voice_references']
  }, entries: Array.from({ length: 10 }, (_, i) => {
    const text = `Complete synthetic additional reference ${i + 1}. This final sentence is retained too.`;
    return { caseId: `synthetic-ten-${i + 1}`, text, sha256: hash(text) };
  }) };
}
function syntheticLatestTen() {
  const bundle = syntheticApprovedTen();
  Object.assign(bundle.approval, {
    toolCall: 'call_1cde9e68fd9b4d94a73fc0c522236b91', exactOwnerAnswer: 'Approve these ten for publication',
    exactOwnerStatement: 'Synthetic instruction to use the latest approved set for voice.',
    voiceDesignationStatement: 'Synthetic proposal to add the latest set, followed by the explicit owner direction.'
  });
  bundle.entries = Array.from({ length: 10 }, (_, i) => {
    const text = `Complete synthetic latest reference ${i + 1}. The ending belongs to the latest approved collection.`;
    return { caseId: `synthetic-latest-${i + 1}`, text, sha256: hash(text) };
  });
  return bundle;
}
function encodedSynastryVoice(bundle = syntheticSynastryVoice(), ten = syntheticApprovedTen(), latest = syntheticLatestTen()) {
  const documents = {};
  for (const [id, value] of [[source, bundle], ['private:writing/synastry/approved-ten-20261023', ten],
    ['private:writing/synastry/approved-next-ten-20261023', latest]]) {
    if (value === null) continue;
    const body = JSON.stringify(value); documents[id] = { body, sha256: hash(body) };
  }
  return gzipSync(JSON.stringify({ schema: 'private-reports/v1', documents })).toString('base64');
}
function installSyntheticSynastryApproval() {
  const original = fs.readFileSync;
  const bundle = syntheticSynastryVoice();
  const manifest = { schema: 'synastry-voice-approval/v1', sourceId: source,
    sourceUri: bundle.approval.sourceUri, sourceDate: bundle.approval.sourceDate,
    approvalToolCall: bundle.approval.toolCall, exactOwnerAnswer: bundle.approval.exactOwnerAnswer,
    references: bundle.entries.map(entry => ({ caseId: entry.caseId, textSha256: entry.sha256 })) };
  const ten = syntheticApprovedTen();
  const tenManifest = { schema: 'synastry-voice-approval/v1', sourceId: 'private:writing/synastry/approved-ten-20261023',
    sourceUri: ten.approval.sourceUri, sourceDate: ten.approval.sourceDate,
    approvalToolCall: ten.approval.toolCall, exactOwnerAnswer: ten.approval.exactOwnerAnswer,
    ownerStatementSha256: hash(ten.approval.exactOwnerStatement), sourceSha256: ten.approval.sourceSha256,
    references: ten.entries.map(entry => ({ caseId: entry.caseId, textSha256: entry.sha256 })) };
  const latest = syntheticLatestTen();
  const latestManifest = { ...tenManifest, sourceId: 'private:writing/synastry/approved-next-ten-20261023',
    approvalToolCall: latest.approval.toolCall, exactOwnerAnswer: latest.approval.exactOwnerAnswer,
    ownerStatementSha256: hash(latest.approval.exactOwnerStatement),
    voiceDesignationStatementSha256: hash(latest.approval.voiceDesignationStatement),
    references: latest.entries.map(entry => ({ caseId: entry.caseId, textSha256: entry.sha256 })) };
  fs.readFileSync = function(file, ...args) {
    if (String(file).endsWith('/data/writing/synastry-voice-approval-20261023-next-ten.json')) return JSON.stringify(latestManifest);
    if (String(file).endsWith('/data/writing/synastry-voice-approval-20261023.json')) return JSON.stringify(tenManifest);
    if (String(file).endsWith('/data/writing/synastry-voice-approval-20261022.json')) return JSON.stringify(manifest);
    return original.call(this, file, ...args);
  };
  return () => { fs.readFileSync = original; };
}
module.exports = { syntheticLatestTen, syntheticApprovedTen, syntheticSynastryVoice, encodedSynastryVoice, installSyntheticSynastryApproval };
