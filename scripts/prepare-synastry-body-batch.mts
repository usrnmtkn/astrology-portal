import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { prepareSynastryBodyWriting } from '../api/_lib/synastry-body-writing.js';

// This command has no live-generation option. Full private inputs and feedback
// stay in the explicitly chosen private directory, never a repository artifact.
const args = process.argv.slice(2);
if (args.length !== 4 || args[0] !== '--manifest' || args[2] !== '--out') {
  throw new Error('Usage: node --import tsx scripts/prepare-synastry-body-batch.mts --manifest /private/manifest.json --out /private/new-directory');
}
const manifestPath = path.resolve(args[1]);
const out = path.resolve(args[3]);
const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (out === repository || out.startsWith(repository + path.sep)) throw new Error('Private requests must be outside this repository.');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (!Array.isArray(manifest.cases) || !manifest.cases.length) throw new Error('An explicit case inventory is required.');
const seen = new Set<string>();
for (const item of manifest.cases) {
  if (!/^[a-z0-9_][a-z0-9_-]*$/u.test(item.id ?? '') || seen.has(item.id) || typeof item.inputFile !== 'string') throw new Error('Each case needs a unique safe ID and complete input file.');
  seen.add(item.id);
}
fs.mkdirSync(out, { mode: 0o700 });
const receipts = [];
for (const item of manifest.cases) {
  const inputPath = path.resolve(path.dirname(manifestPath), item.inputFile);
  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const prepared = await prepareSynastryBodyWriting(input, item.selection);
  const file = `${item.id}.json`;
  fs.writeFileSync(path.join(out, file), JSON.stringify(prepared, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  receipts.push({ id: item.id, file, ...prepared.receipt });
}
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ preparedAt: new Date().toISOString(),
  sourceManifestSha256: createHash('sha256').update(fs.readFileSync(manifestPath)).digest('hex'),
  preparedCases: receipts, providerCalls: 0, generationAuthorized: false, ownerApproved: false,
  studioSaves: 0, publicationAuthorized: false }, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
console.log(JSON.stringify({ prepared: receipts.length, providerCalls: 0, privateOutput: out }));
