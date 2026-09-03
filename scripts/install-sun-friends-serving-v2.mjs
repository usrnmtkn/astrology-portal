#!/usr/bin/env node
import fs from "node:fs";
import { createHash } from "node:crypto";

const approvalPath = "packages/astro-knowledge/review/transit-aspect-friends-sun-proposed-v1.json";
const overridePath = "packages/astro-knowledge/review/transit-aspect-sun-ascendant-hard-owner-published-2026-09-03.json";
const sourcePath = "apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json";
const oldVersion = "v3-2026-09-02a";
const newVersion = "v3-2026-09-03a";
const ascendantKey = "authored/transit-aspect/sun/ascendant/hard";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const approval = JSON.parse(fs.readFileSync(approvalPath, "utf8"));
const override = JSON.parse(fs.readFileSync(overridePath, "utf8"));
if (
  approval.schema !== "tldrastro-transit-aspect-friends-independent-owner-approved-v1"
  || approval.status !== "owner_approved"
  || approval.approvalLevel !== "exact_owner_approved"
  || approval.count !== 27
  || approval.records?.length !== 27
) {
  throw new Error("Sun Friends owner-approval packet is incomplete.");
}
if (
  override.schema !== "tldrastro-transit-aspect-owner-published-override-v1"
  || override.contentKey !== ascendantKey
  || override.status !== "owner_published"
  || override.approvalLevel !== "exact_owner_published_cms_revision"
) {
  throw new Error("Sun square Ascendant owner-published override is invalid.");
}

const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
if (!Array.isArray(source.authoredCards)) throw new Error("Transit source has no authoredCards.");
const byKey = new Map(source.authoredCards.map((row) => [row.contentKey, row]));
const packetKeys = new Set();

for (const approved of approval.records) {
  if (!String(approved.contentKey).startsWith("authored/transit-aspect/sun/")) {
    throw new Error(`Unexpected non-Sun approval key: ${approved.contentKey}`);
  }
  if (packetKeys.has(approved.contentKey)) throw new Error(`Duplicate approval key: ${approved.contentKey}`);
  packetKeys.add(approved.contentKey);
  if (approved.review_status !== "exact_owner_approved" || approved.owner_approved !== true) {
    throw new Error(`${approved.contentKey}: approval metadata drifted.`);
  }
  if (sha256(approved.body_they) !== approved.body_they_sha256) {
    throw new Error(`${approved.contentKey}: approved Friends hash mismatch.`);
  }
  const row = byKey.get(approved.contentKey);
  if (!row) throw new Error(`${approved.contentKey}: governed source row missing.`);
  if (!["approved", "approved_reuse", "reviewed"].includes(String(row.review_status ?? ""))) {
    throw new Error(`${approved.contentKey}: source row is not reader eligible.`);
  }
  row.body_they = approved.body_they;
  row.body_they_review_status = "approved";
  row.body_they_sha256 = approved.body_they_sha256;
  row.body_they_approved_via = approvalPath;
  row.body_they_authorship = "independent_friend_authoring";
  row.body_they_name_variable = "{{Name}}";
  row.body_they_sourceMechanism = "Explicit independently authored Friends passage. Runtime You-to-Friends conversion remains fallback-only for transit rows without explicit body_they.";
  row.body_they_approval = {
    approvalLevel: "exact_owner_approved",
    recordPath: approvalPath,
    payloadSha256: approved.body_they_sha256,
    approvedAt: "2026-09-03"
  };
  row.source_keys = [...new Set([...(Array.isArray(row.source_keys) ? row.source_keys : []), approvalPath])];
}

const sunRows = source.authoredCards.filter((row) => String(row.contentKey ?? "").startsWith("authored/transit-aspect/sun/"));
if (sunRows.length !== 27 || sunRows.some((row) => !packetKeys.has(row.contentKey))) {
  throw new Error("Owner-approved Sun packet does not exactly cover the current 27-row Sun transit corpus.");
}

const ascendant = byKey.get(ascendantKey);
if (!ascendant) throw new Error(`${ascendantKey}: source row missing.`);
const overrideHash = sha256(override.body_they);
ascendant.body_you = override.body_you;
ascendant.body_they = override.body_they;
if (Object.prototype.hasOwnProperty.call(ascendant, "body")) ascendant.body = override.body_you;
ascendant.body_they_review_status = "approved";
ascendant.body_they_sha256 = overrideHash;
ascendant.body_they_approved_via = overridePath;
ascendant.body_they_authorship = "independent_friend_authoring";
ascendant.body_they_name_variable = "{{Name}}";
ascendant.body_they_sourceMechanism = "Exact owner-published Content Studio Friend passage. Bundled first paint and live overlay must remain byte-identical.";
ascendant.body_they_approval = {
  approvalLevel: "exact_owner_published_cms_revision",
  recordPath: overridePath,
  payloadSha256: overrideHash,
  approvedAt: "2026-09-03"
};
ascendant.body_you_revision = {
  approvalLevel: "exact_owner_published_cms_revision",
  recordPath: overridePath,
  publishedAt: override.publishedAt,
  source: override.source
};
ascendant.source_keys = [...new Set([...(Array.isArray(ascendant.source_keys) ? ascendant.source_keys : []), overridePath])];

