// Test-only projection through the existing, field-scoped September 4 release.
// Old approval evidence stays immutable; current copy must match its later grant.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const read = path => JSON.parse(fs.readFileSync(new URL(`../../${path}`, import.meta.url)));
const hash = text => createHash('sha256').update(text).digest('hex');
const authorizationPath = 'packages/astro-knowledge/review/transit-aspect-you-refresh-376-owner-live-2026-09-04.json';
const authorization = read(authorizationPath);
const candidates = read(authorization.sourceRecordPath);
assert.equal(hash(fs.readFileSync(new URL(`../../${authorization.sourceRecordPath}`, import.meta.url))), authorization.sourceRecordSha256);
assert.equal(authorization.authority, 'owner');
assert.equal(authorization.decision, 'approve');
assert.equal(authorization.approvedField, 'body_you');
assert.ok(authorization.capabilities.includes('serving'));
const byKey = new Map(candidates.records.map(row => [row.contentKey, row]));
const members = new Map(authorization.members.map(row => [row.contentKey, row]));
export function priorYouTransitBody(row) {
  const candidate = byKey.get(row.contentKey);
  if (!candidate) return row.body_you;
  assert.equal(hash(candidate.priorBodyYou), candidate.priorBodyYouSha256);
  assert.equal(hash(candidate.proposedBodyYou), candidate.proposedBodyYouSha256);
  assert.equal(members.get(row.contentKey)?.payloadSha256, candidate.proposedBodyYouSha256);
  assert.equal(row.body_you, candidate.proposedBodyYou, `${row.contentKey}: current You passage must match the later authorized revision`);
  assert.equal(row.body_you_approval?.recordPath, authorizationPath);
  assert.equal(row.body_you_approval?.payloadSha256, candidate.proposedBodyYouSha256);
  return candidate.priorBodyYou;
}
