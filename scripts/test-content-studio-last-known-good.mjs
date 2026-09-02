#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const snapshotPath = "apps/web/public/content-studio-last-known-good.json";
assert.ok(fs.existsSync(snapshotPath), "The last-known-good snapshot must exist after refresh.");
const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
const workflow = fs.readFileSync(".github/workflows/content-studio-last-known-good.yml", "utf8");
const runtime = fs.readFileSync("apps/web/src/services/contentStudioLastKnownGood.ts", "utf8");
const generated = fs.readFileSync("apps/web/src/services/generatedContent.ts", "utf8");
const vocabulary = fs.readFileSync("apps/web/src/services/planetTopicVocabulary.ts", "utf8");
const taglines = fs.readFileSync("apps/web/src/services/natalPlacementTaglines.ts", "utf8");
const exporter = fs.readFileSync("scripts/refresh-content-studio-last-known-good.mjs", "utf8");

assert.equal(snapshot.schema, "content-studio-last-known-good-v1");
assert.equal(snapshot.rowCount, snapshot.rows.length);
assert.ok(snapshot.rowCount >= 100);
const keys = new Set();
let maxRevision = "";
for (const row of snapshot.rows) {
  assert.equal(row.status, "LIVE");
  assert.equal(row.lane, "serving");
  assert.equal(row.review_state, null);
  assert.equal(row.target_date, null);
  assert.ok(!keys.has(row.content_key), `duplicate last-known-good key: ${row.content_key}`);
  keys.add(row.content_key);
  assert.notEqual(row.provider, "tldrastro-fallback-architecture-v3-sky-placement");
  maxRevision = row.updated_at > maxRevision ? row.updated_at : maxRevision;
}
assert.equal(snapshot.sourceRevision, maxRevision);
assert.match(workflow, /schedule:[\s\S]*cron:/u);
assert.match(workflow, /refresh-content-studio-last-known-good\.mjs/u);
assert.doesNotMatch(workflow, /SUPABASE_SERVICE_ROLE_KEY/u, "Nightly fallback must not require service-role access.");
assert.match(workflow, /apps\/web\/public\/content-studio-last-known-good\.json/u);
assert.match(exporter, /sb_publishable_/u, "Nightly fallback must use the public reader boundary.");
assert.match(exporter, /const pageSize = 200/u, "Nightly export must use conservative cursor pages.");
assert.match(runtime, /fetch\("\/content-studio-last-known-good\.json"/u, "The LKG snapshot must be fetched as a static asset, not bundled into application JS.");
assert.doesNotMatch(runtime, /import\([^)]*content-studio-last-known-good\.json/u);
assert.match(generated, /loadContentStudioLastKnownGoodCoreBundle/u);
assert.match(generated, /loadContentStudioLastKnownGoodRows/u);
assert.match(vocabulary, /loadContentStudioLastKnownGoodRows/u);
assert.match(taglines, /loadContentStudioLastKnownGoodRows/u);

console.log(`Content Studio last-known-good contract passed (${snapshot.rowCount} rows).`);
