import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
export function assertCompatibilitySourceIntegrity(source) {
  const bytes = fs.readFileSync(source.path);
  let { byteLength, sha256 } = source;
  if (source.path === 'tldr-astro-phrasebank/phrasebank/cc-compatibility-writeups.json') {
    // This exact clean-history file is already present when the extraction
    // manifest was created (9974389da1f4ee38fa76c79c556f903c95dd7155).
    // Retain the historical manifest; pin its sanitized source separately.
    assert.equal(byteLength, 1727970);
    assert.equal(sha256, '2d3ac8559ea2154ef4c2501abf9e312b617faf90eb97df222f7fff7205412e8e');
    byteLength = 1727972;
    sha256 = 'eb25db654c3ab1158188ea0305fdc49a48281e386bca0b58a0f3d434542f9c96';
  }
  assert.equal(bytes.length, byteLength, `${source.path} byte drift`);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), sha256, `${source.path} hash drift`);
}
