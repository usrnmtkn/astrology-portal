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
  assert.equal(report.shadowedCount, report.shadowedItems.length);
  assert.equal(report.count, 165, "Current actionable editorial backlog must be 165 after exact-key shadow removal.");
  assert.equal(report.shadowedCount, 47, "Current shadowed/reference backlog must preserve 47 rows as audit evidence.");
  assert.equal(report.count + report.shadowedCount, 212, "Queue classification must preserve all 212 pre-classification records.");

  const actionableKeys = new Set(report.items.map((item) => item.contentKey));
  assert.ok(actionableKeys.has("authored/book-ritual-and-the-moon/lunation-horoscope/eclipse-lunar/pisces/rising-pisces/house-1"));
  assert.ok(actionableKeys.has("authored/sky-lunation-macro/new-moon/aquarius"));
  assert.ok([...actionableKeys].some((key) => key.startsWith("daily-glance-variant/")));

  const shadowedKeys = new Set(report.shadowedItems.map((item) => item.contentKey));
  assert.ok(shadowedKeys.has("fallback-hook/sky-placement/sun"));
  assert.ok(shadowedKeys.has("house-horoscope-core/venus/libra/house-5"));
  assert.ok(report.shadowedItems.every((item) => item.shadowReason === "reader-eligible-peer-exists"));
  assert.ok(report.shadowedItems.every((item) => Array.isArray(item.readerEligiblePeers) && item.readerEligiblePeers.length > 0));

  for (const item of report.shadowedItems) {
    assert.ok(!report.items.some((active) => active.id === item.id), `${item.id}: shadowed row leaked into actionable items.`);
  }

  assert.match(report.semantics.items, /Actionable unresolved/u);
  assert.match(report.semantics.shadowedItems, /audit evidence/u);
  console.log(`Actionable unresolved queue passed (${report.count} actionable, ${report.shadowedCount} shadowed).`);
} finally {
  fs.rmSync(output, { force: true });
}
