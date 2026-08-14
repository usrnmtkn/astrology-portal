#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";
import {
  aspectComponents,
  elementComponents,
  modalityComponents,
  planets,
  signs,
  wordingForSignUnit,
} from "./sky-calendar-meaning-component-wording.mjs";
import { assertManifestationShapeCap } from "./sky-calendar-manifestation-shape.mjs";

const repoRoot = process.cwd();
const reviewDir = path.join(
  repoRoot,
  "packages/astro-knowledge/review/sky-calendar-meaning-components-v1",
);
const outputDir = path.join(
  repoRoot,
  "outputs/sky-calendar-meaning-components-2026-08-14",
);
const workbookPath = path.join(outputDir, "sky-calendar-meaning-components-owner-review.xlsx");

const fallbackPath = "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json";
const v9Path = "apps/web/public/content/knowledge-matrix-v9/v9-owner-approved-governance-labeled/knowledge-matrix-v9-owner-approved-rows.json";
const v13Path = "apps/web/public/content/knowledge-matrix-v13/v13-direct-language-owner-approved/knowledge-matrix-v13-owner-approved-locked.json";

const planetFunctions = {
  sun: "people notice who is visible, who leads, and whose name stays attached to the work",
  moon: "people react from habit, memory, and what helps them feel safe",
  mercury: "messages, decisions, and explanations change what people know and what they can agree on",
  venus: "people decide what they want, what feels fair, and what they will agree to",
  mars: "people act, push, defend, and spend energy on what matters",
  jupiter: "people take up more room, trust a larger possibility, and sometimes promise too much",
  saturn: "deadlines, smaller budgets, hard limits, and named responsibilities set the terms",
  uranus: "a sudden change breaks the old routine and forces people to respond differently",
  neptune: "people have a harder time separating the facts from the wish when hope and imagination take over",
  pluto: "a power arrangement stops holding and people have to face who controls the outcome",
  chiron: "people protect themselves differently when an old hurt enters the situation",
  lilith: "people refuse rules that ask them to hide, comply, or make themselves acceptable",
};

const signExpressions = {
  aries: "someone moves first and asks everyone else to catch up",
  taurus: "people work with what can be afforded, maintained, and made to last",
  gemini: "new facts and quick replies keep changing the choices",
  cancer: "people respond through care, memory, and private loyalties",
  leo: "the work becomes visible and someone wants the credit attached to it",
  virgo: "people check the method, find the error, and fix what is not working",
  libra: "each side compares the terms and asks whether the deal is fair",
  scorpio: "people guard what is private and notice who holds leverage",
  sagittarius: "people follow a larger promise or belief beyond the issue's first limits",
  capricorn: "deadlines, duties, and long-term results decide what can proceed",
  aquarius: "the group asks whether the same rule applies to everyone",
  pisces: "people can lose track of where the facts end and the wish begins",
};

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeId(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^black moon\s+/u, "")
    .replace(/[^a-z]+/gu, "-")
    .replace(/^-|-$/gu, "");
}

function isApproved(row) {
  return String(row?.review_status ?? "").startsWith("approved");
}

function evidenceEntry(sourceId, sourceValue) {
  return {
    source_id: sourceId,
    source_hash: sha256(JSON.stringify(sourceValue)),
  };
}

const fallback = JSON.parse(await fs.readFile(path.join(repoRoot, fallbackPath), "utf8"));
const v9 = JSON.parse(await fs.readFile(path.join(repoRoot, v9Path), "utf8"));
const v13 = JSON.parse(await fs.readFile(path.join(repoRoot, v13Path), "utf8"));
const allFallbackRows = [
  ...fallback.vocabularyRows,
  ...fallback.fallbackSourceRows,
  ...fallback.hookRows,
];

const ownerPlanetRows = fallback.hookRows
  .filter(isApproved)
  .filter((row) => /^fallback-hook\/planet-lived\/[^/]+$/u.test(row.contentKey ?? ""));
const ownerPlacementRows = fallback.hookRows
  .filter(isApproved)
  .filter((row) => /^fallback-hook\/placement-sign-lived\/[^/]+\/[^/]+$/u.test(row.contentKey ?? ""));
const ownerPlanetByPlanet = new Map(
  ownerPlanetRows.map((row) => [row.contentKey.split("/").at(-1), row]),
);
const ownerPlacementByUnit = new Map(
  ownerPlacementRows.map((row) => {
    const [, , planet, sign] = row.contentKey.split("/");
    return [`${planet}|${sign}`, row];
  }),
);
const ownerPlacementsByPlanet = new Map();
const ownerPlacementsBySign = new Map();
for (const row of ownerPlacementRows) {
  const [, , planet, sign] = row.contentKey.split("/");
  if (!ownerPlacementsByPlanet.has(planet)) ownerPlacementsByPlanet.set(planet, []);
  if (!ownerPlacementsBySign.has(sign)) ownerPlacementsBySign.set(sign, []);
  ownerPlacementsByPlanet.get(planet).push(row);
  ownerPlacementsBySign.get(sign).push(row);
}

