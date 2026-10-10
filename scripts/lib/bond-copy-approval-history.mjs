// Test-only historical view of the October 5 owner-directed naming revision.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const hash = value => createHash('sha256').update(value).digest('hex');
const read = path => JSON.parse(fs.readFileSync(new URL(`../../${path}`, import.meta.url)));
const namingPath = 'packages/astro-knowledge/review/friend-transit-pronouns-2026-10-05.json';
const restorationPath = 'packages/astro-knowledge/review/between-you-two-name-restoration-2026-10-05.json';
const restoration = read(restorationPath);
assert.equal(restoration.sourceUri, 'thread:01a10c91-1672-7511-becc-bf8ba3189ee0');
assert.equal(restoration.ownerInstruction, 'please put the name back');
const edits = new Map(restoration.edits.map(edit => [`${edit.contentKey}/${edit.field}`, edit]));
export function historicalBondRow(row) {
  if (!row.nameRestoration) return row;
  assert.equal(row.nameRestoration.recordPath, restorationPath);
  const original = read(row.approval.recordPath);
  assert.equal(original.contentKey, row.contentKey);
  assert.equal(hash(JSON.stringify(original.payload)), row.approval.payloadSha256);
  const result = { ...row };
  for (const field of ['body_you', 'body_they']) {
    const edit = edits.get(`${row.contentKey}/${field}`);
    if (!edit) {
      assert.equal(row[field], original.payload[field], `${row.contentKey}/${field}: an unlisted field must retain its original copy`);
      continue;
    }
    assert.equal(hash(row[field]), edit.afterSha256, `${row.contentKey}/${field}: restored copy drift`);
    assert.equal(row[`${field}_approval`]?.recordPath, restorationPath);
    assert.equal(row[`${field}_approval`]?.payloadSha256, edit.afterSha256);
    result[field] = original.payload[field];
    for (const suffix of ['sha256', 'approval', 'approved_via']) delete result[`${field}_${suffix}`];
  }
  result.source_keys = row.source_keys.filter(key => key !== namingPath && key !== restorationPath);
  delete result.nameRestoration;
  return result;
}
