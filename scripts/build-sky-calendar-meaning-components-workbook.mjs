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
  sun: "identity, visibility, leadership, and recognition",
  moon: "needs, mood, protection, and belonging",
  mercury: "information, language, decisions, and exchange",
  venus: "value, agreement, attraction, and social balance",
  mars: "action, pressure, conflict, and pursuit",
  jupiter: "growth, belief, opportunity, and excess",
  saturn: "limits, responsibility, standards, and consequence",
  uranus: "disruption, independence, revision, and sudden change",
  neptune: "imagination, uncertainty, ideals, and blurred boundaries",
  pluto: "power, control, exposure, and irreversible change",
  chiron: "pain, sensitivity, coping, and what cannot be ignored",
  lilith: "refusal, autonomy, exclusion, and what will not be made acceptable",
};

const signExpressions = {
  aries: "quick action, direct claims, independence, and a need to begin",
  taurus: "material limits, preservation, value, and what can be maintained",
  gemini: "information, comparison, movement, and changing terms",
  cancer: "protection, belonging, care, and private consequences",
  leo: "visibility, recognition, pride, and individual contribution",
  virgo: "precision, usefulness, routine, and correction",
  libra: "fairness, agreement, balance, and shared terms",
  scorpio: "privacy, leverage, trust, and what is difficult to reverse",
  sagittarius: "larger aims, conviction, distance, and promised possibility",
  capricorn: "duty, authority, structure, and long-term consequence",
  aquarius: "group standards, systems, precedent, and independence",
  pisces: "feeling, imagination, uncertainty, and porous boundaries",
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

  const record = {
    key: `sky-sign/${planet}/${sign}`,
    planet_function: planetFunctions[planet],
    sign_expression: signExpressions[sign],
    ...wording,
    source_ids: evidence.map((item) => item.source_id),
    source_hashes: evidence.map((item) => item.source_hash),
    owner_review_status: "PENDING OWNER",
  };

  if (record.key === "sky-sign/sun/leo") {
    record.planet_function = "individual contribution and recognition become more important";
    record.sign_expression = "visibility, pride, and distinguishing individual contribution";
  }
  if (record.key === "sky-sign/saturn/aquarius") {
    record.planet_function = "limits, responsibility, and standards carry more weight";
    record.sign_expression = "shared rules, group standards, precedent, and equal application";
  }
  return record;
}));

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

for (const sheet of [overview, signSheet, aspectSheet, modalitySheet, elementSheet, gateSheet, wordingQaSheet]) styleSheet(sheet);

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
  ["Key", "Planet function", "Sign expression", "Combined position", "Reader manifestations", "Details language", "Source IDs", "Source hashes", "Owner review status", "Owner notes"],
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
    row.owner_review_status,
    "",
  ],
  [["A", 34], ["B", 32], ["C", 34], ["D", 42], ["E", 46], ["F", 38], ["G", 58], ["H", 42], ["I", 20], ["J", 28]],
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
gateSheet.getRange("A4:F12").values = [
  ["Rule", "Scope", "Cap", "Pass example", "Fail example", "Reason"],
  ["Exact sentence uniqueness", "Forecast + Details", 1, "Every sentence appears once", "Same full sentence in two cards", "Prevents copied frames"],
  ["Forecast opener construction", "Forecast first sentence", 4, "Four or fewer uses", "Five cards begin with the same normalized opening", "Prevents opener monoculture"],
  ["Details opener construction", "Details first composed sentence", 4, "Four or fewer uses", "Five cards begin with the same normalized opening", "Details must also compose both positions"],
  ["Connective construction", "Later sentences", 4, "Four or fewer uses of one opening phrase", "Repeated 'That can turn...' across five cards", "Beats do not require fixed connective wording"],
  ["Required forecast beats", "Each forecast", 4, "All four meanings present", "A moral replaces what can move", "Meaning is required even when wording varies"],
  ["Required Details beats", "Each Details block", 4, "Reader order preserved", "Planet-by-planet concatenation", "Astrology explains the reader beats"],
  ["Verbatim component emission", "All components", 0, "Composer paraphrases and integrates", "A stored component appears as a full sentence", "Components govern meaning, not prose"],
  ["Manifestation shape reuse", "Sign-unit manifestations", 3, "Planet-sign events use distinct grammar", "A sign frame survives after planet nouns are stripped", "String uniqueness alone does not catch slot templates"],
];
gateSheet.getRange("A4:F4").format = { fill: teal, font: { bold: true, color: white }, wrapText: true };
gateSheet.getRange("A5:F12").format = { wrapText: true, verticalAlignment: "top", borders: { insideHorizontal: { style: "thin", color: line } } };
[["A", 34], ["B", 28], ["C", 10], ["D", 38], ["E", 42], ["F", 38]].forEach(([column, width]) => {
  gateSheet.getRange(`${column}:${column}`).format.columnWidth = width;
});