function ownerVoiceEvidenceFor(planet, sign) {
  const exact = ownerPlacementByUnit.get(`${planet}|${sign}`) ?? null;
  const planetRow = ownerPlanetByPlanet.get(planet) ?? null;
  const samePlanet = (ownerPlacementsByPlanet.get(planet) ?? [])
    .filter((row) => row !== exact)
    .sort((left, right) => left.contentKey.localeCompare(right.contentKey))[0] ?? null;
  const sameSign = (ownerPlacementsBySign.get(sign) ?? [])
    .filter((row) => row !== exact)
    .sort((left, right) => left.contentKey.localeCompare(right.contentKey))[0] ?? null;
  const rows = [...new Set([planetRow, exact, samePlanet, sameSign].filter(Boolean))].slice(0, 3);
  let coverage = "owner_voiced_exact_pair";
  if (!exact && planetRow) coverage = "owner_voice_inferred_from_planet_and_sign";
  if (!exact && !planetRow && samePlanet) coverage = "owner_voice_inferred_from_same_planet_and_sign";
  if (!exact && !planetRow && !samePlanet) coverage = "doctrine_meaning_owner_register_inferred";
  return {
    coverage,
    exactPair: Boolean(exact),
    pointSpecificOwnerVoice: Boolean(planetRow || exact || samePlanet),
    rows,
  };
}

const servingByUnit = new Map(
  fallback.hookRows
    .filter(isApproved)
    .filter((row) => /^fallback-hook\/sky-placement-hook\/[^/]+\/[^/]+$/u.test(row.contentKey ?? ""))
    .map((row) => {
      const [, , planet, sign] = row.contentKey.split("/");
      return [`${planet}|${sign}`, row];
    }),
);
const v9ByUnit = new Map();
for (const row of v9.transit_meanings) {
  if (row.Governance !== "owner-approved") continue;
  const unit = `${normalizeId(row.Planet)}|${normalizeId(row.Sign)}`;
  if (!v9ByUnit.has(unit)) v9ByUnit.set(unit, []);
  v9ByUnit.get(unit).push(row);
}
const v13ByUnit = new Map();
for (const row of v13.rows) {
  if (!row.ownerApproved || row.runtimeFamily !== "placement-sign-lived") continue;
  if (!v13ByUnit.has(row.key)) v13ByUnit.set(row.key, []);
  v13ByUnit.get(row.key).push(row);
}

function firstDistinctByText(rows, field) {
  const seen = new Set();
  return rows.find((row) => {
    const value = String(row[field] ?? "");
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  }) ?? null;
}

const signUnits = planets.flatMap((planet) => signs.map((sign) => {
  const unit = `${planet}|${sign}`;
  const serving = servingByUnit.get(unit) ?? null;
  const cc = firstDistinctByText(v9ByUnit.get(unit) ?? [], "Copy");
  const ll = firstDistinctByText(v13ByUnit.get(unit) ?? [], "copy");
  const evidence = [
    ...(serving ? [evidenceEntry(`${fallbackPath}#${serving.contentKey}`, serving)] : []),
    ...(cc ? [evidenceEntry(`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!${cc.source_row}`, cc)] : []),
    ...(ll ? [evidenceEntry(`${ll.workbookProvenance.path}#${ll.workbookProvenance.sheet}!${ll.workbookRow}`, ll)] : []),
  ];
  if (evidence.length === 0) throw new Error(`No approved evidence for ${unit}`);
  const wording = wordingForSignUnit(planet, sign);
  const ownerVoice = ownerVoiceEvidenceFor(planet, sign);
  const ownerVoiceEvidence = ownerVoice.rows.map((row) => (
    evidenceEntry(`${fallbackPath}#${row.contentKey}`, row)
  ));

  const record = {
    key: `sky-sign/${planet}/${sign}`,
    planet_function: planetFunctions[planet],
    sign_expression: signExpressions[sign],
    ...wording,
    source_ids: evidence.map((item) => item.source_id),
    source_hashes: evidence.map((item) => item.source_hash),
    owner_voice_coverage: ownerVoice.coverage,
    owner_voice_source_ids: ownerVoiceEvidence.map((item) => item.source_id),
    owner_voice_source_hashes: ownerVoiceEvidence.map((item) => item.source_hash),
    owner_review_status: "PENDING OWNER",
  };

  return record;
}));

const targetOwnerPlanetCoverage = planets.map((planet) => ({
  planet,
  planet_lived: ownerPlanetByPlanet.has(planet),
  exact_placement_pairs: signs.filter((sign) => ownerPlacementByUnit.has(`${planet}|${sign}`)),
}));
const targetOwnerSignCoverage = signs.map((sign) => ({
  sign,
  placement_sign_lived_planets: (ownerPlacementsBySign.get(sign) ?? [])
    .map((row) => row.contentKey.split("/")[2])
    .sort(),
}));
const exactTargetPairCount = signUnits.filter((row) => row.owner_voice_coverage === "owner_voiced_exact_pair").length;
const ownerVoiceCoverageCounts = countValues(signUnits.map((row) => row.owner_voice_coverage));

function evidenceForFallbackKey(contentKey) {
  const row = allFallbackRows.find((candidate) => candidate.contentKey === contentKey && isApproved(candidate));
  if (!row) throw new Error(`Missing approved evidence row ${contentKey}`);
  return evidenceEntry(`${fallbackPath}#${contentKey}`, row);
}

const aspects = aspectComponents.map((record) => {
  const aspect = record.key.split("/").at(-1);
  const evidence = evidenceForFallbackKey(`fallback-vocab/aspect-feel/${aspect}`);
  return {
    ...record,
    source_ids: [evidence.source_id],
    source_hashes: [evidence.source_hash],
    owner_review_status: "PENDING OWNER",
  };
});

const modalities = modalityComponents.map((record) => {
  const [, , first, second] = record.key.split("/");
  const evidence = [
    evidenceForFallbackKey(`fallback-vocab/pattern-mode/${first}`),
    evidenceForFallbackKey(`fallback-vocab/pattern-mode/${second}`),
  ];
  return {
    ...record,
    source_ids: evidence.map((item) => item.source_id),
    source_hashes: evidence.map((item) => item.source_hash),
    owner_review_status: "PENDING OWNER",
  };
});

