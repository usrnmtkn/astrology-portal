#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { lintArticle, lintBatchRepetition } = require("./lint-placement-voice.js");

const packageRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(packageRoot, "../..");
const reviewRoot = path.join(packageRoot, "review");
const paths = {
  source: path.join(reviewRoot, "sky-placement-writer-sun-venus-24-owner-edit-pass-v1-revised.json"),
  promotion: path.join(reviewRoot, "sky-placement-chiron-nodes-runtime-serving-promotion-proposal-2026-08-04.json"),
  manifest: path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-placement-serving-manifest-v1.json"),
  approved: path.join(reviewRoot, "sky-placement-writer-sun-venus-24-owner-approved-fallbacks-2026-08-04.json"),
  approvedMd: path.join(reviewRoot, "sky-placement-writer-sun-venus-24-owner-approved-fallbacks-2026-08-04.md"),
  fixes: path.join(reviewRoot, "sun-venus-24-final-seven-owner-fixes-before-after.md"),
  lint: path.join(reviewRoot, "sky-placement-writer-sun-venus-24-owner-approved-fallbacks-2026-08-04-lint.json"),
  proposal: path.join(reviewRoot, "sky-placement-sun-venus-chiron-nodes-26-serving-diff-proposal-2026-08-04.json"),
  proposalMd: path.join(reviewRoot, "sky-placement-sun-venus-chiron-nodes-26-serving-diff-proposal-2026-08-04.md")
};

const sha256 = (value) => crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
const title = (value) => value[0].toUpperCase() + value.slice(1);
const source = JSON.parse(fs.readFileSync(paths.source, "utf8"));
const promotion = JSON.parse(fs.readFileSync(paths.promotion, "utf8"));
const manifest = JSON.parse(fs.readFileSync(paths.manifest, "utf8"));
const articles = structuredClone(source.articles);
const changes = [];
const fixes = [
  ["sun-leo", "opening", "helps the work reach the people it was made for", "helps the work reach who it was made for"],
  ["sun-pisces", "development", "other people's moods and requests keep deciding where the day goes", "everyone else's moods and requests keep deciding where the day goes"],
  ["sun-virgo", "development", "vitality drops when attention stays fixed on defects", "energy drops when attention stays fixed on defects"],
  ["venus-libra", "development", "questions about reciprocity may return in a different form", "questions about what gets returned may come back in a different form"],
  ["venus-scorpio", "development", "similar questions of attachment can surface now in different forms", "similar questions about how we hold on can surface now in different forms"],
  ["venus-sagittarius", "opening", "laughter, candor, and somewhere new", "laughter, honesty, and somewhere new"],
  ["venus-aquarius", "opening", "attraction feels easier without a preset role", "attraction feels easier without a ready-made role"]
];

for (const [id, field, before, after] of fixes) {
  const record = articles.find((entry) => entry.id === id);
  if (!record) throw new Error(`Missing approval candidate ${id}.`);
  const hits = record.article[field].split(before).length - 1;
  if (hits !== 1) throw new Error(`${id}.${field}: expected one exact match; found ${hits}.`);
  record.article[field] = record.article[field].replace(before, after);
  changes.push({ id, field, before, after });
}

