import fs from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('../apps/web/src/content/fallbackArchitectureV3/', import.meta.url);
const source = fs.readFileSync(new URL('bundled-sky-placement-rows-v3.json', root));
const rows = JSON.parse(source).hookRows.filter(row => /(?:^|\/)moon\//u.test(row.contentKey));
if (rows.length !== 49 || rows.some(row => !['approved', 'approved_reuse', 'reviewed'].includes(row.review_status))) {
  throw new Error('The complete initial Moon source inventory needs review.');
}
const value = JSON.stringify({
  schema: 'tldr-initial-sky-list-rows/v1',
  sourceSha256: createHash('sha256').update(source).digest('hex'),
  hookRows: rows
}, null, 2) + '\n';
// This is a transport mirror, not another writing-evidence source. The original
// bundled archive remains the indexed authority for every one of these units.
const target = new URL('initial-sky-list-rows-v1.json', root);
if (process.argv.includes('--check')) {
  if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== value) throw new Error('Initial Sky list rows are stale.');
} else fs.writeFileSync(target, value);
console.log('Initial Sky list retains all 49 complete Moon rows from the unchanged placement archive.');
