import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputs = path.join(root, "apps/web/src/content/fallbackArchitectureV3/authored-inputs");

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(inputs, name), "utf8"));
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function verifyPackage(indexName) {
  const indexPath = path.join(inputs, indexName);
  const index = readJson(indexName);
  assert.equal(index.review_status, "approved");
  assert.equal(index.owner_approved, true);
  assert.equal(index.serving_enabled, true);
  assert.match(index.parent_canonical_json_sha256, /^[a-f0-9]{64}$/u);
  let count = 0;
  const keys = new Set();
  for (const chunkName of index.chunk_files) {
    const chunkPath = path.join(inputs, chunkName);
    const chunk = readJson(chunkName);
    assert.equal(sha256(chunkPath), index.chunk_sha256[chunkName], `${chunkName} hash drift`);
    assert.equal(chunk.records.length, chunk.record_count, `${chunkName} record_count drift`);
    count += chunk.record_count;
    for (const row of chunk.records) {
      const key = row.ContentKey ?? row.content_key;
      assert.ok(key, `${chunkName} record missing content key`);
      assert.equal(keys.has(key), false, `duplicate content key ${key}`);
      keys.add(key);
    }
  }
  assert.equal(count, index.expected_records, `${indexName} expected_records drift`);
  return { indexPath, index, count };
}

const continuous = verifyPackage("sky-v4-continuous-corpus-correction-v1.json");
assert.equal(continuous.count, 120);
assert.equal(continuous.index.copy_sha256, "825f970dcae52bcb424b23e4f11d65103f24e37342e85691f6f4d1b078fd59c2");

const lunar = verifyPackage("sky-v4-placement-lunar-context-v1.json");
assert.equal(lunar.count, 40);
assert.equal(lunar.index.copy_sha256, "cdffe65c9ab3a5aee91271bc0deedeecaff498939aa59b19a17bc35e1af70c7a");

assert.equal(continuous.index.parent_canonical_json_sha256, lunar.index.parent_canonical_json_sha256);
assert.equal(continuous.index.parent_canonical_json_sha256, "9b91e715bea63a2c835001783240122aad1e000b3982d68bfebbb3cef690a750");

console.log("SKY V4 160-record owner-approved source preservation passed.");