const elements = elementComponents.map((record) => {
  const [, , first, second] = record.key.split("/");
  const evidence = evidenceForFallbackKey(`fallback-hook/element-pattern/${first}/${second}`);
  return {
    ...record,
    source_ids: [evidence.source_id],
    source_hashes: [evidence.source_hash],
    owner_review_status: "PENDING OWNER",
  };
});

const OPENING_CAP = 4;
const JOIN_PHRASE_CAP = 4;
const MANIFESTATION_REPEAT_CAP = 2;
const MANIFESTATION_SHAPE_CAP = 3;
const DETAILS_LANGUAGE_REPEAT_CAP = 2;
const EVIDENCE_LAYER_SHA256 = "0ceb85f5897fb42238dfdd69e7b02271f87befe202f009da8659add9b9337c23";

function countValues(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
}

function openingConstruction(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9 ]/gu, " ").trim().split(/\s+/u).slice(0, 2).join(" ");
}

function connectiveNgrams(value) {
  const connectorWords = new Set([
    "after", "against", "around", "as", "before", "by", "inside", "into",
    "through", "until", "when", "where", "while", "with",
  ]);
  const words = String(value).toLowerCase().replace(/[^a-z0-9 ]/gu, " ").trim().split(/\s+/u).filter(Boolean);
  const phrases = [];
  for (let width = 2; width <= 4; width += 1) {
    for (let index = 0; index <= words.length - width; index += 1) {
      const tokens = words.slice(index, index + width);
      if (tokens.some((token) => connectorWords.has(token))) phrases.push(tokens.join(" "));
    }
  }
  return phrases;
}

function countDistribution(entries) {
  const distribution = new Map();
  for (const [, count] of entries) distribution.set(count, (distribution.get(count) ?? 0) + 1);
  return [...distribution.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([occurrences, distinctValues]) => ({ occurrences, distinctValues }));
}

const openingCounts = countValues(signUnits.map((row) => openingConstruction(row.combined_position)));
const manifestationCounts = countValues(signUnits.flatMap((row) => row.reader_manifestations));
const manifestationShapeReport = assertManifestationShapeCap(signUnits, MANIFESTATION_SHAPE_CAP);
const manifestationShapeCounts = manifestationShapeReport.shapes;
const detailsLanguageCounts = countValues(signUnits.map((row) => row.details_language));
const connectiveCounts = countValues(signUnits.flatMap((row) => connectiveNgrams(row.combined_position)));
const detailsCopied = signUnits.filter((row) => row.details_language === row.combined_position).map((row) => row.key);
const oldJoinRows = signUnits
  .filter((row) => /;\s*expressed through|\bexpressed through\b/iu.test(row.combined_position))
  .map((row) => row.key);
const abstractSubjectWords = new Set([
  "action", "affection", "agreement", "ambition", "attraction", "authority", "autonomy",
  "belonging", "capacity", "care", "change", "confidence", "connection", "control",
  "disruption", "duty", "ease", "effort", "emotional", "expansion", "explanation",
  "fairness", "feelings", "freedom", "growth", "hope", "hurt", "ideas", "identity",
  "ideals", "imagination", "independence", "information", "leverage", "limits", "mood",
  "movement", "needs", "opportunity", "pain", "possibility", "power", "pressure",
  "privacy", "progress", "recognition", "refusal", "responsibility", "revision",
  "security", "sensitivity", "standards", "structure", "thought", "uncertainty", "urgency",
  "value", "visibility",
]);
function firstWord(value) {
  return String(value).toLowerCase().match(/[a-z]+/u)?.[0] ?? "";
}
const plainRegisterFields = [
  ...signUnits.flatMap((row) => [
    [row.key, "planet_function", row.planet_function],
    [row.key, "sign_expression", row.sign_expression],
    [row.key, "combined_position", row.combined_position],
  ]),
  ...[...aspects, ...modalities, ...elements].flatMap((row) => [
    [row.key, "reader_effect", row.reader_effect],
    [row.key, "conflict_behavior", row.conflict_behavior],
    [row.key, "movement_bias", row.movement_bias],
  ]),
];
const abstractSubjectViolations = plainRegisterFields
  .filter(([, , value]) => abstractSubjectWords.has(firstWord(value)))
  .map(([key, field, value]) => ({ key, field, value }));

function rowBody(row) {
  return String(row?.body ?? row?.body_you ?? row?.copy ?? "");
}
const ownerVoiceBodies = [...ownerPlanetRows, ...ownerPlacementRows].map((row) => ({
  source: `${fallbackPath}#${row.contentKey}`,
  body: rowBody(row).toLowerCase(),
}));
const wordingValues = [
  ...signUnits.flatMap((row) => [
    [row.key, "planet_function", row.planet_function],
    [row.key, "sign_expression", row.sign_expression],
    [row.key, "combined_position", row.combined_position],
    ...row.reader_manifestations.map((value, index) => [row.key, `reader_manifestations[${index}]`, value]),
    [row.key, "details_language", row.details_language],
  ]),
  ...[...aspects, ...modalities, ...elements].flatMap((row) => [
    [row.key, "reader_effect", row.reader_effect],
    [row.key, "conflict_behavior", row.conflict_behavior],
    [row.key, "movement_bias", row.movement_bias],
  ]),
];
const ownerVoiceVerbatimMatches = [];
for (const [key, field, value] of wordingValues) {
  const normalized = String(value).toLowerCase().replace(/\s+/gu, " ").trim();
  if (normalized.split(/\s+/u).length < 8) continue;
  for (const source of ownerVoiceBodies) {
    if (source.body.replace(/\s+/gu, " ").includes(normalized)) {
      ownerVoiceVerbatimMatches.push({ key, field, source: source.source, value });
    }
  }
}

