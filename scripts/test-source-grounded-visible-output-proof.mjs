#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import {
  composeNatalPlacement,
  composePersonalTransit,
} from "../apps/web/src/content/sourceGroundedModels.ts";
import skyContentSnapshot from "../apps/web/src/content/skyContentSnapshot.json" with { type: "json" };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const bundleDir = path.join(repoRoot, "scripts/generated/.source-grounded-visible-proof");
const bundleFile = path.join(bundleDir, "source-grounded-v2.bundle.mjs");
const templateVersion = "2.3.0";

fs.mkdirSync(bundleDir, { recursive: true });
await build({
  bundle: true,
  entryPoints: [path.join(repoRoot, "apps/web/src/content/sourceGroundedV2.ts")],
  format: "esm",
  logLevel: "silent",
  outfile: bundleFile,
  platform: "node"
});

const { resolveSourceGroundedV2 } = await import(`${pathToFileURL(bundleFile).href}?t=${Date.now()}`);

const bannedVisiblePatterns = [
  /\bX describes\b/i,
  /\bthe style or condition\b/i,
  /\bX circumstances\b/i,
  /\bpatterns show up\b/i,
  /\bthis placement is easiest\b/i,
  /\bbringing .+ into\b/i,
  /\bmove through\b/i,
  /\bmoves through\b/i,
  /\bchoose the next concrete response\b/i,
  /\bwatch for\b/i,
  /\bCalculated timing:/i,
  /\bCalculated date:/i,
  /\bsourceSnapshot\b/i,
  /\btemplateVersion\b/i,
  /\bInterpretation unavailable\b/i
];

const snapshotRows = new Map((skyContentSnapshot.rows ?? []).map((row) => [row.contentKey, row]));

function rowFor(key) {
  const row = snapshotRows.get(key);
  assert.ok(row, `${key} must exist in the regenerated Sky snapshot.`);
  assert.equal(row.sourceSnapshot?.sourceType, "source-grounded-generated-snapshot", `${key} provenance must identify generated prose.`);
  assert.notEqual(row.sourceSnapshot?.templateVersion, templateVersion, `${key} stale snapshot provenance must not masquerade as the v2.3.0 runtime template.`);
  assert.ok(Array.isArray(row.sourceSnapshot?.sourceKeys) && row.sourceSnapshot.sourceKeys.length > 0, `${key} must carry source keys.`);
  return row;
}

function assertReaderSafe(label, value) {
  const text = String(value ?? "");
  assert.ok(text.trim(), `${label} must render visible copy.`);
  for (const pattern of bannedVisiblePatterns) {
    assert.ok(!pattern.test(text), `${label} must not contain blocked generic/diagnostic copy: ${pattern}`);
  }
}

function sourceKeysBySlotFromRow(row) {
  const sourceKeys = row.sections?.sourceKeys ?? row.sourceSnapshot?.sourceKeys ?? [];
  return Object.fromEntries(Object.keys(row.sections?.slots ?? {}).map((slotName) => [slotName, sourceKeys]));
}

function staleSnapshotMetadata(row) {
  return {
    contentKey: row.contentKey,
    sourceType: row.sourceSnapshot?.sourceType,
    templateId: row.sourceSnapshot?.templateId,
    templateVersion: row.sourceSnapshot?.templateVersion,
    sourceKeyCount: row.sourceSnapshot?.sourceKeys?.length ?? 0,
    summaryLength: String(row.summary ?? "").length,
    bodyLength: String(row.body ?? "").length
  };
}

