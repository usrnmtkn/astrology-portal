#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const INVENTORY_PATH = "artifacts/natal-chart-content-qa-inventory-2026-08-12.json";
const RESULTS_PATH = "packages/astro-knowledge/review/natal-chart-content-qa-semantic-results-2026-08-12.json";
const SCHEDULE_PATH = "packages/astro-knowledge/review/natal-chart-content-qa-scheduled-work-coverage-2026-08-12.json";
const OUTPUT_PATH = "packages/astro-knowledge/review/natal-chart-content-qa-source-rollup-2026-08-12.json";
const SUMMARY_PATH = "packages/astro-knowledge/review/natal-chart-content-qa-source-rollup-2026-08-12.md";
const SOURCE_ROWS_PATH = "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json";
const TEMPLATES_PATH = "apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json";

const argv = process.argv.slice(2);
const friendAuditIndex = argv.indexOf("--friend-audit");
const friendAuditPath = friendAuditIndex >= 0 ? argv[friendAuditIndex + 1] : null;
const write = argv.includes("--write");

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const sorted = (values) => [...new Set(values)].sort((a, b) => a.localeCompare(b));
const percentage = (numerator, denominator) => denominator === 0 ? null : Number(((numerator / denominator) * 100).toFixed(2));

function buildScheduleManifest(auditPath) {
  assert.ok(auditPath && fs.existsSync(auditPath), "--friend-audit must point to friend-natal-voice-audit-v1.json.");
  const raw = fs.readFileSync(auditPath, "utf8");
  const audit = JSON.parse(raw);
  const affectedItems = Object.entries(audit.composedTriage.items)
    .flatMap(([triage, items]) => items
      .filter((item) => item.findings.length > 0)
      .map((item) => ({
        id: item.id,
        family: item.family,
        triage,
        findings: sorted(item.findings.map((finding) => finding.code)),
      })))
    .sort((a, b) => a.id.localeCompare(b.id));

  const findingCounts = {};
  for (const item of affectedItems) {
    for (const finding of item.findings) findingCounts[finding] = (findingCounts[finding] ?? 0) + 1;
  }
  assert.deepEqual(findingCounts, {
    "banned-vocabulary": 378,
    "real-filler": 49,
    "repeating-skeleton": 146,
    "source-facing-language": 144,
    "translation-required": 3,
  });

  return {
    schemaVersion: "natal-chart-content-qa-scheduled-work-coverage-v1",
    generatedOn: "2026-08-12",
    authority: {
      pass2Plan: "packages/astro-knowledge/review/friend-natal-pass-2-plan-2026-08-11.md@700f1bd0",
      broaderBatch: "packages/astro-knowledge/review/friend-natal-voice-audit-v1.json@700f1bd0",
      broaderBatchSha256: sha256(raw),
      ownerDecision: "Broader defect batch authorized strictly after pass 2; no content authorization.",
    },
    pass2: {
      surface: "friend",
      contentAuthored: false,
      status: "scheduled-review-gated",
      authoredReplacementFamilies: ["placement-composed"],
      frameRewriteFamilies: ["named-point", "natal-aspect", "glossary"],
      retiredSourcePrefixes: ["fallback-hook/ruler-method/"],
      legacyEmptyHousePrefixes: [
        "fallback-hook/empty-house-ruler-v3/",
        "fallback-hook/empty-house-ruler/",
        "fallback-hook/empty-house-placement/",
        "fallback-hook/empty-house/bridge/",
        "fallback-hook/empty-house/close/",
        "fallback-hook/empty-house/explainer/",
      ],
      note: "Pass 2 is Friend-only, review-gated, and has zero authored rows in its recorded scaffold. 'Covered' means scheduled supersession, not serving promotion.",
    },
    broaderBatch: {
      surface: "friend",
      status: "authorized-after-pass-2",
      findingCounts,
      affectedItems,
    },
  };
}

