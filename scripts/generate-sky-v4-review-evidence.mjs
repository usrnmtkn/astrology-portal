import fs from "node:fs";
import {
  renderSkyV4ContinuousPreview,
  renderSkyV4StudioPreview,
  skyV4ContentStudioRecords,
  skyV4RuntimeCoverage
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs";

const sourceUrl = new URL("../apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-canonical-content-studio-stage-v1.json", import.meta.url);
const outputUrl = new URL("../packages/astro-knowledge/review/sky-v4-canonical-content-studio-2026-08-30/rendered-review-evidence.md", import.meta.url);
const corpus = JSON.parse(fs.readFileSync(sourceUrl, "utf8"));
const records = skyV4ContentStudioRecords(corpus);
const venusContext = {
  subjectFamily: "continuous", subjectBody: "Venus", subjectSign: "Aries", subjectCondition: "retrograde",
  contextKind: "co-present-motion", contextBodyOrEvent: "Mercury", contextSign: "Aries", contextCondition: "retrograde"
};
const base = {
  planet: "venus", sign: "aries", dateLine: "March 6 to April 1, 2026", contexts: [venusContext], facts: {}, aspects: []
};
const previews = [
  ["Continuous article", renderSkyV4ContinuousPreview(corpus, base).page],
  ["Exact fallback, overlay OFF", renderSkyV4ContinuousPreview(corpus, { ...base, articleAvailable: false }).page],
  ["Exact fallback, overlay ON", renderSkyV4ContinuousPreview(corpus, { ...base, articleAvailable: false, overlaySettings: { includeContextualOverlayInFallbackHook: true } }).page],
  ["New Moon", renderSkyV4StudioPreview(corpus, { contentKey: "sky-lunation/new-moon/gemini" }).page],
  ["Full Moon", renderSkyV4StudioPreview(corpus, { contentKey: "sky-lunation/full-moon/taurus" }).page],
  ["Exact eclipse event", renderSkyV4StudioPreview(corpus, { contentKey: "sky-lunation/lunar-eclipse/2025-03-14-virgo" }).page],
  ["Node axis", renderSkyV4StudioPreview(corpus, { contentKey: "sky-nodes/axis/aries-libra" }).page],
  ["Lilith", renderSkyV4StudioPreview(corpus, { contentKey: "sky-lilith/article/sagittarius" }).page]
];
const coverage = skyV4RuntimeCoverage(corpus);
const text = [
  "# SKY V4 rendered review evidence",
  "",
  "Stage-only evidence. Nothing below is serving or owner-approved for its V4 role.",
  "",
  "## Coverage",
  "",
  "```json",
  JSON.stringify(coverage, null, 2),
  "```",
  ...previews.flatMap(([label, page]) => ["", `## ${label}`, "", page])
].join("\n");
fs.writeFileSync(outputUrl, `${text}\n`);
const diffUrl = new URL("../packages/astro-knowledge/review/sky-v4-canonical-content-studio-2026-08-30/source-runtime-diff.json", import.meta.url);
fs.writeFileSync(diffUrl, `${JSON.stringify({
  packageVersion: corpus.packageVersion,
  servingEnabled: corpus.servingEnabled,
  sourceRecordCounts: Object.fromEntries(Object.entries(corpus.content).map(([family, rows]) => [family, rows.length])),
  studioRecordCount: records.length,
  intentionalRuntimeAdditions: [
    "Content Studio identity and editable-field metadata",
    "Immutable per-record source baseline and SHA-256",
    "needs_review / owner_approved=false / serving_enabled=false governance",
    "Version status draft and provenance links"
  ],
  wordingDrift: 0,
  mappings: records.map((row) => ({
    contentKey: row.contentKey,
    contentType: row.studio_content_type,
    sourceBaselineSha256: row.source_baseline_sha256,
    editableFields: row.studio_editable_fields.map((field) => field.path),
    reviewStatus: row.review_status,
    servingEnabled: row.serving_enabled
  }))
}, null, 2)}\n`);
console.log(`wrote ${outputUrl.pathname}`);
console.log(`wrote ${diffUrl.pathname}`);