const wordingQuality = {
  caps: {
    openingConstruction: OPENING_CAP,
    connectiveNgram: JOIN_PHRASE_CAP,
    repeatedManifestation: MANIFESTATION_REPEAT_CAP,
    manifestationShape: MANIFESTATION_SHAPE_CAP,
    repeatedDetailsLanguage: DETAILS_LANGUAGE_REPEAT_CAP,
  },
  openingConstructionDistribution: countDistribution(openingCounts),
  openingConstructions: openingCounts,
  manifestationRepeatDistribution: countDistribution(manifestationCounts),
  repeatedManifestations: manifestationCounts.filter(([, count]) => count > 1),
  manifestationShapeDistribution: countDistribution(manifestationShapeCounts),
  manifestationShapes: manifestationShapeCounts,
  connectiveNgramDistribution: countDistribution(connectiveCounts),
  repeatedConnectiveNgrams: connectiveCounts.filter(([, count]) => count > 1),
  maximumOpeningConstructionUse: openingCounts[0]?.[1] ?? 0,
  maximumManifestationUse: manifestationCounts[0]?.[1] ?? 0,
  maximumManifestationShapeUse: manifestationShapeCounts[0]?.[1] ?? 0,
  maximumDetailsLanguageUse: detailsLanguageCounts[0]?.[1] ?? 0,
  maximumConnectiveNgramUse: connectiveCounts[0]?.[1] ?? 0,
  detailsCopiedFromCombinedPosition: detailsCopied,
  mechanicalJoinRows: oldJoinRows,
  abstractSubjectViolations,
  ownerVoiceVerbatimMatches,
};

if (wordingQuality.maximumOpeningConstructionUse > OPENING_CAP) {
  throw new Error(`Opening construction cap exceeded: ${JSON.stringify(openingCounts.slice(0, 8))}`);
}
if (wordingQuality.maximumManifestationUse > MANIFESTATION_REPEAT_CAP) {
  throw new Error(`Reader manifestation cap exceeded: ${JSON.stringify(manifestationCounts.slice(0, 8))}`);
}
if (wordingQuality.maximumDetailsLanguageUse > DETAILS_LANGUAGE_REPEAT_CAP) {
  throw new Error(`Details language cap exceeded: ${JSON.stringify(detailsLanguageCounts.slice(0, 8))}`);
}
if (wordingQuality.maximumConnectiveNgramUse > JOIN_PHRASE_CAP) {
  throw new Error(`Connective n-gram cap exceeded: ${JSON.stringify(connectiveCounts.slice(0, 8))}`);
}
if (detailsCopied.length > 0) throw new Error(`details_language duplicates combined_position: ${detailsCopied.join(", ")}`);
if (oldJoinRows.length > 0) throw new Error(`Mechanical join phrase remains: ${oldJoinRows.join(", ")}`);
if (abstractSubjectViolations.length > 0) throw new Error(`Abstract subject remains: ${JSON.stringify(abstractSubjectViolations.slice(0, 12))}`);
if (ownerVoiceVerbatimMatches.length > 0) throw new Error(`Owner personal-register wording was copied instead of converted: ${JSON.stringify(ownerVoiceVerbatimMatches.slice(0, 12))}`);

const evidenceLayer = [...signUnits, ...aspects, ...modalities, ...elements]
  .map((row) => [row.key, row.source_ids, row.source_hashes]);
const evidenceLayerSha256 = sha256(JSON.stringify(evidenceLayer));
if (evidenceLayerSha256 !== EVIDENCE_LAYER_SHA256) {
  throw new Error(`Evidence layer changed: expected ${EVIDENCE_LAYER_SHA256}, got ${evidenceLayerSha256}`);
}

const registry = {
  schema: "tldrastro.sky-calendar-meaning-components.v1",
  status: "PENDING OWNER",
  architectureDecisionDate: "2026-08-14",
  policy: {
    componentsAreMeaningNotSentences: true,
    emitStoredComponentVerbatim: false,
    proseOrder: ["what_may_happen", "why_it_matters", "why_it_sticks_or_moves", "what_can_move"],
    firstSentenceMustBeComposed: true,
    failClosed: true,
  },
  counts: {
    signUnits: signUnits.length,
    aspectMechanisms: aspects.length,
    modalityUnits: modalities.length,
    elementUnits: elements.length,
    total: signUnits.length + aspects.length + modalities.length + elements.length,
  },
  evidenceLayerSha256,
  ownerVoiceCoverage: {
    sourceFamilies: [
      "fallback-hook/planet-lived/*",
      "fallback-hook/placement-sign-lived/*",
    ],
    approvedPlanetRows: ownerPlanetRows.length,
    approvedPlacementRows: ownerPlacementRows.length,
    targetExactPairRows: exactTargetPairCount,
    targetInferredPairRows: signUnits.length - exactTargetPairCount,
    targetPlanets: targetOwnerPlanetCoverage,
    signs: targetOwnerSignCoverage,
    derivationCounts: Object.fromEntries(ownerVoiceCoverageCounts),
    rule: "Exact owner-written planet-sign rows govern where present. Missing pairs keep governed doctrine for meaning and use the nearest owner-approved planet or sign rows for register. No personal or second-person wording is copied into collective Sky components.",
  },
  wordingQuality,
  signUnits,
  aspectMechanisms: aspects,
  modalityUnits: modalities,
  elementUnits: elements,
};