function normalizeOtherNamed(label) {
  const value = String(label ?? "").toLowerCase();
  if (/contradic|reversal|inconsisten|conflict(?:ing|s)? claim|opposite direction|mutually exclusive|unreconciled tension/.test(value)) return "contradiction";
  if (/competing|two (?:separate|disconnected|different|unrelated)|parallel (?:messages|themes|ideas)|multiple (?:central|main)|different messages|unrelated (?:messages|themes|sections)|split focus|dual focus/.test(value)) return "competing-messages";
  if (/assembled|\blist\b|stack|pile[ -]?up|catalog|modul|stitch|splic|accumulat|keyword|overload|collection of|grab bag|laundry/.test(value)) return "assembled-list";
  if (/unsupported|unearned|invented|irrelevant (?:claim|detail|prediction)|\bclaim\b|assertion|prediction|inference|backstory|personal history|life-stage|mortality|fatalis|medical|health warning|unintroduced/.test(value)) return "unsupported-claim";
  return "unbridged-shift";
}

function logicalItemId(occurrence) {
  const facts = occurrence.facts;
  switch (occurrence.family) {
    case "placement-composed": return `placement:${facts.planet}/${facts.sign}`;
    case "named-point": return `angle:${facts.angle}/${facts.sign}`;
    case "natal-aspect": return `aspect:${facts.planetA}/${facts.aspect}/${facts.planetB}`;
    case "natal-aspect-pattern": return `aspect-pattern:${facts.type}`;
    case "empty-house": return `empty:${facts.house}/${facts.sign}`;
    case "glossary": return `glossary:${facts.house}`;
    default: throw new Error(`Unknown family ${occurrence.family}.`);
  }
}

function reverseAspectId(id) {
  const match = /^aspect:([^/]+)\/([^/]+)\/([^/]+)$/.exec(id);
  return match ? `aspect:${match[3]}/${match[2]}/${match[1]}` : id;
}

function isPass2Covered(occurrence, sourceKey, schedule) {
  if (occurrence.surface !== "friend") return false;
  if (schedule.pass2.authoredReplacementFamilies.includes(occurrence.family)) return true;
  if (occurrence.family === "named-point" || occurrence.family === "glossary") return true;
  if (occurrence.family === "natal-aspect") {
    return sourceKey === "fallback-template/natal.aspect"
      || sourceKey.startsWith("fallback-hook/aspect-type/")
      || sourceKey.startsWith("fallback-hook/aspect-pair/");
  }
  return schedule.pass2.retiredSourcePrefixes.some((prefix) => sourceKey.startsWith(prefix))
    || schedule.pass2.legacyEmptyHousePrefixes.some((prefix) => sourceKey.startsWith(prefix));
}

function isBroaderBatchCovered(occurrence, broaderIds) {
  if (occurrence.surface !== "friend") return false;
  const id = logicalItemId(occurrence);
  return broaderIds.has(id) || broaderIds.has(reverseAspectId(id));
}

function classifySourceKey(sourceKey, sourceRowByKey, templateByKey) {
  if (sourceRowByKey.has(sourceKey)) {
    const row = sourceRowByKey.get(sourceKey);
    return { sourceKind: row.content_role ?? "source-row", sourceLocation: SOURCE_ROWS_PATH };
  }
  if (templateByKey.has(sourceKey)) return { sourceKind: "template-row", sourceLocation: TEMPLATES_PATH };
  if (sourceKey.startsWith("fallback-template/")) {
    return {
      sourceKind: "resolver-frame-id",
      sourceLocation: "apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.mjs",
    };
  }
  return { sourceKind: "unresolved-dependency", sourceLocation: null };
}

function chooseWorstExample(candidates) {
  const verdictRank = { CUT: 0, EDIT: 1 };
  const defectRank = {
    contradiction: 0,
    "competing-messages": 1,
    "assembled-list": 2,
    "unsupported-claim": 3,
    "unbridged-shift": 4,
    "scaffold-grammar": 5,
    "translation-required": 6,
    "astrology-restated": 7,
  };
  return [...candidates].sort((a, b) =>
    (verdictRank[a.verdict] ?? 9) - (verdictRank[b.verdict] ?? 9)
    || (defectRank[a.normalizedDefectClass] ?? 8) - (defectRank[b.normalizedDefectClass] ?? 8)
    || a.reviewId.localeCompare(b.reviewId))[0];
}