fs.writeFileSync(sourcePath, `${JSON.stringify(source, null, 1)}\n`);

const versionFiles = [
  "apps/web/src/content/fallbackArchitectureV3/resolver/index.browser.ts",
  "scripts/test-empty-house-refinement.mjs",
  "scripts/test-fallback-refresh-wiring.mjs",
  "scripts/test-fallback-package-cache-contract.mjs"
];
for (const file of versionFiles) {
  let text = fs.readFileSync(file, "utf8");
  if (!text.includes(oldVersion)) throw new Error(`${file}: expected package version ${oldVersion} not found.`);
  text = text.replaceAll(oldVersion, newVersion);
  fs.writeFileSync(file, text);
}

const refreshWiringPath = "scripts/test-fallback-refresh-wiring.mjs";
let refreshWiring = fs.readFileSync(refreshWiringPath, "utf8");
const staleCacheAssertion = 'fallbackArchitectureV3BundleCacheSchema = "fallback-architecture-v3-dashboard-cache-v5"';
const currentCacheAssertion = 'fallbackArchitectureV3BundleCacheSchema = "fallback-architecture-v3-dashboard-overlay-cache-v6"';
if (refreshWiring.includes(staleCacheAssertion)) {
  refreshWiring = refreshWiring.replace(staleCacheAssertion, currentCacheAssertion);
}
const stalePaginationBlock = `assert.match(
  generatedContentSource,
  /\\.order\\("updated_at", \\{ ascending: false \\}\\)[\\s\\S]*?\\.order\\("id", \\{ ascending: false \\}\\)/u,
  "Dashboard hydration pagination must have a stable unique-ID tiebreaker."
);`;
const currentPaginationBlock = `assert.match(
  generatedContentSource,
  /let cursorId: string \\| null = null[\\s\\S]*?\\.order\\("id", \\{ ascending: true \\}\\)[\\s\\S]*?if \\(cursorId\\) query = query\\.gt\\("id", cursorId\\)/u,
  "Dashboard hydration pagination must use a stable monotonic ID cursor."
);`;
if (refreshWiring.includes(stalePaginationBlock)) {
  refreshWiring = refreshWiring.replace(stalePaginationBlock, currentPaginationBlock);
}
const staleFailClosedBlock = `assert.match(
  generatedContentSource,
  /package metadata is missing or inconsistent[\\s\\S]*?clearCachedFallbackArchitectureV3Bundle\\(\\);[\\s\\S]*?return null;/u,
  "An unversioned or inconsistent dashboard package must clear cache and fail closed to the bundled package."
);`;
const currentFailClosedBlock = `assert.match(
  generatedContentSource,
  /\\.rpc\\("content_runtime_revision", \\{ p_provider: fallbackArchitectureV3Provider \\}\\)[\\s\\S]*?currentCoreManifest = await loadFallbackArchitectureV3BundledCoreManifest\\(\\)[\\s\\S]*?packageFallbackArchitectureV3CoreRows\\(rows, currentCoreManifest\\)[\\s\\S]*?if \\(!bundle\\) \\{[\\s\\S]*?clearCachedFallbackArchitectureV3Bundle\\(\\);[\\s\\S]*?return null;/u,
  "Core dashboard overlays must use runtime revision, bundled key topology, and fail closed when the overlay cannot be packaged."
);`;
if (refreshWiring.includes(staleFailClosedBlock)) {
  refreshWiring = refreshWiring.replace(staleFailClosedBlock, currentFailClosedBlock);
}
fs.writeFileSync(refreshWiringPath, refreshWiring);

const cacheContractPath = "scripts/test-fallback-package-cache-contract.mjs";
let cacheContract = fs.readFileSync(cacheContractPath, "utf8");
const staleCachePaginationBlock = `assert.match(
  generatedContentSource,
  /\\.order\\("updated_at", \\{ ascending: false \\}\\)[\\s\\S]*?\\.order\\("id", \\{ ascending: false \\}\\)/u,
  "Supabase pagination must use a stable unique-ID tiebreaker."
);`;
const currentCachePaginationBlock = `assert.match(
  generatedContentSource,
  /let cursorId: string \\| null = null[\\s\\S]*?\\.order\\("id", \\{ ascending: true \\}\\)[\\s\\S]*?if \\(cursorId\\) query = query\\.gt\\("id", cursorId\\)/u,
  "Supabase pagination must use a stable monotonic ID cursor."
);`;
if (cacheContract.includes(staleCachePaginationBlock)) {
  cacheContract = cacheContract.replace(staleCachePaginationBlock, currentCachePaginationBlock);
}
fs.writeFileSync(cacheContractPath, cacheContract);

console.log(`Installed ${approval.records.length} Sun Friends passages on current main, applied the owner-published Ascendant override, and bumped ${oldVersion} -> ${newVersion}.`);