const lintShape = (article) => ({ hook: article.opening, lived: article.tension, turn: article.development, close: article.close, moves: article.try_this });
const approvedArticles = articles.map((entry) => {
  const lint = lintArticle({ ...lintShape(entry.article), planet: entry.planet, sign: entry.sign });
  return {
    id: `sky-placement-sun-venus-24-${entry.planet}-${entry.sign}-owner-approved-v1`,
    sourceCandidateId: entry.id,
    sourceResult: entry.sourceResult,
    sourceRunId: entry.sourceRunId,
    planet: entry.planet,
    sign: entry.sign,
    authorityClass: "exact_owner_approved",
    reviewStatus: "approved",
    editorialStatus: "current_sky_owner_approved",
    ownerApproved: true,
    approvalScope: "owner_approved_fallback_article_for_placement_page_serving_separate",
    renderEligible: false,
    servingAuthorized: false,
    servingStatus: "staged_pending_26_key_serving_diff",
    generationEvidence: false,
    promotionAuthorized: false,
    canonical: false,
    article: entry.article,
    articleHashSha256: sha256(entry.article),
    lint
  };
});
const batchLint = lintBatchRepetition(approvedArticles.map(({ id, article }) => ({ id, article })));
const lintSummary = {
  articleCount: approvedArticles.length,
  scoreCounts: approvedArticles.reduce((counts, entry) => ({ ...counts, [entry.lint.score]: (counts[entry.lint.score] || 0) + 1 }), {}),
  totalFails: approvedArticles.reduce((sum, entry) => sum + entry.lint.fails, 0),
  totalWarns: approvedArticles.reduce((sum, entry) => sum + entry.lint.warns, 0),
  batchRepetition: batchLint,
  articles: approvedArticles.map(({ id, planet, sign, lint }) => ({ id, planet, sign, ...lint }))
};
if (approvedArticles.length !== 24 || lintSummary.scoreCounts[3] !== 24 || lintSummary.totalFails || lintSummary.totalWarns || !batchLint.passed) {
  throw new Error(`Final lint not clean: ${JSON.stringify(lintSummary.scoreCounts)}, fails=${lintSummary.totalFails}, warns=${lintSummary.totalWarns}, batch=${batchLint.passed}.`);
}

const ownerStatement = "With those applied, I explicitly approve all 24 revised Sun and Venus articles as owner-approved fallback articles for their placement pages, exact wording.";
const approvedPayload = {
  schemaVersion: 1,
  id: "sky-placement-writer-sun-venus-24-owner-approved-fallbacks-2026-08-04",
  recordedAt: new Date().toISOString(),
  sourceArtifact: path.relative(repoRoot, paths.source),
  finalFixesArtifact: path.relative(repoRoot, paths.fixes),
  revisionMethod: "seven_exact_owner_directed_word_fixes_no_model_calls",
  billedCalls: 0,
  terraCalls: 0,
  reviewStatus: "approved",
  editorialStatus: "current_sky_owner_approved",
  ownerApproved: true,
  servingAuthorized: false,
  servingStatus: "staged_pending_26_key_serving_diff",
  wiringAuthorized: false,
  promotionAuthorized: false,
  canonical: false,
  generationEvidence: false,
  ownerStatement,
  approvalScope: "exact_24_article_fallback_wording_only_serving_and_wiring_separate",
  ownerDirectedFixes: changes,
  articlesSha256: sha256(approvedArticles.map(({ id, articleHashSha256 }) => ({ id, articleHashSha256 }))),
  lintSummary: { articleCount: 24, scoreCounts: lintSummary.scoreCounts, totalFails: 0, totalWarns: 0, batchRepetitionPassed: true },
  articles: approvedArticles
};

const articleMd = [
  "# Sun and Venus: 24 exact owner-approved fallback articles", "",
  "Status: `approved` as fallback articles. Serving, wiring, promotion, generation-evidence use, and canonical production status remain separate and unauthorized.", "",
  `Owner statement: “${ownerStatement}”`, "",
  "Lint: 24 of 24 score 3; 0 failures; 0 warnings; batch repetition passed.", "",
  ...approvedArticles.flatMap((entry) => [
    `## ${title(entry.planet)} in ${title(entry.sign)}`, "",
    `ID: \`${entry.id}\``, `SHA-256: \`${entry.articleHashSha256}\``, "Lint: score 3; clean.", "",
    "**Opening**", "", entry.article.opening, "", "**Tension**", "", entry.article.tension, "",
    "**Development**", "", entry.article.development, "", "**Close**", "", entry.article.close, "",
    "**Try this**", "", ...entry.article.try_this.map((move) => `- ${move}`), ""
  ])
].join("\n");
const fixesMd = [
  "# Sun/Venus 24: seven final owner-directed word fixes", "",
  "All seven substitutions were applied exactly. No other article wording changed in this final pass.", "",
  ...changes.flatMap((entry, index) => [`## ${index + 1}. ${entry.id} — ${entry.field}`, "", "**Before**", "", `> ${entry.before}`, "", "**After**", "", `> ${entry.after}`, ""])
].join("\n");