if (registry.counts.total !== 174) throw new Error(`Expected 174 units, got ${registry.counts.total}`);
if ([...signUnits, ...aspects, ...modalities, ...elements].some((row) => row.owner_review_status !== "PENDING OWNER")) {
  throw new Error("Every meaning component must remain PENDING OWNER");
}

await fs.mkdir(reviewDir, { recursive: true });
await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(
  path.join(reviewDir, "sky-calendar-meaning-components-v1.json"),
  `${JSON.stringify(registry, null, 2)}\n`,
);

const workbook = Workbook.create();
const overview = workbook.worksheets.add("Overview");
const coverageSheet = workbook.worksheets.add("Owner Voice Coverage");
const signSheet = workbook.worksheets.add("Sign Units");
const aspectSheet = workbook.worksheets.add("Aspect Mechanisms");
const modalitySheet = workbook.worksheets.add("Modality Units");
const elementSheet = workbook.worksheets.add("Element Units");
const gateSheet = workbook.worksheets.add("Frame Gate");
const wordingQaSheet = workbook.worksheets.add("Wording QA");

const navy = "#23324A";
const teal = "#4F7C78";
const pale = "#EAF1F0";
const amber = "#F7E8B2";
const light = "#F7F8FA";
const ink = "#1D2430";
const white = "#FFFFFF";
const line = "#D6DCE5";

function styleSheet(sheet) {
  sheet.showGridLines = false;
}

function titleBand(sheet, range, title, subtitle) {
  sheet.getRange(range).merge();
  sheet.getRange(range).values = [[title]];
  sheet.getRange(range).format = {
    fill: navy,
    font: { bold: true, color: white, size: 18 },
    verticalAlignment: "center",
  };
  const [start, end] = range.split(":");
  const subtitleRange = `${start.replace(/\d+$/u, "2")}:${end.replace(/\d+$/u, "2")}`;
  sheet.getRange(subtitleRange).merge();
  sheet.getRange(subtitleRange).values = [[subtitle]];
  sheet.getRange(subtitleRange).format = {
    fill: pale,
    font: { color: ink, italic: true },
    verticalAlignment: "center",
    wrapText: true,
  };
  sheet.getRange(range).format.rowHeight = 30;
  sheet.getRange(subtitleRange).format.rowHeight = 34;
}

function styleTable(sheet, headerRange, dataRange, widths) {
  sheet.getRange(headerRange).format = {
    fill: teal,
    font: { bold: true, color: white },
    wrapText: true,
    verticalAlignment: "center",
    borders: { preset: "outside", style: "thin", color: line },
  };
  sheet.getRange(dataRange).format = {
    font: { color: ink, size: 10 },
    wrapText: true,
    verticalAlignment: "top",
    borders: { insideHorizontal: { style: "thin", color: line } },
  };
  widths.forEach(([column, width]) => {
    sheet.getRange(`${column}:${column}`).format.columnWidth = width;
  });
  sheet.freezePanes.freezeRows(3);
  sheet.getRange(dataRange).conditionalFormats.add("containsText", {
    text: "PENDING OWNER",
    format: { fill: amber, font: { color: "#6B4F00", bold: true } },
  });
}

for (const sheet of [overview, coverageSheet, signSheet, aspectSheet, modalitySheet, elementSheet, gateSheet, wordingQaSheet]) styleSheet(sheet);

titleBand(
  overview,
  "A1:F1",
  "Sky Calendar meaning components v1",
  "Owner review workbook. These 174 rows govern meaning only. No row is a finished sentence for verbatim emission.",
);
overview.getRange("A4:B9").values = [
  ["Measure", "Count"],
  ["Sign units", signUnits.length],
  ["Aspect mechanisms", aspects.length],
  ["Modality units", modalities.length],
  ["Element units", elements.length],
  ["Total", registry.counts.total],
];
overview.getRange("D4:F9").values = [
  ["Governance", "Value", "Meaning"],
  ["Status", "PENDING OWNER", "Nothing in this workbook is approved or serving."],
  ["Fail closed", "TRUE", "Missing or unapproved components cannot be rendered."],
  ["Verbatim emission", "FALSE", "Stored components may not be emitted as whole sentences."],
  ["First sentence", "COMPOSED", "Both positions must become one lived disagreement or shared condition."],
  ["Reader order", "4 beats", "What may happen; why it matters; why it sticks or moves; what can move."],
];
overview.getRange("A4:B4").format = { fill: teal, font: { bold: true, color: white } };
overview.getRange("D4:F4").format = { fill: teal, font: { bold: true, color: white } };
overview.getRange("A5:B9").format = { fill: light, borders: { insideHorizontal: { style: "thin", color: line } } };
overview.getRange("D5:F9").format = { fill: light, wrapText: true, borders: { insideHorizontal: { style: "thin", color: line } } };
overview.getRange("A12:F12").merge();
overview.getRange("A12:F12").values = [["Field definitions"]];
overview.getRange("A12:F12").format = { fill: navy, font: { bold: true, color: white } };
overview.getRange("A13:F21").values = [
  ["Field", "Layer", "Purpose", "May render verbatim?", "Evidence", "Owner action"],
  ["planet_function", "Sign", "What the planet governs in this placement", "No", "Approved rows and matrices", "Approve, revise, or reject"],
  ["sign_expression", "Sign", "How the sign changes that function", "No", "Approved rows and matrices", "Approve, revise, or reject"],
  ["combined_position", "Sign", "Bounded synthesis of planet and sign", "No", "Approved rows and matrices", "Approve, revise, or reject"],
  ["reader_manifestations", "Sign", "Possible lived forms available to the composer", "No", "Approved rows and matrices", "Approve, revise, or reject"],
  ["details_language", "Sign", "Compact astrology language for Details", "No", "Approved rows and matrices", "Approve, revise, or reject"],
  ["reader_effect", "Aspect", "What becomes noticeable", "No", "Approved aspect primitive", "Approve, revise, or reject"],
  ["conflict_behavior", "Aspect/How", "Why the pressure behaves this way", "No", "Approved aspect, mode, or element evidence", "Approve, revise, or reject"],
  ["movement_bias", "Aspect/How", "What kind of change is supported", "No", "Approved aspect, mode, or element evidence", "Approve, revise, or reject"],
];
overview.getRange("A13:F13").format = { fill: teal, font: { bold: true, color: white }, wrapText: true };
overview.getRange("A14:F21").format = { wrapText: true, verticalAlignment: "top", borders: { insideHorizontal: { style: "thin", color: line } } };
[["A", 22], ["B", 14], ["C", 40], ["D", 18], ["E", 30], ["F", 24]].forEach(([column, width]) => {
  overview.getRange(`${column}:${column}`).format.columnWidth = width;
});

