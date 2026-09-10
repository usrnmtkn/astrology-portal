import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { classifySynastryDirectionality } from './synastry-directionality-human-review.mjs';
export const sha256 = (text) => createHash('sha256').update(text).digest('hex');
const fail = (message) => { throw new Error(`Synastry release: ${message}`); };
export function releaseSynastryDirections(rows, release) {
  if (release.schema !== 'synastry-directionality-live/v1' || release.directionality_mode !== 'viewer-centered-synastry-v1' || !release.release_id || !release.approved_at || !release.approval_source || !release.serving_authorization_source || !release.approval_record || !release.serving_authorized_at || !release.rows?.length) fail('missing approval or serving authorization');
  const seen = new Set();
  const output = structuredClone(rows);
  for (const patch of release.rows) {
    const key = patch.contentKey;
    if (seen.has(key)) fail(`duplicate patch ${key}`);
    seen.add(key);
    const matches = output.filter(r => r.contentKey === key);
    if (matches.length !== 1) fail(`expected one canonical row: ${key}`);
    const row = matches[0];
    const decision = classifySynastryDirectionality(key);
    if (decision.action !== 'AUTHOR_REVERSE') fail(`${key}: ${decision.action}`);
    const [, , first, second, aspect] = key.split('/');
    if (!['conjunction', 'hard', 'soft'].includes(aspect)) fail(`invalid aspect family ${key}`);
    if (decision.existingSemanticDirection !== patch.existingSemanticDirection || decision.missingSemanticDirection !== patch.missingSemanticDirection) fail(`human directionality map mismatch ${key}`);
    const target = decision.missingSemanticDirection === `${second}_to_${first}` ? 'body_you' : decision.missingSemanticDirection === `${first}_to_${second}` ? 'body_they' : null;
    if (!target) fail(`unresolved semantic arrow ${key}`);
    const opposite = target === 'body_you' ? 'body_they' : 'body_you';
    if (Object.hasOwn(patch, opposite)) fail(`must preserve ${opposite}: ${key}`);
    const body = patch[target];
    if (typeof body !== 'string' || !body.trim() || sha256(body) !== patch.approved_body_sha256) fail(`approved copy hash mismatch ${key}`);
    const holder = target === 'body_you' ? 'holder2' : 'holder1';
    if (!body.includes(`{{${holder}}}`) || [...body.matchAll(/\{\{(.*?)\}\}/g)].some(m => m[1] !== holder)) fail(`invalid viewer variables ${key}`);
    if (sha256(row[opposite]) !== patch.expected_before_sha256?.[opposite]) fail(`opposite direction changed ${key}`);
    if (row.directionality_release_id === release.release_id) {
      if (row[target] !== body || row[`${target}_semantic_direction`] !== decision.missingSemanticDirection || row[`${opposite}_semantic_direction`] !== decision.existingSemanticDirection) fail(`conflicting existing release ${key}`);
      continue;
    }
    if (row.directionality_release_id || sha256(row[target]) !== patch.expected_before_sha256?.[target]) fail(`unexpected approved-copy overwrite ${key}`);
    if (row.approval) row[`${opposite}_prior_row_approval`] = row.approval;
    row[`${opposite}_review_status`] = row.review_status;
    if (row.approved_via) row[`${opposite}_prior_approved_via`] = row.approved_via;
    row[target] = body;
    row.review_status = 'approved';
    row.approval = { approvalLevel: 'owner_signoff_untraced', approvedAt: release.serving_authorized_at };
    row.approved_via = `owner-approved viewer-centered reverse; ${release.approval_record}`;
    row.directionality_mode = release.directionality_mode;
    row.directionality_release_id = release.release_id;
    row[`${target}_semantic_direction`] = decision.missingSemanticDirection;
    row[`${opposite}_semantic_direction`] = decision.existingSemanticDirection;
    row[`${target}_approval`] = { approvalLevel: 'exact_owner_approved', approvedAt: release.approved_at, servingAuthorizedAt: release.serving_authorized_at, recordPath: release.approval_record, source: release.approval_source, servingSource: release.serving_authorization_source, sha256: patch.approved_body_sha256, wordCount: body.trim().split(/\s+/).length };
    row.source_keys = [...new Set([...(row.source_keys ?? []), release.approval_record])];
  }
  return output;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = 'apps/web/src/content/fallbackArchitectureV3';
  const file = `${root}/source-rows/fallback-source-rows-v3.json`;
  const releasePath = process.argv.find(a => a.startsWith('--release='))?.slice(10) ?? `${root}/authored-inputs/synastry-directionality-live-v1.json`;
  const source = JSON.parse(fs.readFileSync(file, 'utf8'));
  const release = JSON.parse(fs.readFileSync(releasePath, 'utf8'));
  const updated = { ...source, hookRows: releaseSynastryDirections(source.hookRows, release) };
  if (process.argv.includes('--write')) fs.writeFileSync(file, JSON.stringify(updated, null, 1) + '\n');
  console.log(`${release.rows.length} approved directions validated${process.argv.includes('--write') ? ' and canonicalized' : ' (dry run)'}.`);
}
