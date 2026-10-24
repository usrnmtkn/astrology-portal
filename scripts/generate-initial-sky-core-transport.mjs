import fs from 'node:fs';
import { createHash } from 'node:crypto';
const root = new URL('../apps/web/src/content/fallbackArchitectureV3/', import.meta.url);
const bytes = fs.readFileSync(new URL('bundled-sky-core-rows-v3.json', root));
const source = JSON.parse(bytes);
const sourceHashes = { 'bundled-sky-core-rows-v3.json': createHash('sha256').update(bytes).digest('hex') };
function read(name) {
  const data = fs.readFileSync(new URL(name, root));
  sourceHashes[name] = createHash('sha256').update(data).digest('hex');
  return JSON.parse(data);
}
const authored = read('bundled-sky-authored-cards-v3.json');
const reader = read('bundled-initial-reader-rows-v3.json');
const latest = rows => [...new Map(rows.map(row => [row.contentKey, row])).values()];
const hooks = latest([...source.hookRows, ...reader.hookRows]);
// The list renders complete canonical placements and the separate Moon units.
// Lunation articles, aspect cards and personal readings load their whole units
// through the existing full-reader gate rather than the startup module graph.
const neededOnList = row => /^fallback-hook\/(?:dignity-line\/fall\/moon|transit-retro\/|sky-placement\/moon(?:\/|$))/u.test(row.contentKey);
const vocabulary = latest([...source.vocabularyRows, ...reader.vocabularyRows]);
const initialVocabulary = row => /^fallback-vocab\/(?:sky-|planet-function\/|planet-topic\/|house-topic\/|dignity-glossary\/|transit-label-noun\/)/u.test(row.contentKey);
const initialTemplate = row => row.contentKey === 'fallback-template/sky-placement-frame-v3';
const initial = { authoredCards: [], hookRows: hooks.filter(neededOnList),
  vocabularyRows: vocabulary.filter(initialVocabulary), templates: reader.templates.filter(initialTemplate) };
const support = { authoredCards: latest([...authored.authoredCards, ...reader.authoredCards]),
  hookRows: hooks.filter(row => !neededOnList(row)), vocabularyRows: vocabulary.filter(row => !initialVocabulary(row)),
  templates: reader.templates.filter(row => !initialTemplate(row)) };
if (new Set([...initial.hookRows, ...support.hookRows].map(row => row.contentKey)).size !== hooks.length) throw new Error('Sky core transport must preserve the complete source inventory.');
for (const [name, rows] of [['initial-sky-core-transport-v1', initial], ['deferred-reader-support-transport-v1', support]]) {
  const value = JSON.stringify({ ...rows, sourceSha256: sourceHashes['bundled-sky-core-rows-v3.json'], sourceHashes }) + '\n';
  const target = new URL(`${name}.json`, root);
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== value) throw new Error(`${name} is stale.`);
  } else fs.writeFileSync(target, value);
}
// Packaging consults only membership, so the list carries the exact existing
// key inventory for its scope. Full readers retain the complete manifest.
const manifestBytes = fs.readFileSync(new URL('bundled-core-manifest-v3.json', root));
const keys = JSON.parse(manifestBytes).keys.filter(key => {
  const content_key = key.slice(key.indexOf(':') + 1);
  return /^(?:sky-(?:context|nodes|lilith|lunation|v4)\/|sky-placement\/(?:seasonal-context|lunar-context)\/|fallback-vocab\/|fallback-template\/sky)/u.test(content_key)
    || content_key.startsWith('fallback-hook/sky-') && !content_key.startsWith('fallback-hook/sky-aspect-');
});
const keyIndex = JSON.stringify({ keys, sourceSha256: createHash('sha256').update(manifestBytes).digest('hex') }) + '\n';
const keyTarget = new URL('initial-sky-core-keys-v1.json', root);
if (process.argv.includes('--check')) {
  if (!fs.existsSync(keyTarget) || fs.readFileSync(keyTarget, 'utf8') !== keyIndex) throw new Error('initial-sky-core-keys-v1 is stale.');
} else fs.writeFileSync(keyTarget, keyIndex);
console.log('Sky startup retains its complete source units; full readers retain every deferred article, aspect and personal-effect unit.');