const body = (article) => [article.opening, article.tension, article.development, article.close].join("\n\n");
const toRow = (entry) => ({
  contentKey: `fallback-hook/sky-sign-copy/${entry.planet}/${entry.sign}`,
  content_role: "fallback_hook", grammar_frame: "continuous_editorial_unit", render_policy: "sky-placement-continuous-v2",
  fact_line: "{{entryDate}} to {{exitDate}}", aspect_insert: "{{aspectInsert}}", ...entry.article,
  body_you: body(entry.article), review_status: "approved", source_keys: [entry.sourceCandidateId],
  approved_via: `${path.relative(repoRoot, paths.approved)}#${entry.id}`,
  note: "Exact owner-approved Sun/Venus fallback article. Serving is controlled independently by the Sky Placement serving manifest."
});
const sunVenusRows = approvedArticles.map((entry) => {
  const row = toRow(entry);
  return { key: row.contentKey, approvedArtifactId: entry.id, approvedArtifactSource: path.relative(repoRoot, paths.approved), sourceKeys: [`${entry.planet}-${entry.sign}`], articleHashSha256: entry.articleHashSha256, rowHashSha256: sha256(row), row };
});
const promotedRows = promotion.servingTransition.rows.map((entry) => {
  const row = {
    contentKey: entry.key, content_role: "fallback_hook", grammar_frame: "continuous_editorial_unit", render_policy: "sky-placement-continuous-v2",
    fact_line: "{{entryDate}} to {{exitDate}}", aspect_insert: "{{aspectInsert}}", ...entry.article,
    body_you: body(entry.article), review_status: "approved", source_keys: entry.sourceKeys,
    approved_via: `${entry.approvedArtifactSource}#${entry.approvedArtifactId}`,
    note: "Exact owner-approved fallback article. Serving is controlled independently by the Sky Placement serving manifest."
  };
  return { ...entry, rowHashSha256: sha256(row), row };
});
const rows = [...sunVenusRows, ...promotedRows];
const keys = rows.map((entry) => entry.key);
if (keys.length !== 26 || new Set(keys).size !== 26) throw new Error("Combined scope must be 26 unique keys.");
const serving = new Set((manifest.releases || []).flatMap((release) => release.distribution_state === "serving" ? release.approved_keys || [] : []));
const replacementKeys = keys.filter((key) => serving.has(key));
const newKeys = keys.filter((key) => !serving.has(key));
if (replacementKeys.length !== 1 || replacementKeys[0] !== "fallback-hook/sky-sign-copy/sun/leo" || newKeys.length !== 25) throw new Error(`Unexpected serving overlap: ${JSON.stringify(replacementKeys)}; additions=${newKeys.length}.`);

