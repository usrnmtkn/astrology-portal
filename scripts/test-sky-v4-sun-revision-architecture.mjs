import assert from "node:assert/strict";
import fs from "node:fs";

const proposalPath = new URL(
  "../apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-sun-revision-architecture-v1.json",
  import.meta.url
);
const fallbackArchitecturePath = new URL(
  "../apps/web/src/content/fallbackArchitectureV3/FALLBACK-ARCHITECTURE.md",
  import.meta.url
);
const resolverSpecPath = new URL(
  "../apps/web/src/content/fallbackArchitectureV3/resolver/RESOLVER-SPEC.md",
  import.meta.url
);
const madlibsPath = new URL(
  "../tldr-astro-phrasebank/sources/TLDR-ASTRO-MUSTACHE-MADLIBS-v2.2.md",
  import.meta.url
);
const ownerGuidePath = new URL(
  "../apps/web/src/content/fallbackArchitectureV3/admin/OWNER-LUNATION-TEMPLATE-LIBRARY.md",
  import.meta.url
);

const proposal = JSON.parse(fs.readFileSync(proposalPath, "utf8"));
const fallbackArchitecture = fs.readFileSync(fallbackArchitecturePath, "utf8");
const resolverSpec = fs.readFileSync(resolverSpecPath, "utf8");
const madlibs = fs.readFileSync(madlibsPath, "utf8");
const ownerGuide = fs.readFileSync(ownerGuidePath, "utf8");

const signs = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"
];

assert.equal(proposal.schema, "tldrastro-sky-v4-sun-revision-architecture/v1");
assert.equal(proposal.status, "architecture_only_needs_editorial_revision");
assert.equal(proposal.serving_enabled, false);
assert.equal(proposal.current_serving_copy_unchanged, true);
assert.equal(proposal.supersedes_pr, 450);
assert.equal(proposal.scope.expected_records, 12);
assert.equal(proposal.records.length, 12);

const keys = proposal.records.map((row) => row.content_key);
assert.equal(new Set(keys).size, 12);
for (const sign of signs) {
  assert.ok(keys.includes(`sky-placement/article/sun/${sign}`), `missing Sun ${sign}`);
}
for (const row of proposal.records) {
  assert.equal(row.revision_status, "needs_editorial_refinement");
  assert.equal(row.serving_action, "none");
  assert.equal(row.fallback_action, "reuse-canonical-resolution-only");
}

const serialized = JSON.stringify(proposal);
assert.ok(!serialized.includes('"fallback":'), "proposal must not add fallback prose");
assert.ok(!serialized.includes('"hook":'), "proposal must not add hook fields");
assert.ok(!serialized.includes('"lived":'), "proposal must not add lived fields");
assert.ok(!serialized.includes('"turn":'), "proposal must not add turn fields");
assert.equal(proposal.continuous_fallback_contract.new_fallback_copy_in_this_proposal, false);
assert.equal(proposal.date_fact_contract.custom_entryDate_allowed, false);
assert.deepEqual(proposal.date_fact_contract.canonical_slots, [
  "ingress_date_display",
  "ingress_time_display",
  "start_date_display",
  "end_date_display",
  "exit_date_display",
  "timezone_display"
]);

assert.match(fallbackArchitecture, /retired modular hook\/lived\/turn/u);
assert.match(resolverSpec, /exact authored article,[\s\S]*sky-placement-continuous-v2[\s\S]*fallback-hook\/sky-placement-sign\/\{planet\}\/\{sign\}[\s\S]*SOURCE_GAP/u);
assert.match(resolverSpec, /must not be combined with the[\s\S]*retired placement hook\/lived\/turn\/moves stack/u);

for (const templateId of ["6A", "6B", "6C", "6D", "6M"]) {
  assert.match(madlibs, new RegExp(`^## ${templateId}\\.`, "mu"), `missing Mad-Lib ${templateId}`);
}
assert.match(madlibs, /\*\*Fact slots\*\* come only from calculated astrology/u);
assert.match(madlibs, /\*\*Interpretive slots\*\* come from the narrowest eligible reviewed combination source/u);
assert.match(ownerGuide, /Transit \/ Retrograde \/ Ingress article structure/u);
assert.match(ownerGuide, /These are AUTHORING GUIDES for future article writing, not machine templates/u);

console.log("Sky V4 Sun revision architecture contract passed.");