titleBand(
  wordingQaSheet,
  "A1:H1",
  "Wording-layer QA",
  "The evidence layer is hash-locked. These checks show whether fixed joins, repeated bullets, structural slot templates, or opener monoculture have returned.",
);
wordingQaSheet.getRange("A4:C12").values = [
  ["Measure", "Result", "Cap"],
  ["Evidence-layer SHA-256", evidenceLayerSha256, "locked"],
  ["Mechanical join rows", oldJoinRows.length, 0],
  ["Details copied from combined position", detailsCopied.length, 0],
  ["Maximum opening construction use", wordingQuality.maximumOpeningConstructionUse, OPENING_CAP],
  ["Maximum exact manifestation use", wordingQuality.maximumManifestationUse, MANIFESTATION_REPEAT_CAP],
  ["Maximum manifestation skeleton use", wordingQuality.maximumManifestationShapeUse, MANIFESTATION_SHAPE_CAP],
  ["Maximum details-language use", wordingQuality.maximumDetailsLanguageUse, DETAILS_LANGUAGE_REPEAT_CAP],
  ["Maximum connective n-gram use", wordingQuality.maximumConnectiveNgramUse, JOIN_PHRASE_CAP],
];
wordingQaSheet.getRange("A4:C4").format = { fill: teal, font: { bold: true, color: white } };
wordingQaSheet.getRange("A5:C12").format = { fill: light, wrapText: true, borders: { insideHorizontal: { style: "thin", color: line } } };

const topOpeningRows = wordingQuality.openingConstructions.slice(0, 20).map(([construction, count]) => [construction, count]);
wordingQaSheet.getRange("A13:B13").values = [["Opening construction", "Uses"]];
wordingQaSheet.getRange(`A14:B${13 + topOpeningRows.length}`).values = topOpeningRows;
wordingQaSheet.getRange("A13:B13").format = { fill: teal, font: { bold: true, color: white } };
wordingQaSheet.getRange(`A14:B${13 + topOpeningRows.length}`).format = { borders: { insideHorizontal: { style: "thin", color: line } } };

wordingQaSheet.getRange("D4:E4").values = [["Manifestation occurrence count", "Distinct bullets"]];
wordingQaSheet.getRange(`D5:E${4 + wordingQuality.manifestationRepeatDistribution.length}`).values = wordingQuality.manifestationRepeatDistribution.map((row) => [row.occurrences, row.distinctValues]);
wordingQaSheet.getRange("D4:E4").format = { fill: teal, font: { bold: true, color: white } };
wordingQaSheet.getRange(`D5:E${4 + wordingQuality.manifestationRepeatDistribution.length}`).format = { fill: light };

wordingQaSheet.getRange("G4:H4").values = [["Skeleton occurrence count", "Distinct skeletons"]];
wordingQaSheet.getRange(`G5:H${4 + wordingQuality.manifestationShapeDistribution.length}`).values = wordingQuality.manifestationShapeDistribution.map((row) => [row.occurrences, row.distinctValues]);
wordingQaSheet.getRange("G4:H4").format = { fill: teal, font: { bold: true, color: white } };
wordingQaSheet.getRange(`G5:H${4 + wordingQuality.manifestationShapeDistribution.length}`).format = { fill: light };

wordingQaSheet.getRange("D13:E13").values = [["Repeated connective n-gram", "Uses"]];
const topConnectiveRows = wordingQuality.repeatedConnectiveNgrams.slice(0, 20).map(([construction, count]) => [construction, count]);
wordingQaSheet.getRange(`D14:E${13 + topConnectiveRows.length}`).values = topConnectiveRows;
wordingQaSheet.getRange("D13:E13").format = { fill: teal, font: { bold: true, color: white } };
wordingQaSheet.getRange(`D14:E${13 + topConnectiveRows.length}`).format = { borders: { insideHorizontal: { style: "thin", color: line } } };
wordingQaSheet.getRange("G13:H13").values = [["Manifestation skeleton", "Uses"]];
const topShapeRows = wordingQuality.manifestationShapes.slice(0, 20).map(([construction, count]) => [construction, count]);
wordingQaSheet.getRange(`G14:H${13 + topShapeRows.length}`).values = topShapeRows;
wordingQaSheet.getRange("G13:H13").format = { fill: teal, font: { bold: true, color: white } };
wordingQaSheet.getRange(`G14:H${13 + topShapeRows.length}`).format = { borders: { insideHorizontal: { style: "thin", color: line } } };
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
  ["Sign Units", "A1:J12"],
  ["Aspect Mechanisms", "A1:H8"],
  ["Modality Units", "A1:H12"],
  ["Element Units", "A1:H12"],
  ["Frame Gate", "A1:F12"],
  ["Wording QA", "A1:H33"],
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
