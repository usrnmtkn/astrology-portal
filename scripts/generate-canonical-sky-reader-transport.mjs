import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { applySkyV4ContinuousCorpusCorrection, skyV4ContentStudioRecords } from '../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs';

const root = new URL('../apps/web/src/content/fallbackArchitectureV3/', import.meta.url);
const sourceHashes = {};
function read(name) {
  const file = `authored-inputs/${name}.json`, bytes = fs.readFileSync(new URL(file, root));
  sourceHashes[file] = createHash('sha256').update(bytes).digest('hex');
  return JSON.parse(bytes);
}
const corpus = read('sky-v4-canonical-content-studio-stage-v1');
const correction = read('sky-v4-continuous-corpus-correction-v1');
const chunks = [1, 2, 3, 4].map(n => read(`sky-v4-continuous-corpus-correction-v1-chunk-${n}`));
const corrected = applySkyV4ContinuousCorpusCorrection(corpus, { ...correction, chunks, records: chunks.flatMap(c => c.records) });
const lunar = read('sky-v4-placement-lunar-context-v1');
const lunarChunks = [1, 2].map(n => read(`sky-v4-placement-lunar-context-v1-chunk-${n}`));
// Keep every complete reader source and its editorial/approval identity. Only
// package-level audit reports and unused runtime test fixtures stay behind.
const { audit, governance, runtime, ...readerCorpus } = corrected;
readerCorpus.runtime = { contentStudioOverlaySettings: runtime.contentStudioOverlaySettings };
const records = skyV4ContentStudioRecords(readerCorpus);
if (records.filter(row => row.serving_enabled).length !== 280) throw new Error('The complete released Sky inventory must remain intact.');
const value = JSON.stringify({
  schema: 'tldr-canonical-sky-reader-transport/v1', sourceHashes,
  corpus: readerCorpus,
  lunarSource: { ...lunar, chunks: lunarChunks, records: lunarChunks.flatMap(c => c.records) }
}) + '\n';
const target = new URL('canonical-sky-reader-transport-v1.json', root);
if (process.argv.includes('--check')) {
  if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== value) throw new Error('Canonical Sky reader transport is stale.');
} else fs.writeFileSync(target, value);
console.log('Canonical reader transport preserves all 280 released records, complete lunar sources and original source hashes.');
