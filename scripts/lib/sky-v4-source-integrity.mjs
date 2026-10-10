import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { skyV4ContentStudioRecords } from '../../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs';
const sha256 = value => createHash('sha256').update(value).digest('hex');

export function assertSkyV4SourceIntegrity(bytes, historicalApprovalHash) {
  // The approval's container hash predates the clean-history privacy rewrite.
  // b9b4d6c768d2644eccb0599dca9c807edfa7a2b3 later removed source metadata.
  // Keep that historical record unchanged and pin the current container AND
  // all approved reader fields. The latter fingerprint also matches the first
  // clean-repository stage at 80586230d (280 complete reader records).
  assert.equal(historicalApprovalHash, '9b91e715bea63a2c835001783240122aad1e000b3982d68bfebbb3cef690a750');
  assert.equal(sha256(bytes), '1709d6c36961c6cb609494cf69d16ca44e1af535fe7c8602d5be66e74211a971');
  const fields = skyV4ContentStudioRecords(JSON.parse(bytes))
    .filter(row => row.owner_approved)
    .map(row => [row.contentKey, Object.fromEntries(row.owner_approved_fields.map(field => [field,
      field.split('.').reduce((value, key) => value?.[key], row)
    ]))]);
  assert.equal(fields.length, 280);
  assert.equal(sha256(JSON.stringify(fields)), '38117ca3cf1952f4ecea0119ac3bfd5b4fc02ea93e91290a8e59fa907a215f09');
}
