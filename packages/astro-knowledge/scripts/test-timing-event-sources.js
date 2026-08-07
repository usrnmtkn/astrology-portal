#!/usr/bin/env node

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const packet = JSON.parse(fs.readFileSync(
  path.join(root, "review", "timing-event-sources-v8-approved-snapshot.json"),
  "utf8"
));

assert.equal(packet.status, "REVIEWED");
assert.equal(packet.serving, false);
assert.equal(packet.ownerApproval, "approved_meaning_layer_only");
assert.equal(packet.sourceRecords.length, 21, "Only currently emitted source records may be imported");
assert.equal(packet.concreteMappings.length, 432, "Expected 432 concrete sign mappings after Chiron support");

for (const record of packet.sourceRecords) {
  for (const field of ["statusLine", "fact", "scenes", "meaningNote", "provenance"]) {
    assert.ok(record[field], `${record.id} must preserve its complete ${field}`);
  }
  assert.equal(record.serving, false, `${record.id} must remain non-serving`);
  assert.equal(record.status, "REVIEWED", `${record.id} must record meaning-layer approval`);
}
assert.ok(
  packet.sourceRecords.filter((record) => record.id.startsWith("src.timing.outer.")).every((record) => (
    record.statusLine.includes("Jupiter-Pluto and Chiron")
    && !record.statusLine.includes("scheduled next engine pass")
  )),
  "Outer-body source status must reflect completed Chiron engine support"
);

const keys = new Set(packet.concreteMappings.map((entry) => entry.readerKey));
assert.equal(keys.size, packet.concreteMappings.length, "Concrete reader keys must be unique");

for (const entry of packet.concreteMappings) {
  assert.equal(entry.serving, false, `${entry.readerKey} must remain dark`);
  assert.equal(entry.readerStatus, "needs_review", `${entry.readerKey} must await owner approval`);
  assert.ok(!entry.readerKey.includes("{"), `${entry.readerKey} contains an unmaterialized slot`);
  assert.ok(!entry.readerKey.includes("-passage"), `${entry.readerKey} did not normalize its phase segment`);
  assert.notEqual(entry.planet, "moon", "Moon ingress must remain permanently excluded");
  assert.equal(entry.passType, null, "Pass-neutral ingress must not invent pass history");
}

const counts = packet.concreteMappings.reduce((result, entry) => {
  result[entry.eventFamily] = (result[entry.eventFamily] || 0) + 1;
  return result;
}, {});
assert.deepEqual(counts, { station: 216, retrograde: 108, ingress: 108 });

const chiron = packet.concreteMappings.filter((entry) => entry.planet === "chiron");
assert.equal(chiron.length, 36, "Chiron must have two stations and one active-passage key per sign");
assert.ok(chiron.every((entry) => entry.eventFamily !== "ingress"), "Chiron ingress is not in this engine pass");

console.log("Timing-event source tests passed: 21 sources, 432 non-serving concrete mappings.");
