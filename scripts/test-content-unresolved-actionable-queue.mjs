import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const output = path.join(os.tmpdir(), `tldrastro-unresolved-${process.pid}.json`);
try {
  execFileSync(process.execPath, ["scripts/build-content-unresolved-queue.mjs", `--out=${output}`], {
    cwd: process.cwd(),
    stdio: "pipe"
  });
  const report = JSON.parse(fs.readFileSync(output, "utf8"));

  assert.equal(report.schema, "tldrastro-content-unresolved-queue/v1");
  assert.equal(report.count, report.items.length);
  assert.equal(report.issueCount, new Set(report.items.map((item) => item.contentKey)).size);
  assert.equal(report.shadowedCount, report.shadowedItems.length);
  assert.equal(report.retiredCount, report.retiredItems.length);
  assert.equal(report.count, 103, "Current actionable editorial backlog must exclude shadowed and governed retired records.");
  assert.equal(report.issueCount, 92, "Current owner/editorial workload must contain 92 unique actionable content keys.");
  assert.equal(report.shadowedCount, 47, "Shadowed/reference backlog must preserve 47 rows as audit evidence.");
  assert.equal(report.retiredCount, 62, "Governed retired/superseded backlog must preserve 62 rows as audit evidence.");
  assert.equal(report.count + report.shadowedCount + report.retiredCount, 212, "Queue classification must preserve all 212 pre-classification records.");

  const actionableKeys = new Set(report.items.map((item) => item.contentKey));
  assert.ok(actionableKeys.has("authored/book-ritual-and-the-moon/lunation-horoscope/eclipse-lunar/pisces/rising-pisces/house-1"));
  assert.ok(actionableKeys.has("authored/sky-lunation-macro/new-moon/aquarius"));
  assert.ok([...actionableKeys].some((key) => key.startsWith("daily-glance-variant/")));
  assert.ok(![...actionableKeys].some((key) => key.startsWith("fallback-hook/sky-placement-you/")));
  assert.ok(![...actionableKeys].some((key) => key.startsWith("fallback-hook/sky-placement-practice/")));
  assert.ok(![...actionableKeys].some((key) => key.startsWith("fallback-hook/empty-house-ruler-v3/")));

  const shadowedKeys = new Set(report.shadowedItems.map((item) => item.contentKey));
  assert.ok(shadowedKeys.has("fallback-hook/sky-placement/sun"));
  assert.ok(shadowedKeys.has("house-horoscope-core/venus/libra/house-5"));
  assert.ok(report.shadowedItems.every((item) => item.shadowReason === "reader-eligible-peer-exists"));
  assert.ok(report.shadowedItems.every((item) => Array.isArray(item.readerEligiblePeers) && item.readerEligiblePeers.length > 0));

  const retiredKeys = new Set(report.retiredItems.map((item) => item.contentKey));
  assert.ok(retiredKeys.has("fallback-hook/sky-placement-you/sun"));
  assert.ok(retiredKeys.has("fallback-hook/sky-placement-practice/sun"));
  assert.ok(retiredKeys.has("fallback-hook/empty-house-ruler-v3/a"));
  assert.ok(report.retiredItems.every((item) => item.retirement?.evidence));

  for (const item of [...report.shadowedItems, ...report.retiredItems]) {
    assert.ok(!report.items.some((active) => active.id === item.id), `${item.id}: non-actionable row leaked into actionable items.`);
  }

  assert.match(report.semantics.items, /Actionable unresolved/u);
  assert.match(report.semantics.shadowedItems, /audit evidence/u);
  assert.match(report.semantics.retiredItems, /audit evidence/u);
  console.log(`Actionable unresolved queue passed (${report.count} records / ${report.issueCount} decisions, ${report.shadowedCount} shadowed, ${report.retiredCount} retired).`);
} finally {
  fs.rmSync(output, { force: true });
}