const inventory = readJson(INVENTORY_PATH);
const semantic = readJson(RESULTS_PATH);
let schedule;
if (friendAuditPath) {
  schedule = buildScheduleManifest(friendAuditPath);
  if (write) fs.writeFileSync(SCHEDULE_PATH, `${JSON.stringify(schedule, null, 2)}\n`);
} else {
  schedule = readJson(SCHEDULE_PATH);
}

const source = readJson(SOURCE_ROWS_PATH);
const templates = readJson(TEMPLATES_PATH);
const sourceRows = [...source.vocabularyRows, ...source.fallbackSourceRows, ...source.hookRows];
const sourceRowByKey = new Map(sourceRows.map((row) => [row.contentKey, row]));
const templateByKey = new Map(templates.templates.map((row) => [row.contentKey, row]));
const inventoryById = new Map(inventory.reviewQueue.map((item) => [item.reviewId, item]));
const broaderIds = new Set(schedule.broaderBatch.affectedItems.map((item) => item.id));
const broaderItemById = new Map(schedule.broaderBatch.affectedItems.map((item) => [item.id, item]));

const aggregates = new Map();
const flaggedIds = new Set();
let otherNamedCount = 0;
const normalizedOtherNamedCounts = {};

function getAggregate(sourceKey) {
  if (!aggregates.has(sourceKey)) {
    aggregates.set(sourceKey, {
      sourceKey,
      families: new Set(),
      surfaces: new Set(),
      judgedReviewIds: new Set(),
      flaggedReviewIds: new Set(),
      defectClassCounts: {},
      coveragePassageCounts: { a: 0, b: 0, c: 0 },
      coverageEvidence: { a: new Set(), b: new Set(), c: new Set() },
      examples: [],
    });
  }
  return aggregates.get(sourceKey);
}

for (const result of semantic.results) {
  if (result.status === "deferred-pending-pass-2") continue;
  const item = inventoryById.get(result.reviewId);
  assert.ok(item, `Missing inventory item ${result.reviewId}.`);
  const dependencies = new Map();
  for (const occurrence of item.occurrences) {
    for (const sourceKey of occurrence.sourceKeys) {
      const key = `${sourceKey}\0${occurrence.renderKey}`;
      dependencies.set(key, { sourceKey, occurrence: { ...occurrence, surface: item.surface } });
    }
  }
  const sourceKeys = sorted([...dependencies.values()].map((entry) => entry.sourceKey));
  for (const sourceKey of sourceKeys) getAggregate(sourceKey).judgedReviewIds.add(result.reviewId);

  if (result.verdict !== "EDIT" && result.verdict !== "CUT") continue;
  flaggedIds.add(result.reviewId);
  const normalizedDefectClass = result.defectClass === "other-named"
    ? normalizeOtherNamed(result.otherDefectName)
    : result.defectClass;
  if (result.defectClass === "other-named") {
    otherNamedCount += 1;
    normalizedOtherNamedCounts[normalizedDefectClass] = (normalizedOtherNamedCounts[normalizedDefectClass] ?? 0) + 1;
  }
  for (const sourceKey of sourceKeys) {
    const aggregate = getAggregate(sourceKey);
    aggregate.flaggedReviewIds.add(result.reviewId);
    aggregate.defectClassCounts[normalizedDefectClass] = (aggregate.defectClassCounts[normalizedDefectClass] ?? 0) + 1;
    const matchingOccurrences = [...dependencies.values()]
      .filter((entry) => entry.sourceKey === sourceKey)
      .map((entry) => entry.occurrence);
    for (const occurrence of matchingOccurrences) {
      aggregate.families.add(occurrence.family);
      aggregate.surfaces.add(occurrence.surface);
    }
    const coverages = new Set();
    for (const occurrence of matchingOccurrences) {
      const logicalId = logicalItemId(occurrence);
      if (isPass2Covered(occurrence, sourceKey, schedule)) {
        coverages.add("a");
        aggregate.coverageEvidence.a.add(logicalId);
      } else if (isBroaderBatchCovered(occurrence, broaderIds)) {
        coverages.add("b");
        const matchedId = broaderIds.has(logicalId) ? logicalId : reverseAspectId(logicalId);
        const findings = broaderItemById.get(matchedId)?.findings ?? [];
        aggregate.coverageEvidence.b.add(`${matchedId} [${findings.join(", ")}]`);
      } else {
        coverages.add("c");
        aggregate.coverageEvidence.c.add(`${occurrence.surface}:${logicalId}`);
      }
    }
    for (const coverage of coverages) aggregate.coveragePassageCounts[coverage] += 1;
    aggregate.examples.push({
      reviewId: result.reviewId,
      surface: item.surface,
      family: matchingOccurrences[0].family,
      route: matchingOccurrences[0].route,
      renderKey: matchingOccurrences[0].renderKey,
      renderedTextSha256: result.renderedTextSha256,
      renderedText: item.renderedText,
      verdict: result.verdict,
      defectClass: result.defectClass,
      otherDefectName: result.otherDefectName,
      normalizedDefectClass,
      coreMessage: result.coreMessage,
      diagnosis: result.diagnosis,
    });
  }
}