titleBand(
  coverageSheet,
  "A1:F1",
  "Owner-voice coverage",
  "Exact owner-written planet/sign rows govern first. Missing pairs keep governed doctrine and borrow register only from the nearest approved owner writing. Personal wording is converted, never quoted.",
);
coverageSheet.getRange("A4:C4").values = [["Planet", "Planet-lived source?", "Exact placement-sign pairs"]];
coverageSheet.getRange("A5:C16").values = targetOwnerPlanetCoverage.map((row) => [
  row.planet,
  row.planet_lived ? "YES" : "NO",
  row.exact_placement_pairs.length ? row.exact_placement_pairs.join(", ") : "none",
]);
coverageSheet.getRange("E4:F4").values = [["Sign", "Owner-written placement planets"]];
coverageSheet.getRange("E5:F16").values = targetOwnerSignCoverage.map((row) => [
  row.sign,
  row.placement_sign_lived_planets.join(", "),
]);
coverageSheet.getRange("A19:C24").values = [
  ["Coverage measure", "Count", "Meaning"],
  ["Approved planet-lived rows", ownerPlanetRows.length, "Target planets with a direct owner-written planet register source"],
  ["Approved placement-sign-lived rows", ownerPlacementRows.length, "All approved rows in the source family, including non-target points"],
  ["Exact target planet-sign pairs", exactTargetPairCount, "Strongest owner-voice evidence"],
  ["Inferred target planet-sign pairs", signUnits.length - exactTargetPairCount, "Governed meaning plus nearest owner-written register evidence"],
  ["Doctrine-only point meanings", signUnits.filter((row) => row.owner_voice_coverage === "doctrine_meaning_owner_register_inferred").length, "No point-specific owner-voice row; sign writing supplies register only"],
];
for (const range of ["A4:C4", "E4:F4", "A19:C19"]) {
  coverageSheet.getRange(range).format = { fill: teal, font: { bold: true, color: white }, wrapText: true };
}
coverageSheet.getRange("A5:C16").format = { wrapText: true, verticalAlignment: "top", borders: { insideHorizontal: { style: "thin", color: line } } };
coverageSheet.getRange("E5:F16").format = { wrapText: true, verticalAlignment: "top", borders: { insideHorizontal: { style: "thin", color: line } } };
coverageSheet.getRange("A20:C24").format = { wrapText: true, verticalAlignment: "top", borders: { insideHorizontal: { style: "thin", color: line } } };
[["A", 24], ["B", 22], ["C", 58], ["D", 4], ["E", 22], ["F", 66]].forEach(([column, width]) => {
  coverageSheet.getRange(`${column}:${column}`).format.columnWidth = width;
});
coverageSheet.freezePanes.freezeRows(3);

function writeComponentSheet(sheet, title, subtitle, headers, records, mapper, widths, tableName) {
  const lastColumn = String.fromCharCode(64 + headers.length);
  titleBand(sheet, `A1:${lastColumn}1`, title, subtitle);
  sheet.getRange(`A3:${lastColumn}3`).values = [headers];
  const rows = records.map(mapper);
  sheet.getRange(`A4:${lastColumn}${rows.length + 3}`).values = rows;
  styleTable(sheet, `A3:${lastColumn}3`, `A4:${lastColumn}${rows.length + 3}`, widths);
  sheet.tables.add(`A3:${lastColumn}${rows.length + 3}`, true, tableName);
  const statusIndex = headers.indexOf("Owner review status");
  const statusColumn = String.fromCharCode(65 + statusIndex);
  sheet.getRange(`${statusColumn}4:${statusColumn}${rows.length + 3}`).dataValidation = {
    rule: { type: "list", values: ["PENDING OWNER", "APPROVED", "REVISE", "REJECTED"] },
  };
}

writeComponentSheet(
  signSheet,
  "Sign units (144)",
  "Meaning components only. Reader manifestations are a source-backed menu for composition, never a quota or a sentence template.",
  ["Key", "Planet function", "Sign expression", "Combined position", "Reader manifestations", "Details language", "Meaning source IDs", "Meaning source hashes", "Owner-voice coverage", "Owner-voice source IDs", "Owner-voice source hashes", "Owner review status", "Owner notes"],
  signUnits,
  (row) => [
    row.key,
    row.planet_function,
    row.sign_expression,
    row.combined_position,
    row.reader_manifestations.join("\n• ").replace(/^/u, "• "),
    row.details_language,
    row.source_ids.join("\n"),
    row.source_hashes.join("\n"),
    row.owner_voice_coverage,
    row.owner_voice_source_ids.join("\n"),
    row.owner_voice_source_hashes.join("\n"),
    row.owner_review_status,
    "",
  ],
  [["A", 34], ["B", 38], ["C", 38], ["D", 46], ["E", 46], ["F", 38], ["G", 58], ["H", 42], ["I", 34], ["J", 58], ["K", 42], ["L", 20], ["M", 28]],
  "SignUnitsTable",
);

