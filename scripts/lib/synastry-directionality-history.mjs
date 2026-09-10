// Test-only historical projection: keep older approval fingerprints meaningful
// without exempting or rewriting any current serving copy.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { sha256 } from '../release-synastry-directionality.mjs';
const release = JSON.parse(fs.readFileSync(new URL('../../apps/web/src/content/fallbackArchitectureV3/authored-inputs/synastry-directionality-live-v1.json', import.meta.url)));
const prior = JSON.parse(fs.readFileSync(new URL('../../packages/astro-knowledge/review/synastry-directionality-batch-4-live-2026-09-10/prior-canonical-rows.json', import.meta.url)));
export function historicalSynastryRow(row) {
  const patch = release.rows.find(p => p.contentKey === row.contentKey);
  if (!patch) return row;
  const old = prior.rows.find(p => p.contentKey === row.contentKey);
  assert.equal(row.directionality_release_id, release.release_id);
  assert.equal(sha256(row.body_you), patch.approved_body_sha256);
  assert.equal(sha256(row.body_they), patch.expected_before_sha256.body_they);
  for (const field of ['body_you', 'body_they']) assert.equal(sha256(old[field]), patch.expected_before_sha256[field]);
  return old;
}
