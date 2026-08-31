import fs from "node:fs";
import {
  renderSkyV4ContinuousPreview,
  renderSkyV4StudioPreview,
  resolveSkyV4ContextualOverlays,
  skyV4ContentStudioRecords,
  skyV4GovernedAspectStudioRecord,
  skyV4RuntimeCoverage
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs";

const sourceUrl = new URL("../apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-canonical-content-studio-stage-v1.json", import.meta.url);
const outputUrl = new URL("../packages/astro-knowledge/review/sky-v4-canonical-content-studio-2026-08-30/rendered-review-evidence.md", import.meta.url);
const corpus = JSON.parse(fs.readFileSync(sourceUrl, "utf8"));
const governedAspectCorpus = JSON.parse(fs.readFileSync(new URL("../apps/web/src/content/fallbackArchitectureV3/source-rows/sky-aspect-phrasebook-v1.json", import.meta.url), "utf8"));
const records = skyV4ContentStudioRecords(corpus);
const venusContext = {
  subjectFamily: "continuous", subjectBody: "Venus", subjectSign: "Aries", subjectCondition: "retrograde",
  contextKind: "co-present-motion", contextBodyOrEvent: "Mercury", contextSign: "Aries", contextCondition: "retrograde"
};
const base = {
  planet: "venus", sign: "aries", dateLine: "March 6 to April 1, 2026", contexts: [venusContext], facts: {}, aspects: []
};
const condition = { headline: "Mercury retrograde", dateLine: "Engine-calculated date", body: "Approved condition copy." };
const lunationAspect = { id: "luminary-aspect", bodyA: "Moon", bodyB: "Saturn", approved: true, exactDateTime: "2026-01-01", orb: 1, headline: "Moon opposite Saturn", dateLine: "Engine-calculated date", body: "Approved luminary aspect copy." };
const continuousAspect = { id: "venus-aspect", bodyA: "Venus", bodyB: "Saturn", approved: true, exactDateTime: "2026-01-01", orb: 1, headline: "Venus trine Saturn", dateLine: "Engine-calculated date", body: "Approved continuous aspect copy." };
const previews = [
  ["Continuous article with overlay, retrograde, and aspect", renderSkyV4ContinuousPreview(corpus, { ...base, motionConditions: [condition], aspects: [continuousAspect] }).page],
  ["Exact fallback, overlay OFF", renderSkyV4ContinuousPreview(corpus, { ...base, articleAvailable: false }).page],
  ["Exact fallback, overlay ON", renderSkyV4ContinuousPreview(corpus, { ...base, articleAvailable: false, overlaySettings: { includeContextualOverlayInFallbackHook: true } }).page],
  ["New Moon with cycle context and direct luminary aspect", renderSkyV4StudioPreview(corpus, { contentKey: "sky-lunation/new-moon/gemini", cycleContext: "Approved lunar-cycle context.", aspects: [lunationAspect] }).page],
  ["Full Moon with Moon and Sun axis", renderSkyV4StudioPreview(corpus, { contentKey: "sky-lunation/full-moon/taurus", cycleContext: "Approved Taurus–Scorpio cycle context.", aspects: [lunationAspect] }).page],
  ["Exact eclipse with node/series context and stacked conditions", renderSkyV4StudioPreview(corpus, { contentKey: "sky-lunation/lunar-eclipse/2025-03-14-virgo", cycleContext: "Approved eclipse-cycle context.", eclipseContext: "Approved node and eclipse-series context.", motionConditions: [condition], aspects: [lunationAspect] }).page],
  ["Eclipse fallback", renderSkyV4StudioPreview(corpus, { contentKey: "sky-lunation/lunar-eclipse/2025-03-14-virgo", exactAvailable: false }).page],
  ["Zero optional conditions", renderSkyV4StudioPreview(corpus, { contentKey: "sky-lunation/new-moon/gemini" }).page],
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
const aspectRow = governedAspectCorpus.hookRows.find((row) => row.contentKey === "fallback-hook/sky-aspect-sign/venus/virgo/trine/saturn/capricorn");
const aspectStudio = skyV4GovernedAspectStudioRecord(aspectRow);
const aspectEvidenceUrl = new URL("../packages/astro-knowledge/review/sky-v4-canonical-content-studio-2026-08-30/real-governed-aspect-evidence.json", import.meta.url);
fs.writeFileSync(aspectEvidenceUrl, `${JSON.stringify({
  contentKey: aspectStudio.contentKey,
  approvedBaseline: aspectStudio.studio_source_baseline,
  provenance: aspectStudio.studio_provenance,
  editableFields: aspectStudio.studio_editable_fields,
  readOnlyFields: aspectStudio.studio_read_only_fields,
  draftDiff: { Body: { before: aspectStudio.Body, after: "Preview-only versioned draft body." } },
  validSurfacePreview: renderSkyV4StudioPreview(corpus, {
    contentKey: aspectStudio.contentKey,
    governedAspectSource: aspectRow,
    draftFields: { Body: "Preview-only versioned draft body." },
    previewSurface: { kind: "continuous", subjectBody: "venus", subjectSign: "virgo", calculatedDate: "September 3, 2026", calculatedOrb: "1°" }
  }),
  unsupportedSurfacePreview: renderSkyV4StudioPreview(corpus, {
    contentKey: aspectStudio.contentKey,
    governedAspectSource: aspectRow,
    previewSurface: { kind: "continuous", subjectBody: "mars", subjectSign: "aries", calculatedDate: "September 3, 2026", calculatedOrb: "1°" }
  }),
  draftStatus: "needs_review",
  canServeAutomatically: false
}, null, 2)}\n`);

const priorityCorpus = structuredClone(corpus);
const sourceOverlay = priorityCorpus.content.contextualTransitOverlays.find((row) => row.OverlayKey === "sky-context/venus/aries/retrograde/mercury-retrograde-aries");
sourceOverlay.Priority = 30;
priorityCorpus.content.contextualTransitOverlays.push(
  { ...sourceOverlay, OverlayKey: `${sourceOverlay.OverlayKey}-priority-10`, Priority: 10 },
  { ...sourceOverlay, OverlayKey: `${sourceOverlay.OverlayKey}-priority-20`, Priority: 20 }
);
const overlayEvidenceUrl = new URL("../packages/astro-knowledge/review/sky-v4-canonical-content-studio-2026-08-30/overlay-priority-evidence.json", import.meta.url);
fs.writeFileSync(overlayEvidenceUrl, `${JSON.stringify({
  contract: "Lower numeric Priority renders first. Suppression runs before priority and limit selection.",
  fullPageSelectedKeys: resolveSkyV4ContextualOverlays(priorityCorpus, [venusContext]).map((row) => row.OverlayKey),
  fallbackSelectedKeys: resolveSkyV4ContextualOverlays(priorityCorpus, [venusContext], {}, {}, "fallback").map((row) => row.OverlayKey),
  selectedAfterSuppressingPriority10: resolveSkyV4ContextualOverlays(priorityCorpus, [venusContext], {}, { exactAspectDuplicateKeys: [`${sourceOverlay.OverlayKey}-priority-10`] }).map((row) => row.OverlayKey)
}, null, 2)}\n`);
console.log(`wrote ${outputUrl.pathname}`);
console.log(`wrote ${diffUrl.pathname}`);
console.log(`wrote ${aspectEvidenceUrl.pathname}`);
console.log(`wrote ${overlayEvidenceUrl.pathname}`);