function writeMechanismSheet(sheet, title, subtitle, records, tableName) {
  writeComponentSheet(
    sheet,
    title,
    subtitle,
    ["Key", "Reader effect", "Conflict behavior", "Movement bias", "Source IDs", "Source hashes", "Owner review status", "Owner notes"],
    records,
    (row) => [
      row.key,
      row.reader_effect ?? "",
      row.conflict_behavior,
      row.movement_bias,
      row.source_ids.join("\n"),
      row.source_hashes.join("\n"),
      row.owner_review_status,
      "",
    ],
    [["A", 38], ["B", 38], ["C", 44], ["D", 44], ["E", 58], ["F", 42], ["G", 20], ["H", 28]],
    tableName,
  );
}

writeMechanismSheet(aspectSheet, "Aspect mechanisms (5)", "Sign-neutral meaning components for Details. Not finished aspect sentences.", aspects, "AspectMechanismsTable");

function writeHowSheet(sheet, title, subtitle, records, tableName) {
  writeComponentSheet(
    sheet,
    title,
    subtitle,
    ["Key", "Reader effect", "Conflict behavior", "Movement bias", "Source IDs", "Source hashes", "Owner review status", "Owner notes"],
    records,
    (row) => [
      row.key,
      row.reader_effect,
      row.conflict_behavior,
      row.movement_bias,
      row.source_ids.join("\n"),
      row.source_hashes.join("\n"),
      row.owner_review_status,
      "",
    ],
    [["A", 38], ["B", 42], ["C", 46], ["D", 46], ["E", 58], ["F", 42], ["G", 20], ["H", 28]],
    tableName,
  );
}

writeHowSheet(modalitySheet, "Modality units (9)", "Ordered modality pairs. Each row composes reader effect, conflict behavior, and movement bias.", modalities, "ModalityUnitsTable");
writeHowSheet(elementSheet, "Element units (16)", "Ordered element pairs. Each row is a collective meaning component, not an assembled label definition.", elements, "ElementUnitsTable");

titleBand(
  gateSheet,
  "A1:F1",
  "Frame uniqueness gate",
  "Beats are required. Connective wording is not. The future composer must vary openers and connective constructions across the corpus.",
);
gateSheet.getRange("A4:F14").values = [
  ["Rule", "Scope", "Cap", "Pass example", "Fail example", "Reason"],
  ["Exact sentence uniqueness", "Forecast + Details", 1, "Every sentence appears once", "Same full sentence in two cards", "Prevents copied frames"],
  ["Forecast opener construction", "Forecast first sentence", 4, "Four or fewer uses", "Five cards begin with the same normalized opening", "Prevents opener monoculture"],
  ["Details opener construction", "Details first composed sentence", 4, "Four or fewer uses", "Five cards begin with the same normalized opening", "Details must also compose both positions"],
  ["Connective construction", "Later sentences", 4, "Four or fewer uses of one opening phrase", "Repeated 'That can turn...' across five cards", "Beats do not require fixed connective wording"],
  ["Required forecast beats", "Each forecast", 4, "All four meanings present", "A moral replaces what can move", "Meaning is required even when wording varies"],
  ["Required Details beats", "Each Details block", 4, "Reader order preserved", "Planet-by-planet concatenation", "Astrology explains the reader beats"],
  ["Verbatim component emission", "All components", 0, "Composer paraphrases and integrates", "A stored component appears as a full sentence", "Components govern meaning, not prose"],
  ["Manifestation shape reuse", "Sign-unit manifestations", 3, "Planet-sign events use distinct grammar", "A sign frame survives after planet nouns are stripped", "String uniqueness alone does not catch slot templates"],
  ["Plain-register subject", "Meaning components", 0, "People, deadlines, messages, rules, and other everyday actors lead", "Recognition, autonomy, or pressure narrates itself", "The owner's register uses active verbs and concrete nouns"],
  ["Owner-source conversion", "All owner-voice evidence", 0, "Personal source meaning is converted for collective Sky", "Eight or more source words are copied verbatim", "Owner voice governs without leaking second-person source prose"],
];
gateSheet.getRange("A4:F4").format = { fill: teal, font: { bold: true, color: white }, wrapText: true };
gateSheet.getRange("A5:F14").format = { wrapText: true, verticalAlignment: "top", borders: { insideHorizontal: { style: "thin", color: line } } };
[["A", 34], ["B", 28], ["C", 10], ["D", 38], ["E", 42], ["F", 38]].forEach(([column, width]) => {
  gateSheet.getRange(`${column}:${column}`).format.columnWidth = width;
});

