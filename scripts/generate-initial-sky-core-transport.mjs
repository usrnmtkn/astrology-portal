import fs from 'node:fs';
import { createHash } from 'node:crypto';
const root = new URL('../apps/web/src/content/fallbackArchitectureV3/', import.meta.url);
const bytes = fs.readFileSync(new URL('bundled-sky-core-rows-v3.json', root));
const source = JSON.parse(bytes);
const deferred = row => /^fallback-hook\/transit-effect-(?:soft|hard)\//u.test(row.contentKey);
const initial = { ...source, hookRows: source.hookRows.filter(row => !deferred(row)) };
const support = { hookRows: source.hookRows.filter(deferred), vocabularyRows: [] };
if (support.hookRows.length !== 404 || new Set([...initial.hookRows, ...support.hookRows].map(row => row.contentKey)).size !== source.hookRows.length) throw new Error('Sky core transport must preserve the complete source inventory.');
for (const [name, rows] of [['initial-sky-core-transport-v1', initial], ['deferred-reader-support-transport-v1', support]]) {
  const value = JSON.stringify({ ...rows, sourceSha256: createHash('sha256').update(bytes).digest('hex') }) + '\n';
  const target = new URL(`${name}.json`, root);
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== value) throw new Error(`${name} is stale.`);
  } else fs.writeFileSync(target, value);
}
console.log('Sky startup retains complete Sky sources; all 404 personal-effect units remain in the full reader support transport.');
