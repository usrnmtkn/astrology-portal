#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const snapshotPath = "apps/web/public/content-studio-last-known-good.json";
assert.ok(fs.existsSync(snapshotPath), "The last-known-good snapshot must exist after refresh.");
const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
const workflow = fs.readFileSync(".github/workflows/content-studio-last-known-good.yml", "utf8");
const generated = fs.readFileSync("apps/web/src/services/generatedContent.ts", "utf8");
const vocabulary = fs.readFileSync("apps/web/src/services/planetTopicVocabulary.ts", "utf8");
const taglines = fs.readFileSync("apps/web/src/services/natalPlacementTaglines.ts", "utf8");
const exporter = fs.readFileSync("scripts/refresh-content-studio-last-known-good.mjs", "utf8");

assert.equal(snapshot.schema, "content-studio-last-known-good-v1");
assert.equal(snapshot.rowCount, snapshot.rows.length);
assert.ok(snapshot.rowCount >= 100);
const keys = new Set();
const publications = new Map((snapshot.publications ?? []).map(record => [record.content_key, record]));
assert.equal(publications.size, (snapshot.publications ?? []).length, "Publication keys must be unique.");
for (const publication of publications.values()) {
  assert.ok(["live", "retired"].includes(publication.state));
  assert.ok(Number.isSafeInteger(publication.revision) && publication.revision > 0);
}
const identityTime = value => `${Date.parse(value)}:${(value?.match(/\.(\d+)/)?.[1] ?? "").padEnd(6, "0").slice(3, 6)}`;
let maxRevision = "";
for (const row of snapshot.rows) {
  assert.equal(row.status, "LIVE");
  assert.equal(row.lane, "serving");
  assert.equal(row.review_state, null);
  assert.equal(row.target_date, null);
  assert.ok(!keys.has(row.content_key), `duplicate last-known-good key: ${row.content_key}`);
  keys.add(row.content_key);
  assert.equal(row.sections?.calendarReleaseHistory, undefined, "Admin recovery history must not be exported publicly");
  if (publications.has("__content-publication-ledger/v1") || row.provider === "tldrastro-fallback-architecture-v3-sky-placement") {
    const publication = publications.get(row.content_key);
    assert.equal(publication?.state, "live", `${row.content_key}: exported copy must be published`);
    assert.equal(publication.row_id, row.id, `${row.content_key}: published source identity must match`);
    assert.equal(identityTime(publication.row_updated_at), identityTime(row.updated_at), `${row.content_key}: exported revision must match`);
  }
  maxRevision = row.updated_at > maxRevision ? row.updated_at : maxRevision;
}
assert.equal(snapshot.sourceRevision, maxRevision);
assert.match(workflow, /schedule:[\s\S]*cron:/u);
assert.match(workflow, /refresh-content-studio-last-known-good\.mjs/u);
assert.doesNotMatch(workflow, /SUPABASE_SERVICE_ROLE_KEY/u, "Nightly fallback must not require service-role access.");
assert.match(workflow, /apps\/web\/public\/content-studio-last-known-good\.json/u);
assert.match(workflow, /pull-requests: write/u, "The snapshot publisher must use main's required PR process.");
assert.match(workflow, /gh pr create --base main/u);
assert.match(workflow, /gh pr merge[^\n]*--match-head-commit/u, "Only the validated snapshot commit may merge.");
assert.doesNotMatch(workflow, /\n\s+git push\s*\n/u, "The workflow must not push directly to protected main.");
assert.match(exporter, /calendarReleaseHistory: _adminRecoveryHistory/u);
assert.match(exporter, /sb_publishable_/u, "Nightly fallback must use the public reader boundary.");
assert.match(exporter, /const pageSize = 20/u, "Wide source rows need small pages to stay within the database deadline.");
assert.match(exporter, /const maxPages = 1000/u, "Smaller pages must retain the 20,000-row export capacity.");
assert.match(exporter, /page === maxPages - 1/u, "Export must still refuse a truncated inventory.");
assert.match(generated, /fetch\("\/content-studio-last-known-good\.json"/u, "The LKG snapshot must be fetched as a static asset, not bundled into application JS.");
assert.doesNotMatch(generated, /import\([^)]*content-studio-last-known-good\.json/u);
assert.ok(!fs.existsSync("apps/web/src/services/contentStudioLastKnownGood.ts"), "LKG must not create a standalone JavaScript chunk.");
assert.match(generated, /loadContentStudioLastKnownGoodCoreBundle/u);
assert.match(generated, /loadContentStudioLastKnownGoodRows/u);
assert.match(generated, /packageFallbackArchitectureV3CoreRows/u);
assert.match(generated, /packageFallbackArchitectureV3CompatibilityRows/u);
assert.match(vocabulary, /loadLiveGeneratedContentForSurfaces/u);
assert.match(taglines, /loadLiveGeneratedContentForKeys/u);

console.log(`Content Studio last-known-good contract passed (${snapshot.rowCount} rows).`);
