#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

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

const planets = [
  "sun", "moon", "mercury", "venus", "mars", "jupiter",
  "saturn", "uranus", "neptune", "pluto", "chiron", "lilith",
];
const signs = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
];

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

const planetManifestations = {
  sun: ["who is visible", "who receives credit", "which contribution represents the group"],
  moon: ["what people need", "who is protected or cared for", "what makes a situation feel secure"],
  mercury: ["which information counts", "how a decision is explained", "what the terms actually say"],
  venus: ["what feels fair or worthwhile", "what people agree to", "what remains worth preserving"],
  mars: ["who acts first", "where pressure becomes conflict", "what gets pushed through"],
  jupiter: ["what is allowed to grow", "which promise seems possible", "where confidence becomes excess"],
  saturn: ["which limit holds", "who carries responsibility", "what standard must be met"],
  uranus: ["which rule can change", "where independence is restricted", "what old arrangement stops working"],
  neptune: ["what people hope is true", "where the facts remain unclear", "which boundary is difficult to hold"],
  pluto: ["who has leverage", "what can no longer stay hidden", "which change cannot be reversed"],
  chiron: ["where an old pain becomes visible", "which defense is being used", "what remains sensitive under pressure"],
  lilith: ["what is being refused", "where exclusion becomes visible", "which demand will not be made acceptable"],
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

const signManifestations = {
  aries: ["pressure for an immediate start", "a direct claim before consensus", "delay treated as somebody else taking control"],
  taurus: ["a decision measured against cost or durability", "resistance to losing material security", "preference for what can be maintained"],
  gemini: ["more information creating more possible answers", "terms changing as new facts arrive", "several explanations competing at once"],
  cancer: ["care or belonging becoming part of the decision", "private consequences affecting a public choice", "protection taking priority over speed"],
  leo: ["wanting effort acknowledged", "wanting credit attached to the person who did the work", "wanting individual contribution distinguished from the group"],
  virgo: ["a larger promise tested against the details", "a routine or method needing correction", "precision becoming the standard for progress"],
  libra: ["fairness depending on who keeps adjusting", "an agreement needing clearer shared terms", "balance measured across everyone affected"],
  scorpio: ["leverage becoming visible", "trust depending on what remains private", "a decision carrying consequences that are hard to reverse"],
  sagittarius: ["a larger promise outrunning the supporting facts", "a decision framed through belief or principle", "distance changing what seems possible"],
  capricorn: ["authority deciding what is workable", "a duty continuing after the announcement", "long-term consequence outweighing immediate relief"],
  aquarius: ["policy applied across the group", "precedent", "a standard meant to apply equally"],
  pisces: ["a feeling remaining real without becoming a final answer", "uncertainty affecting what can be promised", "boundaries becoming difficult to define"],
};

const detailsLanguage = {
  sun: "identity, visibility, leadership, and recognition",
  moon: "needs, protection, belonging, and emotional response",
  mercury: "information, language, decisions, and terms",
  venus: "value, fairness, agreement, and connection",
  mars: "action, pressure, conflict, and pursuit",
  jupiter: "growth, belief, opportunity, and excess",
  saturn: "limits, responsibility, standards, and consequence",
  uranus: "disruption, independence, revision, and sudden change",
  neptune: "imagination, uncertainty, ideals, and boundaries",
  pluto: "power, control, exposure, and irreversible change",
  chiron: "pain, sensitivity, coping, and old defenses",
  lilith: "refusal, autonomy, exclusion, and unacceptable demands",
};

const aspectComponents = [
  {
    key: "sky-aspect-mechanism/conjunction",
    reader_effect: "both positions become active at the same time and are difficult to separate",
    conflict_behavior: "one response immediately activates the other position",
    movement_bias: "movement in either position changes the shared situation at once",
  },
  {
    key: "sky-aspect-mechanism/opposition",
    reader_effect: "both positions become difficult to ignore",
    conflict_behavior: "the disagreement is more likely to become explicit",
    movement_bias: "movement usually requires dealing with both positions rather than eliminating one",
  },
  {
    key: "sky-aspect-mechanism/square",
    reader_effect: "pressure in one position makes the other harder to handle",
    conflict_behavior: "each response adds friction until an adjustment becomes necessary",
    movement_bias: "movement usually requires changing the arrangement rather than choosing one position unchanged",
  },
  {
    key: "sky-aspect-mechanism/trine",
    reader_effect: "the two positions can support the same movement with less resistance",
    conflict_behavior: "ease can keep a weak assumption or loose term from being challenged",
    movement_bias: "movement is available when the shared opening is made specific enough to use",
  },
  {
    key: "sky-aspect-mechanism/sextile",
    reader_effect: "the two positions create an available opening",
    conflict_behavior: "the opening can remain unused unless somebody takes a concrete step",
    movement_bias: "movement depends on acting on the available connection",
  },
];

const modalityPairs = [
  ["cardinal", "cardinal", "both positions push to set direction, so the disagreement becomes active quickly", "change is more likely through a shared first step or a clear decision about who leads"],
  ["cardinal", "fixed", "one position pushes for action while the other holds its ground", "change is more likely through an action that preserves the fixed position's core limit"],
  ["cardinal", "mutable", "one position starts the change while the other keeps revising the terms", "change is more likely when the first move leaves room for adjustment"],
  ["fixed", "cardinal", "one position holds its ground while the other pushes for action", "change is more likely when the proposed action works within the fixed position's core limit"],
  ["fixed", "fixed", "neither side gives ground easily under pressure", "change is more likely in the terms or structure than through either side backing down"],
  ["fixed", "mutable", "one position holds a line while the other keeps changing its response", "change is more likely when revision happens around a clearly named nonnegotiable point"],
  ["mutable", "cardinal", "one position keeps revising while the other pushes for a decision", "change is more likely when the decision includes a defined review point"],
  ["mutable", "fixed", "one position keeps adapting while the other refuses to move", "change is more likely when the flexible side stops revising around an unnamed fixed demand"],
  ["mutable", "mutable", "both positions keep rewriting the terms under pressure", "change is more likely when one workable version is chosen long enough to test"],
].map(([first, second, conflict_behavior, movement_bias]) => ({
  key: `sky-how/modality/${first}/${second}`,
  conflict_behavior,
  movement_bias,
}));

const elementPairs = [
  ["fire", "fire", "urgency and visibility rise on both sides", "movement favors a clear action after the direction is agreed"],
  ["fire", "earth", "pressure for action meets a test of cost, capacity, or durability", "movement comes when urgency is tied to a workable plan"],
  ["fire", "air", "action and explanation accelerate each other", "movement comes when the idea has a clear direction and somebody acts on it"],
  ["fire", "water", "visible urgency meets an emotional or protective consequence", "movement comes when the action accounts for what people are protecting"],
  ["earth", "fire", "a test of cost or durability meets pressure for immediate action", "movement comes when the proposed action can be maintained"],
  ["earth", "earth", "both positions test the situation against resources, capacity, and what will last", "movement comes through a practical term that both sides can maintain"],
  ["earth", "air", "practical limits meet competing explanations or changing information", "movement comes when the language names a workable term"],
  ["earth", "water", "material limits meet care, trust, or belonging", "movement comes through an arrangement that protects both capacity and the human stake"],
  ["air", "fire", "competing explanations meet pressure for immediate action", "movement comes when clearer language produces a defined next step"],
  ["air", "earth", "changing information meets a test of cost, capacity, or practical use", "movement comes when the explanation can survive contact with the facts"],
  ["air", "air", "both positions keep the pressure in language, comparison, and competing explanations", "movement comes through clearer terms and a shared definition"],
  ["air", "water", "explanation and comparison meet an emotional or protective consequence", "movement comes when the language names the feeling or stake it affects"],
  ["water", "fire", "an emotional or protective consequence meets visible urgency", "movement comes when the action acknowledges what people are protecting"],
  ["water", "earth", "care, trust, or belonging meets a material limit", "movement comes through a practical arrangement that does not erase the emotional stake"],
  ["water", "air", "an emotional or protective stake meets competing explanations", "movement comes when the language becomes specific enough to hold the feeling involved"],
  ["water", "water", "both positions intensify care, trust, belonging, and emotional consequence", "movement comes when the shared feeling is named without treating it as the only fact"],
].map(([first, second, conflict_behavior, movement_bias]) => ({
  key: `sky-how/element/${first}/${second}`,
  conflict_behavior,
  movement_bias,
}));

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

  const record = {
    key: `sky-sign/${planet}/${sign}`,
    planet_function: planetFunctions[planet],
    sign_expression: signExpressions[sign],
    combined_position: `${planetFunctions[planet]}; expressed through ${signExpressions[sign]}`,
    reader_manifestations: [...planetManifestations[planet], ...signManifestations[sign]],
    details_language: `${detailsLanguage[planet]}; expressed through ${signExpressions[sign]}`,
    source_ids: evidence.map((item) => item.source_id),
    source_hashes: evidence.map((item) => item.source_hash),
    owner_review_status: "PENDING OWNER",
  };

  if (record.key === "sky-sign/sun/leo") {
    record.planet_function = "individual contribution and recognition become more important";
    record.sign_expression = "visibility, pride, and distinguishing individual contribution";
    record.combined_position = "individual contribution and recognition carry more weight when visibility and credit are at stake";
    record.reader_manifestations = [
      "wanting effort acknowledged",
      "wanting credit attached to the person who did the work",
      "wanting individual contribution distinguished from the group",
    ];
    record.details_language = "individual contribution and recognition";
  }
  if (record.key === "sky-sign/saturn/aquarius") {
    record.planet_function = "limits, responsibility, and standards carry more weight";
    record.sign_expression = "shared rules, group standards, precedent, and equal application";
    record.combined_position = "shared rules and group standards carry more weight";
    record.reader_manifestations = [
      "policy applied across the group",
      "precedent",
      "a standard meant to apply equally",
    ];
    record.details_language = "rules, standards, and systems meant to apply across the group";
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

const modalities = modalityPairs.map((record) => {
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

const elements = elementPairs.map((record) => {
  const [, , first, second] = record.key.split("/");
  const evidence = evidenceForFallbackKey(`fallback-hook/element-pattern/${first}/${second}`);
  return {
    ...record,
    source_ids: [evidence.source_id],
    source_hashes: [evidence.source_hash],
    owner_review_status: "PENDING OWNER",
  };
});

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

for (const sheet of [overview, signSheet, aspectSheet, modalitySheet, elementSheet, gateSheet]) styleSheet(sheet);

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
    ["Key", "Conflict behavior", "Movement bias", "Source IDs", "Source hashes", "Owner review status", "Owner notes"],
    records,
    (row) => [
      row.key,
      row.conflict_behavior,
      row.movement_bias,
      row.source_ids.join("\n"),
      row.source_hashes.join("\n"),
      row.owner_review_status,
      "",
    ],
    [["A", 38], ["B", 46], ["C", 46], ["D", 58], ["E", 42], ["F", 20], ["G", 28]],
    tableName,
  );
}

writeHowSheet(modalitySheet, "Modality units (9)", "Ordered modality pairs. Conflict behavior and movement bias only.", modalities, "ModalityUnitsTable");
writeHowSheet(elementSheet, "Element units (16)", "Ordered element pairs. Relationship-source wording is evidence only and has been reduced to collective meaning components.", elements, "ElementUnitsTable");

titleBand(
  gateSheet,
  "A1:F1",
  "Frame uniqueness gate",
  "Beats are required. Connective wording is not. The future composer must vary openers and connective constructions across the corpus.",
);
gateSheet.getRange("A4:F11").values = [
  ["Rule", "Scope", "Cap", "Pass example", "Fail example", "Reason"],
  ["Exact sentence uniqueness", "Forecast + Details", 1, "Every sentence appears once", "Same full sentence in two cards", "Prevents copied frames"],
  ["Forecast opener construction", "Forecast first sentence", 4, "Four or fewer uses", "Five cards begin with the same normalized opening", "Prevents opener monoculture"],
  ["Details opener construction", "Details first composed sentence", 4, "Four or fewer uses", "Five cards begin with the same normalized opening", "Details must also compose both positions"],
  ["Connective construction", "Later sentences", 4, "Four or fewer uses of one opening phrase", "Repeated 'That can turn...' across five cards", "Beats do not require fixed connective wording"],
  ["Required forecast beats", "Each forecast", 4, "All four meanings present", "A moral replaces what can move", "Meaning is required even when wording varies"],
  ["Required Details beats", "Each Details block", 4, "Reader order preserved", "Planet-by-planet concatenation", "Astrology explains the reader beats"],
  ["Verbatim component emission", "All components", 0, "Composer paraphrases and integrates", "A stored component appears as a full sentence", "Components govern meaning, not prose"],
];
gateSheet.getRange("A4:F4").format = { fill: teal, font: { bold: true, color: white }, wrapText: true };
gateSheet.getRange("A5:F11").format = { wrapText: true, verticalAlignment: "top", borders: { insideHorizontal: { style: "thin", color: line } } };
[["A", 34], ["B", 28], ["C", 10], ["D", 38], ["E", 42], ["F", 38]].forEach(([column, width]) => {
  gateSheet.getRange(`${column}:${column}`).format.columnWidth = width;
});

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
  ["Modality Units", "A1:G12"],
  ["Element Units", "A1:G12"],
  ["Frame Gate", "A1:F11"],
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
