import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const history = JSON.parse(fs.readFileSync(new URL('../fixtures/content-suite-calendar-history.json', import.meta.url)));
export function historicalCalendarRow(row) {
  const change = history.rows.find(entry => entry.contentKey === row.contentKey);
  if (!change) return row;
  assert.equal(createHash('sha256').update(JSON.stringify(row)).digest('hex'), change.currentRowSha256, `${row.contentKey}: recorded Calendar revision drifted`);
  return change.previous;
}