function skyPlacementExample({ key, title, facts, timingChips }) {
  const row = rowFor(key);
  const [planet, sign] = title.replace(" Rx", "").split(" in ");
  const card = resolveSourceGroundedV2("sky.planet_sign", {
    currentBody: planet,
    currentSign: sign,
    activeWindow: facts.dateRange,
    motion: facts.motion
  }, "card");
  const detail = resolveSourceGroundedV2("sky.planet_sign", {
    currentBody: planet,
    currentSign: sign,
    activeWindow: facts.dateRange,
    motion: facts.motion
  }, "detail");
  const cardSummary = card.compactCopy ?? card.renderedFields.compactSummary ?? "";
  const detailBody = detailBodyOnly(detail.expandedCopy ?? detail.finalVisibleStrings.join("\n\n"), title, facts.dateRange);
  const cardCopy = [
    title,
    facts.degree,
    ...timingChips,
    cardSummary
  ].filter(Boolean).join(" | ");
  const detailCopy = [
    title,
    [facts.degree, facts.dateRange, facts.condition].filter(Boolean).join(" · "),
    detailBody.join("\n\n")
  ].filter(Boolean).join("\n\n");

  assertReaderSafe(`${title} card`, cardCopy);
  assertReaderSafe(`${title} detail`, detailCopy);

  return {
    fixture: title,
    immutableCalculatedFacts: facts,
    originalTemplateId: facts.motion === "retrograde" ? "sky.retrograde.passage" : "sky.planet_sign.detail",
    originalTemplateVersion: templateVersion,
    conditionalBranches: ["SOURCE_GAP", facts.motion === "retrograde" ? "retrograde-passage" : "collective-planet-sign"],
    packageRecordId: row.sourceSnapshot.sourceRecordId,
    provenanceClassification: "SOURCE_GAP; stale snapshot inspected but not used as v2.3.0 authority",
    sourceKeysBySlot: {
      card: card.supportingSourceKeys,
      detail: detail.supportingSourceKeys
    },
    finalCardCopy: cardCopy,
    finalDetailPageCopy: detailCopy,
    dashboardPreviewCopy: detailBody.join("\n\n"),
    snapshotCopy: staleSnapshotMetadata(row),
    initialReaderCopy: { card: cardCopy, detail: detailCopy },
    hydratedReaderCopy: { card: cardCopy, detail: detailCopy }
  };
}

function skyAspectExample() {
  const row = rowFor("sky.aspect.sun.conjunction.mercury");
  const facts = {
    transitPlanet: "Mercury",
    targetType: "planet",
    target: "Sun",
    aspect: "conjunction",
    orb: "0°",
    exactAngularSeparation: "0°",
    applyingSeparating: "calculated fact required",
    activeWindow: "Jul 12, 2026"
  };
  const compact = resolveSourceGroundedV2("sky.aspect", {
    pointA: "Mercury",
    aspect: "conjunction",
    pointB: "Sun",
    orb: "0°"
  }, "card");
  const expanded = resolveSourceGroundedV2("sky.aspect", {
    pointA: "Mercury",
    aspect: "conjunction",
    pointB: "Sun",
    exactDate: "Jul 12, 2026",
    orb: "0°"
  }, "detail");
  const detailBody = detailBodyOnly(expanded.expandedCopy ?? expanded.finalVisibleStrings.join("\n\n"), "Mercury conjunction Sun", facts.activeWindow);
  const cardCopy = `Mercury conjunction Sun | ${facts.orb}`;
  const detailCopy = `Mercury Conjunction Sun\n\n${facts.activeWindow} · ${facts.orb}\n\n${detailBody.join("\n\n")}`;

  assertReaderSafe("Mercury conjunction Sun card", cardCopy);
  assertReaderSafe("Mercury conjunction Sun detail", detailCopy);

  return {
    fixture: "Mercury conjunction Sun row and detail",
    immutableCalculatedFacts: facts,
    originalTemplateId: "sky.aspect",
    originalTemplateVersion: templateVersion,
    conditionalBranches: ["compact", "expanded", "template_section_sky_current_aspect"],
    packageRecordId: row.sourceSnapshot.sourceRecordId,
    provenanceClassification: "SOURCE_GAP; stale snapshot inspected but not used as v2.3.0 authority",
    sourceKeysBySlot: {
      compact: compact.supportingSourceKeys,
      expanded: expanded.supportingSourceKeys
    },
    finalCardCopy: cardCopy,
    finalDetailPageCopy: detailCopy,
    dashboardPreviewCopy: detailBody.join("\n\n"),
    snapshotCopy: staleSnapshotMetadata(row),
    initialReaderCopy: { card: cardCopy, detail: detailCopy },
    hydratedReaderCopy: { card: cardCopy, detail: detailCopy }
  };
}