assert.equal(flaggedIds.size, 4816, "Expected all 4,816 EDIT/CUT passages.");
assert.equal(otherNamedCount, 1841, "Expected all 1,841 other-named defects.");
assert.deepEqual(sorted(Object.keys(normalizedOtherNamedCounts)), sorted([
  "unbridged-shift", "competing-messages", "assembled-list", "contradiction", "unsupported-claim",
]));

const rows = [...aggregates.values()]
  .filter((aggregate) => aggregate.flaggedReviewIds.size > 0)
  .map((aggregate) => {
    const worstExample = chooseWorstExample(aggregate.examples);
    const identity = classifySourceKey(aggregate.sourceKey, sourceRowByKey, templateByKey);
    const scheduleClass = aggregate.coveragePassageCounts.c > 0 ? "c-newly-discovered"
      : aggregate.coveragePassageCounts.a > 0 ? "a-pass-2-scheduled"
        : "b-authorized-broader-batch";
    return {
      sourceKey: aggregate.sourceKey,
      ...identity,
      families: sorted(aggregate.families),
      surfaces: sorted(aggregate.surfaces),
      flaggedPassages: aggregate.flaggedReviewIds.size,
      judgedPassages: aggregate.judgedReviewIds.size,
      flagRatePct: percentage(aggregate.flaggedReviewIds.size, aggregate.judgedReviewIds.size),
      defectClassCounts: Object.fromEntries(Object.entries(aggregate.defectClassCounts).sort(([a], [b]) => a.localeCompare(b))),
      scheduleClass,
      newScopeRequired: scheduleClass === "c-newly-discovered",
      coveragePassageCounts: aggregate.coveragePassageCounts,
      coverageEvidence: Object.fromEntries(Object.entries(aggregate.coverageEvidence).map(([key, values]) => [key, sorted(values)])),
      worstExample,
    };
  })
  .sort((a, b) => a.sourceKey.localeCompare(b.sourceKey));

assert.equal(rows.length, 603, "Expected 603 distinct source rows/frames to account for all flags.");
assert.equal(rows.filter((row) => row.sourceKind === "unresolved-dependency").length, 0, "Every dependency must resolve to a row or named resolver frame.");

const verdictById = new Map(semantic.results.filter((result) => result.verdict).map((result) => [result.reviewId, result.verdict]));
const emptyHouseItems = inventory.reviewQueue.filter((item) => item.occurrences.some((occurrence) => occurrence.family === "empty-house") && verdictById.has(item.reviewId));
const rulerItems = emptyHouseItems.filter((item) => item.occurrences.some((occurrence) => occurrence.family === "empty-house" && Number.isInteger(occurrence.facts.rulerHouse)));
const nonRulerItems = emptyHouseItems.filter((item) => !rulerItems.includes(item));
const rulerFlagged = rulerItems.filter((item) => ["EDIT", "CUT"].includes(verdictById.get(item.reviewId)));
const nonRulerFlagged = nonRulerItems.filter((item) => ["EDIT", "CUT"].includes(verdictById.get(item.reviewId)));
const bySurface = Object.fromEntries(["you", "friend"].map((surface) => {
  const judged = rulerItems.filter((item) => item.surface === surface);
  const flagged = judged.filter((item) => ["EDIT", "CUT"].includes(verdictById.get(item.reviewId)));
  return [surface, {
    judged: judged.length,
    flagged: flagged.length,
    edit: flagged.filter((item) => verdictById.get(item.reviewId) === "EDIT").length,
    cut: flagged.filter((item) => verdictById.get(item.reviewId) === "CUT").length,
    flagRatePct: percentage(flagged.length, judged.length),
  }];
}));