const evidence = promotion.servingTransition.deploymentEvidence;
const proposal = {
  schemaVersion: 1,
  id: "sky-placement-sun-venus-chiron-nodes-26-serving-diff-proposal-2026-08-04",
  recordedAt: new Date().toISOString(),
  status: "held_for_explicit_owner_serving_approval",
  transition: "staged_to_serving",
  exactScopedKeyCount: 26,
  contentKeyChanges: {
    netNewKeys: 25, exactPayloadReplacements: 1, replacementKeys, removedKeys: [],
    note: "Sun in Leo already serves under the legacy pre-manifest release. This proposal replaces that payload and reassigns the same key; it does not add a duplicate or remove the key."
  },
  sourcePayloads: [
    { path: path.relative(repoRoot, paths.approved), articleCount: 24, articlesSha256: approvedPayload.articlesSha256, reviewStatus: "approved", ownerApproved: true, servingAuthorized: false },
    { path: path.relative(repoRoot, paths.promotion), articleCount: 2, reviewStatus: "approved", ownerServingPromotionAlreadyApproved: true, servingApplied: false }
  ],
  runtimeEligibilityFlips: promotion.runtimeEligibilityFlips,
  servingTransition: {
    release_id: "sky-placement-sun-venus-chiron-nodes-26", release_batch: "sun-venus-chiron-nodes-26",
    distribution_state_from: "staged", distribution_state_to: "serving", transition: "staged_to_serving",
    required_runtime_capability: "sky-placement-on-demand-v1",
    migration_gate: { status: "verified", deployed_package_version: evidence.deployedPackageVersion, verified_at: evidence.verifiedAt, source: evidence.source },
    approved_keys: keys, owner_approval: null, explicitServingApprovalRequired: true
  },
  rows,
  integrity: { allKeysSha256: sha256(keys), allRowsSha256: sha256(rows.map(({ key, rowHashSha256 }) => ({ key, rowHashSha256 }))), sunVenusLintScore3: 24, sunVenusLintFailures: 0, sunVenusLintWarnings: 0 },
  deploymentEvidence: evidence,
  governance: { applied: false, sourceRowsChanged: false, placementRuntimeEligibilityChanged: false, manifestChanged: false, packagesRegenerated: false, merged: false, deployed: false, explicitOwnerServingConfirmationRequired: true }
};
const proposalMd = [
  "# Sky Placement combined 26-key serving diff proposal", "",
  "Status: held for explicit owner serving confirmation. Nothing in this proposal is merged or deployed.", "",
  "## Summary", "",
  "- 26 exact approved article keys in scope.", "- 24 Sun/Venus exact owner-approved fallback articles.",
  "- Chiron in Aries and Nodes in Aquarius/Leo included from the already-approved promotion.",
  "- 25 net-new keys.", "- 1 exact payload replacement and manifest reassignment: Sun in Leo.", "- 0 content-key removals.",
  "- 3 reviewed fact rows proposed from `runtimeEligible: false` to `true`.",
  "- Standard `staged_to_serving` transition metadata and verified deployment evidence attached.", "",
  "## Sun in Leo overlap", "",
  "`fallback-hook/sky-sign-copy/sun/leo` already serves under the legacy pre-manifest release. The proposed release replaces its exact payload and moves the same key under the new 26-key approval. It must not exist in both releases after application.", "",
  "## Runtime eligibility flips", "", ...proposal.runtimeEligibilityFlips.map((entry) => `- \`${entry.id}\`: \`${entry.before.runtimeEligible}\` → \`${entry.after.runtimeEligible}\``), "",
  "## Keys and payload hashes", "", ...rows.map((entry) => `- \`${entry.key}\` — \`${entry.rowHashSha256}\`${replacementKeys.includes(entry.key) ? " (replacement)" : ""}`), "",
  "## Deployment evidence", "", `- Package: \`${evidence.deployedPackageVersion}\``, `- Verified: \`${evidence.verifiedAt}\``, `- Source: \`${evidence.source}\``, `- Runtime capability: \`${evidence.runtimeCapability}\``, "",
  "## Governance hold", "",
  "The article approvals and the earlier Chiron/Nodes promotion approval do not authorize this combined serving diff. Source rows, runtime flags, the serving manifest, generated packages, merge, and deployment remain unchanged until the owner explicitly confirms this proposal."
].join("\n");

fs.writeFileSync(paths.approved, `${JSON.stringify(approvedPayload, null, 2)}\n`);
fs.writeFileSync(paths.approvedMd, `${articleMd.trimEnd()}\n`);
fs.writeFileSync(paths.fixes, `${fixesMd.trimEnd()}\n`);
fs.writeFileSync(paths.lint, `${JSON.stringify(lintSummary, null, 2)}\n`);
fs.writeFileSync(paths.proposal, `${JSON.stringify(proposal, null, 2)}\n`);
fs.writeFileSync(paths.proposalMd, `${proposalMd.trimEnd()}\n`);
console.log(JSON.stringify({ approvedArticles: 24, exactOwnerFixes: 7, lint: approvedPayload.lintSummary, servingProposal: { exactScopedKeyCount: 26, netNewKeys: 25, exactPayloadReplacements: 1, removedKeys: 0, runtimeEligibilityFlips: 3, heldForOwnerConfirmation: true }, outputs: Object.values(paths).slice(3).map((value) => path.relative(repoRoot, value)) }, null, 2));