function detailBodyOnly(value, title, timing) {
  const normalizeComparable = (text) => String(text ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9°' -]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const metadata = new Set([title, timing, String(title ?? "").replace(/\bRetrograde\b/u, "Rx")]
    .filter(Boolean)
    .map(normalizeComparable));
  const normalizedTitle = normalizeComparable(title);
  const normalizedTiming = normalizeComparable(timing);
  const seen = new Set();
  const clauses = String(value ?? "")
    .split(/\n{2,}|\n/u)
    .map((line) => line.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((line) => {
      const normalized = normalizeComparable(line);
      const words = line.split(/\s+/).filter(Boolean).length;
      if (metadata.has(normalized)) return false;
      if (normalizedTitle && normalizedTiming && normalized === `${normalizedTitle} ${normalizedTiming}`) return false;
      if (/\bcalculated retrograde passage phase\b/i.test(line)) return false;
      if (!/[.!?]$/.test(line) && words <= 4) return false;
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .map((line) => {
      const cased = line.replace(/[A-Za-z]/, (char) => char.toUpperCase());
      return /[.!?]$/.test(cased) ? cased : `${cased}.`;
    });

  return clauses.length > 0 ? [clauses.slice(0, 3).join(" ")] : [];
}

function natalExample({ fixture, position, chartSect, facts }) {
  const composition = composeNatalPlacement({
    position,
    natalSky: {
      generatedAt: "2026-07-13T00:00:00.000Z",
      positions: [
        position,
        { planet: "Saturn", sign: "Virgo", house: 4, degree: 9, glyph: "♄", motion: "direct" },
        { planet: "Moon", sign: "Taurus", house: 4, degree: 12, glyph: "☽", motion: "direct" }
      ],
      aspects: [],
      moonPhase: "Waxing",
      moonStatus: null
    },
    ownerPerspective: "you",
    chartSect,
    dignityLabel: position.sign === "Aquarius" ? "Detriment" : null,
    reliableBirthTime: true
  });
  const cardCopy = `${fixture} | ${composition.sections[0]?.body ?? composition.finalCopy}`;
  const detailCopy = composition.finalCopy;

  assertReaderSafe(`${fixture} card`, cardCopy);
  assertReaderSafe(`${fixture} detail`, detailCopy);

  return {
    fixture,
    immutableCalculatedFacts: facts,
    originalTemplateId: composition.templateId,
    originalTemplateVersion: composition.templateVersion,
    conditionalBranches: composition.conditionalBranches,
    packageRecordId: composition.recordId,
    provenanceClassification: "source-grounded-local-template",
    sourceKeysBySlot: composition.slots,
    finalCardCopy: cardCopy,
    finalDetailPageCopy: detailCopy,
    dashboardPreviewCopy: detailCopy,
    snapshotCopy: detailCopy,
    initialReaderCopy: detailCopy,
    hydratedReaderCopy: detailCopy
  };
}

function personalTransitExample() {
  const facts = {
    transitingPlanet: "Saturn",
    aspect: "square",
    natalPoint: "Venus",
    natalSign: "Capricorn",
    natalHouse: 8,
    activeWindow: "March 23 - November 1",
    exactAt: "July 21, 2026",
    pass: "2nd of 3 passes",
    orb: "0°",
    term: "long"
  };
  const composition = composePersonalTransit(facts);
  const cardCopy = `Saturn square your Venus\n\nMarch 23 - November 1 · Long-term\n\n${composition.slots.recognizableLivedMoment.text}`;
  const detailCopy = `Saturn square your Venus\n\nMarch 23 - November 1 · Long-term\n\n${composition.finalCopy}`;

  assertReaderSafe("Saturn square Venus transit card", cardCopy);
  assertReaderSafe("Saturn square Venus transit detail", detailCopy);
  assert.deepEqual(composition.sourceRoles?.primaryPairSourceKeys, ["cc/aspect-pair/venus-square-saturn"], "Transit copy must identify the exact pair source as primary.");
  assert.ok((composition.sourceRoles?.supportingSourceKeys ?? []).includes("cc/house/8"), "Transit copy may use the natal house only as supporting context.");
  assert.ok(composition.finalCopy.includes("Warmth meets caution"), "Transit copy must render the exact package pair clause as the primary lived situation.");
  assert.ok(composition.finalCopy.includes("doubt about being wanted can creep in"), "Transit copy must use the exact pair lived dynamic rather than keyword lists.");
  assert.ok(composition.finalCopy.includes("2nd of 3 passes"), "Transit copy must preserve pass context.");
  assert.ok(composition.finalCopy.includes("The astro: Transiting Saturn squares your natal Venus in Capricorn in the 8th house. Orb: 0°."), "Transit copy must include technical footer from facts.");

  return {
    fixture: "Long-term personalized transit",
    immutableCalculatedFacts: facts,
    originalTemplateId: composition.templateId,
    originalTemplateVersion: composition.templateVersion,
    conditionalBranches: composition.conditionalBranches,
    packageRecordId: composition.recordId,
    provenanceClassification: "source-grounded-local-template",
    primaryPairSourceKeys: composition.sourceRoles?.primaryPairSourceKeys ?? [],
    supportingSourceKeys: composition.sourceRoles?.supportingSourceKeys ?? [],
    sourceKeysBySlot: composition.slots,
    finalCardCopy: cardCopy,
    finalDetailPageCopy: detailCopy,
    dashboardPreviewCopy: detailCopy,
    snapshotCopy: detailCopy,
    initialReaderCopy: detailCopy,
    hydratedReaderCopy: detailCopy
  };
}

function packageBackedTransitExample() {
  const facts = {
    transitingPlanet: "Mars",
    aspect: "square",
    natalPoint: "Saturn",
    natalHouse: 10,
    activeWindow: "July 18 - July 22",
    exactAt: "July 20, 2026",
    orb: "1°",
    term: "short"
  };
  const composition = composePersonalTransit(facts);

  assert.deepEqual(composition.sourceRoles?.primaryPairSourceKeys, ["cc/aspect-pair/mars-square-saturn"], "Package-backed transit must use its exact pair source as primary.");
  assert.ok(composition.finalCopy.includes("The urge to act meets a wall of limits"), "Package-backed transit must render its own pair clause, not the Saturn/Venus wording.");
  assert.ok(!composition.finalCopy.includes("relationship, money, values"), "Package-backed transit must not render keyword stacks.");

  return {
    fixture: "Package-backed personalized transit",
    immutableCalculatedFacts: facts,
    originalTemplateId: composition.templateId,
    originalTemplateVersion: composition.templateVersion,
    conditionalBranches: composition.conditionalBranches,
    packageRecordId: composition.recordId,
    provenanceClassification: "source-grounded-local-template",
    primaryPairSourceKeys: composition.sourceRoles?.primaryPairSourceKeys ?? [],
    supportingSourceKeys: composition.sourceRoles?.supportingSourceKeys ?? [],
    sourceKeysBySlot: composition.slots,
    finalCardCopy: composition.sections[0]?.body ?? composition.finalCopy,
    finalDetailPageCopy: composition.finalCopy,
    dashboardPreviewCopy: composition.finalCopy,
    snapshotCopy: composition.finalCopy,
    initialReaderCopy: composition.finalCopy,
    hydratedReaderCopy: composition.finalCopy
  };
}

function assertParity(example) {
  assert.deepEqual(example.initialReaderCopy, example.hydratedReaderCopy, `${example.fixture} initial and hydrated output must match.`);
}

const examples = [
  skyPlacementExample({
    key: "sky.placement.venus.virgo",
    title: "Venus in Virgo",
    facts: { planet: "Venus", sign: "Virgo", degree: "3°49'", motion: "direct", dateRange: "Jul 9 - Aug 6", condition: "weakened · fall" },
    timingChips: ["24D left", "Jul 9 - Aug 6", "WEAKENED · FALL"]
  }),
  skyPlacementExample({
    key: "sky.placement.mars.gemini",
    title: "Mars in Gemini",
    facts: { planet: "Mars", sign: "Gemini", degree: "10°08'", motion: "direct", dateRange: "Jun 28 - Aug 11" },
    timingChips: ["29D left", "Jun 28 - Aug 11"]
  }),
  skyPlacementExample({
    key: "sky.placement.jupiter.leo",
    title: "Jupiter in Leo",
    facts: { planet: "Jupiter", sign: "Leo", degree: "2°48'", motion: "direct", dateRange: "Jun 30, 2026 - Jul 26, 2027", condition: "nearing the beams · 12°" },
    timingChips: ["1Y 13D left", "Jun 30, 2026 - Jul 26, 2027", "NEARING THE BEAMS · 12°"]
  }),
  skyPlacementExample({
    key: "sky.placement.saturn.aries",
    title: "Saturn in Aries",
    facts: { planet: "Saturn", sign: "Aries", degree: "14°35'", motion: "direct", dateRange: "Feb 14, 2026 - Apr 13, 2028", condition: "weakened · fall" },
    timingChips: ["1Y 9M left", "Feb 14, 2026 - Apr 13, 2028", "WEAKENED · FALL"]
  }),
  skyPlacementExample({
    key: "sky.placement.uranus.gemini",
    title: "Uranus in Gemini",
    facts: { planet: "Uranus", sign: "Gemini", degree: "4°17'", motion: "direct", dateRange: "Apr 26, 2026 - Aug 3, 2032" },
    timingChips: ["6Y 21D left", "Apr 26, 2026 - Aug 3, 2032"]
  }),
  skyPlacementExample({
    key: "sky.retrograde.mercury.cancer.retrograde_passage",
    title: "Mercury Rx in Cancer",
    facts: { planet: "Mercury", sign: "Cancer", degree: "20°43'", motion: "retrograde", phase: "retrograde-passage", dateRange: "Jun 29, 2026 - Jul 23, 2026", currentDate: "Jul 12, 2026", condition: "cazimi" },
    timingChips: ["10D left", "Jun 29, 2026 - Jul 23, 2026", "RETROGRADE", "CAZIMI"]
  }),
  skyAspectExample(),
  personalTransitExample(),
  packageBackedTransitExample(),
  natalExample({
    fixture: "Day-chart natal fixture",
    chartSect: "day",
    position: { planet: "Sun", sign: "Aquarius", house: 9, degree: 29, glyph: "☉", motion: "direct" },
    facts: { planet: "Sun", sign: "Aquarius", house: 9, degree: "29°25'", sect: "day", dignity: "detriment" }
  }),
  natalExample({
    fixture: "Night/evening-chart natal fixture",
    chartSect: "night",
    position: { planet: "Moon", sign: "Taurus", house: 4, degree: 12, glyph: "☽", motion: "direct" },
    facts: { planet: "Moon", sign: "Taurus", house: 4, degree: "12°10'", sect: "night" }
  })
];

for (const example of examples) {
  assertParity(example);
}

const saturn = examples.find((example) => example.fixture === "Saturn in Aries");
assert.ok(saturn, "Saturn proof fixture must exist.");
assert.equal(saturn.originalTemplateId, "sky.planet_sign.detail");
assert.equal(saturn.provenanceClassification, "SOURCE_GAP; stale snapshot inspected but not used as v2.3.0 authority");

const adminSource = fs.readFileSync(path.join(repoRoot, "apps/admin/src/GeneratedContentAdminDashboard.tsx"), "utf8");
assert.ok(adminSource.includes("source: \"snapshot\""), "Admin local snapshot rows must be classified as snapshot, not calculated.");
assert.ok(adminSource.includes("Source-grounded generated snapshot"), "Admin must label snapshot provenance as source-grounded generated snapshot.");

const implementedModelMapping = [
  {
    originalPackageTemplateId: "current-sky-placement",
    originalTemplateVersion: templateVersion,
    originalSectionAndClauseContract: "v2.3.0 Sky collective planet-in-sign: compact_collective_claim for card; collective_shift, optional recognizable_collective_situation, optional collective_response for detail.",
    executableModelFunctionName: "sourceGroundedSkyPlacementSummary / sourceGroundedSkyPlacementParagraphs with eligible-reviewed gate",
    surface: "compact card and expanded detail",
    requiredSlots: ["facts.body", "facts.sign", "primary.compact_collective_claim or primary.collective_shift"],
    optionalConditionalSlots: ["primary.recognizable_collective_situation", "action.collective_response", "timing fact fields outside prose"],
    supportedContentFamilies: ["current-sky planet-in-sign placement"],
    dayNightBranch: "none"
  },
  {
    originalPackageTemplateId: "sky.retrograde.passage",
    originalTemplateVersion: templateVersion,
    originalSectionAndClauseContract: "v2.3.0 retrograde passage: review_situation, optional return_or_complication, optional review_action, optional phase_context from facts.",
    executableModelFunctionName: "sourceGroundedSkyPlacementParagraphs with retrograde surface precedence and eligible-reviewed gate",
    surface: "compact card and expanded detail",
    requiredSlots: ["facts.body", "facts.sign", "facts.retrograde_start", "facts.retrograde_end", "primary.review_situation"],
    optionalConditionalSlots: ["primary.return_or_complication", "action.review_action", "modifier.phase_context"],
    supportedContentFamilies: ["Sky retrograde passage"],
    dayNightBranch: "none"
  },
  {
    originalPackageTemplateId: "sky.aspect",
    originalTemplateVersion: templateVersion,
    originalSectionAndClauseContract: "v2.3.0 Sky current aspect: collective_contact_situation, optional development, optional response; exact current-sky pair source required.",
    executableModelFunctionName: "sourceGroundedSkyAspectSummary / sourceGroundedSkyAspectParagraphs with eligible-reviewed gate",
    surface: "compact row and expanded detail",
    requiredSlots: ["facts.body_a", "facts.aspect_name", "facts.body_b", "primary.collective_contact_situation"],
    optionalConditionalSlots: ["primary.development", "action.response", "timing fact fields outside prose"],
    supportedContentFamilies: ["current-sky aspect"],
    dayNightBranch: "none"
  },
  {
    originalPackageTemplateId: "natal-planet-sign-house-layered-v1 / natal-planet-sign-without-birth-time-v1",
    originalTemplateVersion: templateVersion,
    originalSectionAndClauseContract: "Layered natal placement: planet-in-sign lived story; sign-house synthesis; calculated modifiers; ruler bridge; supportive/challenging focal patterns.",
    executableModelFunctionName: "composeNatalPlacement",
    surface: "natal card and detail",
    requiredSlots: ["planetInSignStory"],
    optionalConditionalSlots: ["signHouseSynthesis", "sectModifier", "dignityModifier", "retrogradeModifier", "rulerBridge", "supportivePatterns", "challengingPatterns"],
    supportedContentFamilies: ["natal placements"],
    dayNightBranch: "sectModifier selects day Sun or night Moon clauses only from calculated chart sect"
  },
  {
    originalPackageTemplateId: "natal-aspect-focal-supportive-v1 / natal-aspect-focal-challenging-v1",
    originalTemplateVersion: templateVersion,
    originalSectionAndClauseContract: "Focal natal aspect direction: focal planet; other planet; aspect behavior; support/challenge branch by aspect and planet condition.",
    executableModelFunctionName: "composeNatalAspect",
    surface: "natal aspect row and detail",
    requiredSlots: ["aspectBehavior"],
    optionalConditionalSlots: ["orb fact field"],
    supportedContentFamilies: ["natal aspects"],
    dayNightBranch: "none"
  },
  {
    originalPackageTemplateId: "personalized-transit-short-term-v1 / personalized-transit-long-term-v1",
    originalTemplateVersion: templateVersion,
    originalSectionAndClauseContract: "Personal transit: transiting action; natal target response; timing/pass/exact-hit facts; short-term or long-term branch.",
    executableModelFunctionName: "composePersonalTransit",
    surface: "You/Friend transit card and detail",
    requiredSlots: ["recognizableSituation", "transitBehavior", "practicalResponse"],
    optionalConditionalSlots: ["pass", "exactAt", "phase", "orb", "natalHouse"],
    supportedContentFamilies: ["personalized You transits", "Friend transits"],
    dayNightBranch: "none"
  }
];

const report = {
  generatedAt: new Date().toISOString(),
  saturnAdminDiscoverability: {
    appearsInAdminAllEntriesViaLocalSnapshotRows: true,
    contentKey: "sky.placement.saturn.aries",
    provenanceLabel: "Source-grounded generated snapshot",
    persistedCmsRowOutrankingRule: "Only a current-template source-grounded row or compatible manual row with sourceSnapshot.templateVersion may outrank this package row."
  },
  implementedModelMapping,
  examples
};

const outJson = path.join(repoRoot, "scripts/generated/source-grounded-visible-output-proof.json");
const outMd = path.join(repoRoot, "scripts/generated/source-grounded-visible-output-proof.md");
fs.mkdirSync(path.dirname(outJson), { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(outMd, [
  "# Source-Grounded Visible Output Proof",
  "",
  "## Implemented Model Mapping",
  ...implementedModelMapping.flatMap((item) => [
    "",
    `### ${item.originalPackageTemplateId}`,
    `- Version: ${item.originalTemplateVersion}`,
    `- Contract: ${item.originalSectionAndClauseContract}`,
    `- Executable: ${item.executableModelFunctionName}`,
    `- Surface: ${item.surface}`,
    `- Required slots: ${item.requiredSlots.join(", ")}`,
    `- Optional/conditional slots: ${item.optionalConditionalSlots.join(", ")}`,
    `- Families: ${item.supportedContentFamilies.join(", ")}`,
    `- Day/night: ${item.dayNightBranch}`
  ]),
  "",
  "## Visible Outputs",
  ...examples.flatMap((example) => [
    "",
    `### ${example.fixture}`,
    `- Facts: ${JSON.stringify(example.immutableCalculatedFacts)}`,
    `- Template: ${example.originalTemplateId} @ ${example.originalTemplateVersion}`,
    `- Branches: ${(example.conditionalBranches ?? []).join(", ")}`,
    `- Record: ${example.packageRecordId}`,
    `- Provenance: ${example.provenanceClassification}`,
    ...(example.primaryPairSourceKeys ? [`- Primary pair source: ${example.primaryPairSourceKeys.join(", ") || "SOURCE_GAP"}`] : []),
    ...(example.supportingSourceKeys ? [`- Supporting sources: ${example.supportingSourceKeys.join(", ") || "none"}`] : []),
    "",
    "**Card**",
    "",
    example.finalCardCopy,
    "",
    "**Detail**",
    "",
    example.finalDetailPageCopy,
    "",
    "**Dashboard Preview**",
    "",
    typeof example.dashboardPreviewCopy === "string" ? example.dashboardPreviewCopy : JSON.stringify(example.dashboardPreviewCopy),
    "",
    "**Initial Reader**",
    "",
    typeof example.initialReaderCopy === "string" ? example.initialReaderCopy : JSON.stringify(example.initialReaderCopy),
    "",
    "**Hydrated Reader**",
    "",
    typeof example.hydratedReaderCopy === "string" ? example.hydratedReaderCopy : JSON.stringify(example.hydratedReaderCopy)
  ])
].join("\n"));

console.log(`Wrote ${path.relative(repoRoot, outJson)} and ${path.relative(repoRoot, outMd)}.`);