const rulerComposition = {
  rulerComposedEmptyHouseRenders: rulerItems.length,
  rulerComposedFlagged: rulerFlagged.length,
  rulerComposedFlagRatePct: percentage(rulerFlagged.length, rulerItems.length),
  rulerComposedEdit: rulerFlagged.filter((item) => verdictById.get(item.reviewId) === "EDIT").length,
  rulerComposedCut: rulerFlagged.filter((item) => verdictById.get(item.reviewId) === "CUT").length,
  nonRulerEmptyHouseRenders: nonRulerItems.length,
  nonRulerFlagged: nonRulerFlagged.length,
  nonRulerFlagRatePct: percentage(nonRulerFlagged.length, nonRulerItems.length),
  comparisonAvailable: nonRulerItems.length > 0,
  bySurface,
  finding: "Every judged empty-house render in this inventory supplies rulerHouse and composes sign/house material with ruler-house material; there is no non-ruler control group.",
  recommendation: "Extend ruler-method retirement/supersession to the You surface. Prefer authored whole passages over generic bridges; the latter would retain the assembly seam and introduce another grammar-sensitive frame. Owner ruling is required before any change.",
  changesAuthorized: false,
};
assert.deepEqual(rulerComposition, {
  rulerComposedEmptyHouseRenders: 3168,
  rulerComposedFlagged: 1425,
  rulerComposedFlagRatePct: 44.98,
  rulerComposedEdit: 1411,
  rulerComposedCut: 14,
  nonRulerEmptyHouseRenders: 0,
  nonRulerFlagged: 0,
  nonRulerFlagRatePct: null,
  comparisonAvailable: false,
  bySurface,
  finding: rulerComposition.finding,
  recommendation: rulerComposition.recommendation,
  changesAuthorized: false,
});

const scheduleCounts = rows.reduce((counts, row) => {
  counts[row.scheduleClass] = (counts[row.scheduleClass] ?? 0) + 1;
  return counts;
}, {});
const familyCounts = {};
for (const row of rows) for (const family of row.families) familyCounts[family] = (familyCounts[family] ?? 0) + 1;

const output = {
  schemaVersion: "natal-chart-content-qa-source-rollup-v1",
  generatedOn: "2026-08-12",
  inputs: {
    inventoryPath: INVENTORY_PATH,
    inventorySha256: sha256(fs.readFileSync(INVENTORY_PATH)),
    semanticResultsPath: RESULTS_PATH,
    semanticResultsSha256: sha256(fs.readFileSync(RESULTS_PATH)),
    scheduledWorkPath: SCHEDULE_PATH,
    scheduledWorkSha256: sha256(JSON.stringify(schedule)),
  },
  governance: {
    advisoryOnly: true,
    copyChanges: false,
    approvalChanges: false,
    servingChanges: false,
    autoPublish: false,
    writerPromotion: false,
  },
  summary: {
    flaggedPassages: flaggedIds.size,
    distinctSourceRowsAndFrames: rows.length,
    scheduleClassCounts: scheduleCounts,
    rowsByFamily: familyCounts,
    otherNamedPassagesNormalized: otherNamedCount,
    normalizedOtherNamedCounts,
  },
  scheduleInterpretation: {
    a: "Scheduled Friend pass-2 authored replacement or frame rewrite; review-gated and not serving.",
    b: "Covered on the Friend surface by the authorized broader defect batch queued after pass 2.",
    c: "At least one flagged use is not touched by scheduled Friend pass 2 or its broader batch; new scope is required.",
    precedence: "A row is marked c if any flagged use is uncovered, otherwise a if pass 2 covers it, otherwise b.",
  },
  otherNamedNormalization: {
    buckets: ["unbridged-shift", "competing-messages", "assembled-list", "contradiction", "unsupported-claim"],
    method: "Deterministic label-pattern normalization. Original labels remain in each worst-example record and in the passage-level evidence artifact.",
  },
  rulerComposition,
  rows,
};

