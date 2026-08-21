import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const verifierPath = path.join(
  root,
  "apps/web/src/content/fallbackArchitectureV3/tests/verify-fallback-architecture.mjs"
);
const baselinePath = path.join(
  root,
  "apps/web/src/content/fallbackArchitectureV3/tests/fallback-architecture-known-failures-v1.json"
);
const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));

const result = spawnSync(process.execPath, [verifierPath], {
  cwd: root,
  encoding: "utf8",
  maxBuffer: 32 * 1024 * 1024
});
if (result.error) throw result.error;

const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
const failures = output
  .split(/\r?\n/u)
  .filter((line) => line.startsWith("FAIL:"))
  .sort();
const failureMultisetSha256 = crypto
  .createHash("sha256")
  .update(JSON.stringify(failures))
  .digest("hex");
const bannedNonEverydayWordFailures = failures.filter((line) =>
  line.includes("banned non-everyday word")
).length;

assert.equal(
  failures.length,
  baseline.expectedFailureCount,
  `fallback failure count changed: expected ${baseline.expectedFailureCount}, got ${failures.length}`
);
assert.ok(
  failures.length <= baseline.maximumFailureCount,
  `fallback failure count ${failures.length} exceeds maximum ${baseline.maximumFailureCount}`
);
assert.equal(
  bannedNonEverydayWordFailures,
  baseline.bannedNonEverydayWordFailures,
  `banned non-everyday-word failures changed: expected ${baseline.bannedNonEverydayWordFailures}, got ${bannedNonEverydayWordFailures}`
);
assert.equal(
  failureMultisetSha256,
  baseline.failureMultisetSha256,
  "fallback failure identities changed even though the aggregate count may be unchanged"
);
assert.equal(
  result.status,
  failures.length === 0 ? 0 : 1,
  `verifier exit status ${result.status} does not match its ${failures.length} reported failures`
);

console.log(
  `PASS: fallback known-failure fingerprint is stable (${failures.length}/${baseline.maximumFailureCount}, ${failureMultisetSha256}).`
);
