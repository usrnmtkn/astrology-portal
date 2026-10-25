import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const root = new URL('../apps/web/src/assets/fonts/', import.meta.url);
const manifest = JSON.parse(fs.readFileSync(new URL('newsreader-transports.json', root)));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(sha(fs.readFileSync(new URL(manifest.source, root))), manifest.sourceSha256);
const all = new Set();
for (const output of manifest.outputs) {
  const bytes = fs.readFileSync(new URL(output.file, root));
  assert.equal(sha(bytes), output.sha256);
  assert.equal(bytes.length, output.bytes);
  for (const point of output.characters) {
    assert(!all.has(point), 'Character transports must not overlap.');
    all.add(point);
  }
}
const css = fs.readFileSync(new URL('../apps/web/src/styles/reader-fonts.css', import.meta.url), 'utf8');
const block = css.match(/\/\* BEGIN generated Newsreader Latin transports \*\/[\s\S]*?\/\* END generated Newsreader Latin transports \*\//)?.[0];
assert.equal(sha(block ?? ''), manifest.cssBlockSha256);
assert(css.includes(`unicode-range: ${manifest.originalUnicodeRange};`));
assert.equal(manifest.outputs.length, 1, 'Keep all Latin glyphs in one face to preserve shaping across accented text.');
assert.equal(all.size, 219, 'Retain the full original supported Latin character inventory.');
assert(manifest.maxOutlineOrAdvanceDeviationFontUnits < 3);
assert(manifest.outputs[0].bytes < manifest.sourceBytes * 0.7, 'Initial font transfer must shrink by at least thirty percent.');
assert(manifest.outputs.reduce((sum, output) => sum + output.bytes, 0) < manifest.sourceBytes);
assert(fs.readFileSync(new URL('OFL-Newsreader.txt', root), 'utf8').includes('SIL OPEN FONT LICENSE Version 1.1'));
console.log('PASS: original font identity, generated asset/CSS hashes, complete character coverage in one shaping face, declared axes proof, smaller initial/total transfers and original license.');
