import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { sourceSha256, withSourceVerification } = require('../packages/astro-knowledge/scripts/source-verification.js');
const gate = require('../src/astro-writing/productionPreCallGate.cjs');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'source-verification-'));
const file = path.join(directory, 'source.txt');
const originalRead = fs.readFileSync;
let reads = new Map();
fs.readFileSync = function(file, ...args) {
  const key = String(file);
  reads.set(key, (reads.get(key) ?? 0) + 1);
  return originalRead.call(this, file, ...args);
};
try {
  fs.writeFileSync(file, 'first');
  const first = withSourceVerification(() => {
    const digest = sourceSha256(file);
    assert.equal(withSourceVerification(() => sourceSha256(file)), digest);
    return digest;
  });
  assert.equal(reads.get(file), 1, 'nested synchronous work hashes a file only once');
  fs.writeFileSync(file, 'second');
  assert.notEqual(withSourceVerification(() => sourceSha256(file)), first, 'next operation must reread modified bytes');
  assert.throws(() => withSourceVerification(() => { sourceSha256(file); throw new Error('test'); }), /test/);
  fs.writeFileSync(file, 'third');
  const third = sourceSha256(file);
  assert.notEqual(third, first, 'failed scope must clear its cache');
  assert.throws(() => withSourceVerification(() => Promise.resolve()), /synchronous/);
  fs.unlinkSync(file);
  assert.throws(() => withSourceVerification(() => sourceSha256(file)), /ENOENT/, 'deleted sources fail closed');

  const input = { contentKey: 'verification-fixture', surface: 'you', mode: 'feed', eventType: 'you-transit', facts: {}, knowledgeIds: ['transit-natal-saturn-square-sun', 'transit-natal-jupiter-trine-moon', 'transit-natal-mars-square-venus'] };
  const prepared = gate.prepareProductionPreCallGate(input, {});
  for (let boundary = 0; boundary < 2; boundary++) {
    reads = new Map();
    gate.assertProductionPreCallGate(prepared, { role: 'WRITER', input });
    const indexReads = [...reads.entries()].filter(([file]) => /generated\/(knowledge|phrase)-index\.json$/u.test(file));
    assert.equal(indexReads.length, 2);
    assert.ok(indexReads.every(([, count]) => count === 1), 'each boundary checks indexes once, independent of target count');
    assert.ok(reads.size > 10, 'every boundary still verifies real source bytes');
    assert.ok([...reads.values()].every(count => count === 1), 'shared evidence is read only once per boundary');
  }
  const tampered = structuredClone(prepared);
  tampered.evidence.packet.packets[0].evidence[0].text += 'tampered';
  assert.throws(() => gate.assertProductionPreCallGate(tampered, { role: 'WRITER', input }), /TAMPERED|UNAUTHORIZED/);
  assert.throws(() => gate.assertProductionPreCallGate(prepared, { role: 'REVIEWER', input }), /DRAFT_VALIDATION_FAILED/);
  console.log('Source verification: deduplicated reads, fresh boundaries, exceptions, missing files, tampering, and review gate passed.');
} finally {
  fs.readFileSync = originalRead;
  fs.rmSync(directory, { recursive: true, force: true });
}