titleBand(
  wordingQaSheet,
  "A1:H1",
  "Wording-layer QA",
  "The evidence layer is hash-locked. These checks show whether fixed joins, repeated bullets, structural slot templates, or opener monoculture have returned.",
);
wordingQaSheet.getRange("A4:C14").values = [
  ["Measure", "Result", "Cap"],
  ["Evidence-layer SHA-256", evidenceLayerSha256, "locked"],
  ["Mechanical join rows", oldJoinRows.length, 0],
  ["Details copied from combined position", detailsCopied.length, 0],
  ["Maximum opening construction use", wordingQuality.maximumOpeningConstructionUse, OPENING_CAP],
  ["Maximum exact manifestation use", wordingQuality.maximumManifestationUse, MANIFESTATION_REPEAT_CAP],
  ["Maximum manifestation skeleton use", wordingQuality.maximumManifestationShapeUse, MANIFESTATION_SHAPE_CAP],
  ["Maximum details-language use", wordingQuality.maximumDetailsLanguageUse, DETAILS_LANGUAGE_REPEAT_CAP],
  ["Maximum connective n-gram use", wordingQuality.maximumConnectiveNgramUse, JOIN_PHRASE_CAP],
  ["Abstract-subject violations", abstractSubjectViolations.length, 0],
  ["Owner-source verbatim matches (8+ words)", ownerVoiceVerbatimMatches.length, 0],
];
wordingQaSheet.getRange("A4:C4").format = { fill: teal, font: { bold: true, color: white } };
wordingQaSheet.getRange("A5:C14").format = { fill: light, wrapText: true, borders: { insideHorizontal: { style: "thin", color: line } } };

const topOpeningRows = wordingQuality.openingConstructions.slice(0, 20).map(([construction, count]) => [construction, count]);
wordingQaSheet.getRange("A16:B16").values = [["Opening construction", "Uses"]];
wordingQaSheet.getRange(`A17:B${16 + topOpeningRows.length}`).values = topOpeningRows;
wordingQaSheet.getRange("A16:B16").format = { fill: teal, font: { bold: true, color: white } };
wordingQaSheet.getRange(`A17:B${16 + topOpeningRows.length}`).format = { borders: { insideHorizontal: { style: "thin", color: line } } };

wordingQaSheet.getRange("D4:E4").values = [["Manifestation occurrence count", "Distinct bullets"]];
wordingQaSheet.getRange(`D5:E${4 + wordingQuality.manifestationRepeatDistribution.length}`).values = wordingQuality.manifestationRepeatDistribution.map((row) => [row.occurrences, row.distinctValues]);
wordingQaSheet.getRange("D4:E4").format = { fill: teal, font: { bold: true, color: white } };
wordingQaSheet.getRange(`D5:E${4 + wordingQuality.manifestationRepeatDistribution.length}`).format = { fill: light };

wordingQaSheet.getRange("G4:H4").values = [["Skeleton occurrence count", "Distinct skeletons"]];
wordingQaSheet.getRange(`G5:H${4 + wordingQuality.manifestationShapeDistribution.length}`).values = wordingQuality.manifestationShapeDistribution.map((row) => [row.occurrences, row.distinctValues]);
wordingQaSheet.getRange("G4:H4").format = { fill: teal, font: { bold: true, color: white } };
wordingQaSheet.getRange(`G5:H${4 + wordingQuality.manifestationShapeDistribution.length}`).format = { fill: light };

wordingQaSheet.getRange("D16:E16").values = [["Repeated connective n-gram", "Uses"]];
const topConnectiveRows = wordingQuality.repeatedConnectiveNgrams.slice(0, 20).map(([construction, count]) => [construction, count]);
wordingQaSheet.getRange(`D17:E${16 + topConnectiveRows.length}`).values = topConnectiveRows;
wordingQaSheet.getRange("D16:E16").format = { fill: teal, font: { bold: true, color: white } };
wordingQaSheet.getRange(`D17:E${16 + topConnectiveRows.length}`).format = { borders: { insideHorizontal: { style: "thin", color: line } } };
wordingQaSheet.getRange("G16:H16").values = [["Manifestation skeleton", "Uses"]];
const topShapeRows = wordingQuality.manifestationShapes.slice(0, 20).map(([construction, count]) => [construction, count]);
wordingQaSheet.getRange(`G17:H${16 + topShapeRows.length}`).values = topShapeRows;
wordingQaSheet.getRange("G16:H16").format = { fill: teal, font: { bold: true, color: white } };
wordingQaSheet.getRange(`G17:H${16 + topShapeRows.length}`).format = { borders: { insideHorizontal: { style: "thin", color: line } } };
[["A", 38], ["B", 48], ["C", 12], ["D", 44], ["E", 16], ["F", 3], ["G", 64], ["H", 12]].forEach(([column, width]) => {
  wordingQaSheet.getRange(`${column}:${column}`).format.columnWidth = width;
});
wordingQaSheet.freezePanes.freezeRows(3);

await workbook.inspect({
  kind: "table",
  range: "Overview!A1:F21",
  include: "values,formulas",
  tableMaxRows: 24,
  tableMaxCols: 8,
});
const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 300 },
  summary: "final formula error scan",
});
if (/"matchCount":\s*[1-9]/u.test(errors.ndjson)) throw new Error(errors.ndjson);

for (const [sheetName, range] of [
  ["Overview", "A1:F21"],
  ["Owner Voice Coverage", "A1:F24"],
  ["Sign Units", "A1:M12"],
  ["Aspect Mechanisms", "A1:H8"],
  ["Modality Units", "A1:H12"],
  ["Element Units", "A1:H12"],
  ["Frame Gate", "A1:F14"],
  ["Wording QA", "A1:H36"],
]) {
  const preview = await workbook.render({ sheetName, range, scale: 1, format: "png" });
  await fs.writeFile(
    path.join(outputDir, `${sheetName.toLowerCase().replace(/\s+/gu, "-")}-preview.png`),
    new Uint8Array(await preview.arrayBuffer()),
  );
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(workbookPath);

console.log(JSON.stringify({ workbookPath, reviewDir, counts: registry.counts }, null, 2));
