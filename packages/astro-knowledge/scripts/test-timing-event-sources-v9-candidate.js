#!/usr/bin/env node

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const packet = JSON.parse(fs.readFileSync(
  path.join(root, "data", "timing", "timing-event-sources-v9.json"),
  "utf8"
));

assert.equal(packet.status, "REVIEWED");
assert.equal(packet.serving, false);
assert.equal(packet.ownerApproval, "approved_meaning_layer_only_31_records");
assert.equal(packet.sourceRecords.length, 31);
assert.equal(packet.sourceRecords.filter((record) => record.status === "REVIEWED").length, 31);
assert.equal(packet.sourceRecords.filter((record) => record.status === "DRAFT").length, 0);
assert.equal(packet.newlyApprovedSourceRecordCount, 10);
assert.equal(packet.pendingSourceRecordCount, 0);
assert.equal(packet.concreteMappings.length, 636);

const keys = new Set(packet.concreteMappings.map((entry) => entry.readerKey));
assert.equal(keys.size, packet.concreteMappings.length, "Every candidate mapping must have a unique concrete key");
for (const entry of packet.concreteMappings) {
  assert.equal(entry.readerStatus, "needs_review");
  assert.equal(entry.serving, false);
  assert.ok(!entry.readerKey.includes("{"));
  assert.notEqual(entry.planet, "moon");
}

const newlyApproved = packet.sourceRecords
  .filter((record) => record.ownerApprovalStatement)
  .map((record) => record.id);
for (const id of [
  "src.timing.mercury.pre-shadow",
  "src.timing.mercury.cazimi-retrograde",
  "src.timing.mercury.post-shadow",
  "src.timing.venus.pre-shadow",
  "src.timing.venus.cazimi-retrograde",
  "src.timing.venus.post-shadow",
  "src.timing.mars.pre-shadow",
  "src.timing.mars.sun-opposition",
  "src.timing.mars.post-shadow",
  "src.timing.shared.ingress-re-entry"
]) assert.ok(newlyApproved.includes(id), `Newly approved source missing: ${id}`);

assert.equal(packet.concreteMappings.filter((entry) => entry.phase === "pre-shadow").length, 36);
assert.equal(packet.concreteMappings.filter((entry) => entry.phase === "post-shadow").length, 36);
assert.equal(packet.concreteMappings.filter((entry) => entry.phase === "cazimi").length, 24);
assert.equal(packet.concreteMappings.filter((entry) => entry.phase === "sun-opposition").length, 12);
assert.equal(packet.concreteMappings.filter((entry) => entry.passType === "re-entry").length, 96);
assert.ok(packet.exclusions.includes("direct-cazimi-meaning-records-missing"));
assert.ok(packet.exclusions.includes("reader-calendar-wiring-blocked-until-copy-approval"));

console.log("Timing-event V9 candidate tests passed: 31 approved meaning sources, 636 non-serving mappings.");
