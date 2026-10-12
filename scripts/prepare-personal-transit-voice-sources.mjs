import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';

// Import an already recorded exact-text voice assignment. This does not infer
// voice eligibility from serving approval or promote any reader content.
const [approvedPath, assignmentPath, currentPath, outputPath] = process.argv.slice(2);
if (!outputPath) throw Error('Usage: prepare-personal-transit-voice-sources.mjs approved-catalog.json role-assignment.json current-catalog.json private-output.json');
const hash = value => createHash('sha256').update(value).digest('hex');
const approvedBytes = readFileSync(approvedPath), assignmentBytes = readFileSync(assignmentPath);
const approved = JSON.parse(approvedBytes), assignment = JSON.parse(assignmentBytes), current = JSON.parse(readFileSync(currentPath));
const role = assignment.sourceRoleAssignment;
if (!Array.isArray(approved) || !Array.isArray(current) || role?.sourceJsonSha256 !== hash(approvedBytes)
  || role.contentFamily !== 'authored/transit-aspect' || role.positiveProseEvidence !== true
  || role.primarySurfaceEvidence !== true || !/^thread:/u.test(assignment.sourceUri ?? '')) throw Error('EXACT_VOICE_ROLE_ASSIGNMENT_REQUIRED');
const byKey = new Map(current.map(row => [row.contentKey, row]));
if (byKey.size !== current.length) throw Error('DUPLICATE_CURRENT_SOURCE');
const passages = [], exclusions = [];
for (const record of approved) {
  if (record.ownerApproved !== true || !/^authored\/transit-aspect\/[^/]+\/[^/]+\/(conjunction|sextile|square|trine|opposition)$/u.test(record.contentKey)) throw Error('INVALID_APPROVED_TRANSIT_SOURCE');
  for (const field of ['body_you', 'body_they']) {
    const text = record[field], latest = byKey.get(record.contentKey);
    if (typeof text !== 'string' || !text.trim()) throw Error('COMPLETE_PASSAGE_REQUIRED');
    if (!latest || latest.ownerApproved !== true || latest[field] !== text) {
      exclusions.push({ contentKey: record.contentKey, field, reason: 'No longer the exact approved version in the current catalog.' });
      continue;
    }
    const sha256 = hash(text);
    passages.push({ id: `transit-owner-20261007:${record.contentKey.slice('authored/transit-aspect/'.length)}:${field}`,
      contentKey: record.contentKey, field, text, sha256,
      source: assignment.sourceUri, sourceSha256: hash(approvedBytes), ownerApproved: true,
      role: 'positive-voice-evidence', status: 'current', roleSource: assignment.sourceUri,
      roleTextSha256: sha256 });
  }
}
const document = { schema: 'personal-transit-writing-sources/v1', version: `owner-role-${hash(assignmentBytes).slice(0, 16)}`,
  passages, meanings: [], provenance: { approvalSource: assignment.sourceUri,
    approvalDocumentSha256: hash(approvedBytes), roleAssignmentSha256: hash(assignmentBytes),
    currentCatalogSha256: hash(readFileSync(currentPath)), exclusions,
    authorship: 'Not asserted. Exact owner approval and explicit positive-voice assignment are preserved separately.' } };
mkdirSync(dirname(resolve(outputPath)), { recursive: true, mode: 0o700 });
writeFileSync(outputPath, JSON.stringify(document, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ passages: passages.length, excluded: exclusions.length, meanings: 0,
  sourceVersion: document.version, contentWrites: 0, publication: false, providerCalls: 0 }));