const md = `# Natal Chart semantic QA source-row rollup — 2026-08-12

**Status:** complete advisory evidence  
**Owner review unit:** source row or resolver frame  
**Governance:** no copy, approval, serving, auto-publish, or writer-promotion changes

## Result

All **${output.summary.flaggedPassages.toLocaleString("en-US")}** EDIT/CUT passages map to **${rows.length.toLocaleString("en-US")} distinct source rows or frames** through the inventory's composition dependencies. A flagged passage may implicate multiple dependencies; the row table therefore reports unique passages per dependency, not additive attribution.

| Scheduled-work class | Distinct rows/frames |
| --- | ---: |
| (a) Friend pass-2 scheduled supersession or frame rewrite | ${(scheduleCounts["a-pass-2-scheduled"] ?? 0).toLocaleString("en-US")} |
| (b) Authorized broader Friend defect batch | ${(scheduleCounts["b-authorized-broader-batch"] ?? 0).toLocaleString("en-US")} |
| (c) Newly discovered / at least one uncovered use | ${(scheduleCounts["c-newly-discovered"] ?? 0).toLocaleString("en-US")} |

The classification is conservative across surfaces: if pass 2 covers a Friend use of a shared row but the same row feeds a flagged You passage, the row is class (c), with the partial (a)/(b)/(c) counts preserved in the JSON and workbook. Pass 2 still has zero authored rows in its recorded scaffold, so class (a) means scheduled and review-gated—not promoted or serving.

## Seam-label normalization

The **${otherNamedCount.toLocaleString("en-US")}** improvised \`other-named\` labels were normalized into five seam buckets while their original labels remain in the passage evidence and worst-example records.

| Seam bucket | Passages |
| --- | ---: |
${Object.entries(normalizedOtherNamedCounts).sort(([a], [b]) => a.localeCompare(b)).map(([key, count]) => `| ${key} | ${count.toLocaleString("en-US")} |`).join("\n")}

## Ruler-composition finding

All **${rulerItems.length.toLocaleString("en-US")}** judged empty-house renders use ruler composition. **${rulerFlagged.length.toLocaleString("en-US")}** were EDIT/CUT (**${rulerComposition.rulerComposedFlagRatePct}%**): ${rulerComposition.rulerComposedEdit.toLocaleString("en-US")} EDIT and ${rulerComposition.rulerComposedCut.toLocaleString("en-US")} CUT.

| Surface | Ruler renders | Flagged | Flag rate | CUT |
| --- | ---: | ---: | ---: | ---: |
| You | ${bySurface.you.judged.toLocaleString("en-US")} | ${bySurface.you.flagged.toLocaleString("en-US")} | ${bySurface.you.flagRatePct}% | ${bySurface.you.cut} |
| Friend | ${bySurface.friend.judged.toLocaleString("en-US")} | ${bySurface.friend.flagged.toLocaleString("en-US")} | ${bySurface.friend.flagRatePct}% | ${bySurface.friend.cut} |

There are **0 non-ruler empty-house renders** in this inventory, so a ruler-vs-non-ruler rate comparison is unavailable rather than zero. The evidence still shows the unbridged ruler seam on both surfaces. Recommendation: **extend ruler-method retirement/supersession to You and prefer authored whole passages over adding generic bridges**. This is a recommendation only; an owner ruling is required before changes.

## Evidence and owner review

- Full passage evidence remains in \`${RESULTS_PATH}\`.
- The passage-level workbook remains evidence, not the owner-review unit.
- Row-level machine evidence is in \`${OUTPUT_PATH}\`.
- The row-level owner workbook contains one row per contributing source row/frame and its composed worst example.
`;

if (write) {
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
  fs.writeFileSync(SUMMARY_PATH, md);
  console.log(`Wrote ${SCHEDULE_PATH}, ${OUTPUT_PATH}, and ${SUMMARY_PATH}.`);
} else {
  console.log(JSON.stringify(output.summary, null, 2));
}

export { normalizeOtherNamed };
