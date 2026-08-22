#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedRoot = path.join(repoRoot, "apps/admin/public/generated");
const webGeneratedRoot = path.join(repoRoot, "apps/web/public/generated");
const sourceFiles = [
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/bundled-sky-core-rows-v3.json"),
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/bundled-deferred-core-rows-v3.json"),
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/bundled-shared-placement-rows-v3.json"),
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/bundled-relationship-hook-rows-v3.json")
];

function expectedBody(row) {
  const preferred = row.body_you ?? row.body ?? row.template ?? row.copy;
  if (typeof preferred === "string") return preferred;
  return typeof row.body_they === "string" ? row.body_they : "";
}

const sourceBodies = new Map();
for (const sourceFile of sourceFiles) {
  for (const row of JSON.parse(fs.readFileSync(sourceFile, "utf8")).hookRows) {
    if (typeof row.contentKey === "string" && row.contentKey && !sourceBodies.has(row.contentKey)) {
      sourceBodies.set(row.contentKey, expectedBody(row));
    }
  }
}

const index = JSON.parse(fs.readFileSync(path.join(generatedRoot, "admin-hook-catalog-index-v1.json"), "utf8"));
assert.equal(index.schemaVersion, 1, "The Admin hook index must use schema version 1.");
assert.equal(index.rows.length, sourceBodies.size, "The Admin hook index must cover every unique source hook.");
assert.ok(index.rows.every((row) => !("body" in row)), "The startup index must not duplicate reader-visible bodies.");

const packagedBodies = new Map();
for (const domain of ["sky", "you", "friends", "modifier"]) {
  const filePath = path.join(generatedRoot, `admin-hook-catalog-${domain}-v1.json`);
  assert.ok(fs.statSync(filePath).size <= 500000, `${domain} Admin hook package exceeds 500,000 raw bytes.`);
  const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
  assert.equal(payload.schemaVersion, 1, `${domain} Admin hook package schema changed.`);
  for (const row of payload.rows) {
    assert.ok(!packagedBodies.has(row.key), `Hook ${row.key} is duplicated across Admin domain packages.`);
    packagedBodies.set(row.key, row.body);
  }
}

assert.deepEqual([...packagedBodies.keys()].sort(), [...sourceBodies.keys()].sort(), "Admin domain packages must contain exactly the source hook keys.");
for (const [key, sourceBody] of sourceBodies) {
  assert.equal(packagedBodies.get(key), sourceBody, `Admin packaging changed approved source bytes for ${key}.`);
}

for (const fileName of fs.readdirSync(generatedRoot).filter((file) => file.startsWith("admin-hook-catalog-") && file.endsWith(".json"))) {
  assert.equal(
    fs.readFileSync(path.join(webGeneratedRoot, fileName), "utf8"),
    fs.readFileSync(path.join(generatedRoot, fileName), "utf8"),
    `${fileName} must remain byte-identical across the web and standalone Admin targets.`
  );
}

const sourceDraftFileName = "admin-source-draft-catalog-v1.json";
assert.equal(fs.existsSync(path.join(generatedRoot, sourceDraftFileName)), false, "Held source drafts must not be emitted as public Admin assets.");
assert.equal(fs.existsSync(path.join(webGeneratedRoot, sourceDraftFileName)), false, "Held source drafts must not be emitted as public reader assets.");

const dashboardSource = fs.readFileSync(path.join(repoRoot, "apps/admin/src/GeneratedContentAdminDashboard.tsx"), "utf8");
assert.doesNotMatch(dashboardSource, /from\s+["'][^"']*bundled-(?:deferred|sky)-core-rows-v3\.json["']/u, "Admin startup must not eagerly import full fallback packages.");

console.log(`Admin hook catalog packaging passed: ${sourceBodies.size} bodies remain byte-identical across four deduplicated domain packages.`);
