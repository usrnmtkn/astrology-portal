#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const voicePath = "tldr-astro-phrasebank/MARIE-VOICE-BANK.md";
const phrasebankDir = "tldr-astro-phrasebank/phrasebank";
const outputDir = "data/writing/phrase-evidence-index";
const reviewDir = "packages/astro-knowledge/review/writing-pipeline-v3/phrase-evidence-v1";
const sha = (text) => crypto.createHash("sha256").update(text).digest("hex");
const slug = (value) => String(value ?? "").trim().toLowerCase().replace(/&/gu, "and").replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");

const themeAliases = Object.freeze({
  "boundaries-and-energy-protection": "boundaries-energy-protection",
  "credit-ownership-and-creative-theft": "credit-ownership-creative-theft",
  "authenticity-and-self-expression": "authenticity-self-expression",
  "self-worth-and-personal-power": "self-worth-personal-power",
  "empathy-and-emotional-labor": "empathy-emotional-labor",
  "family-roles-accountability-and-breaking-patterns": "family-roles-accountability-patterns",
  "family-chaos-career-and-livelihood-boundaries": "family-chaos-career-livelihood-boundaries",
  "retrograde-review": "retrograde-review",
  "financial-growth-and-security": "financial-growth-security",
  "self-worth-and-earning-power": "self-worth-earning-power",
  "career-and-business-boundaries": "career-business-boundaries",
  "relationships-and-compromise": "relationships-compromise"
});
const normalizeTheme = (value) => themeAliases[slug(value)] ?? slug(value);

const subjectTagsForTheme = Object.freeze({
  "boundaries-energy-protection": ["boundaries", "availability", "overgiving", "time", "access"],
  "credit-ownership-creative-theft": ["credit", "ownership", "creative work", "recognition", "collaboration"],
  "authenticity-self-expression": ["self-expression", "voice", "visibility", "difference", "preference"],
  "self-worth-personal-power": ["worth", "power", "burnout", "ability", "overwork"],
  "empathy-emotional-labor": ["support", "emotional labor", "responsibility", "burden", "follow-up work"],
  "family-roles-accountability-patterns": ["family roles", "accountability", "patterns", "inheritance"],
  "family-chaos-career-livelihood-boundaries": ["family", "career", "livelihood", "stability", "boundaries"],
  strategy: ["strategy", "timing", "decisions", "capacity", "resources"],
  "retrograde-review": ["review", "outgrown choices", "commitments", "pause", "renegotiation"],
  "financial-growth-security": ["money", "cost", "security", "investment", "value"],
  "self-worth-earning-power": ["earning", "pay", "rates", "worth", "wealth"],
  "career-business-boundaries": ["work", "business", "collaboration", "responsibility", "boundaries"],
  "relationships-compromise": ["relationships", "connections", "agreement", "compromise", "fairness", "preference"],
  health: ["health", "body", "stress", "rest", "exhaustion"],
  "channeling-creativity": ["creativity", "space", "productivity", "work"],
  "general-owner-language": ["general owner language"]
});
const failureTagsForTheme = Object.freeze({
  "boundaries-energy-protection": ["generic_boundary_advice", "vague_outcome_clause"],
  "credit-ownership-creative-theft": ["advocacy_register_drift", "abstract_recognition"],
  "authenticity-self-expression": ["abstract_identity", "generic_self_help"],
  "self-worth-personal-power": ["therapy_language", "generic_reassurance"],
  "empathy-emotional-labor": ["clinical_shorthand", "abstract_support"],
  "family-roles-accountability-patterns": ["invented_motive", "clinical_shorthand"],
  "family-chaos-career-livelihood-boundaries": ["stock_trope", "domain_overreach"],
  strategy: ["coaching_scaffold", "abstract_advice"],
  "retrograde-review": ["astrology_restated", "abstract_review_language"],
  "financial-growth-security": ["abstract_value", "domain_overreach"],
  "self-worth-earning-power": ["generic_self_help", "abstract_worth"],
  "career-business-boundaries": ["office_furniture_concentration", "coaching_scaffold"],
  "relationships-compromise": ["vague_outcome_clause", "generic_relationship_trope"],
  health: ["clinical_shorthand", "generic_wellness"],
  "channeling-creativity": ["generic_productivity_advice", "abstract_creativity"],
  "general-owner-language": ["machine_phrase_replacement"]
});

function roleEntry({ id, text, themes, sourcePath, contentKey, store, governanceTier, register = null, subjectTags = [], failureTags = [], metadata = {} }) {
  const normalizedThemes = [...new Set(themes.map(normalizeTheme).filter(Boolean))];
  const mergedSubjects = [...new Set([...normalizedThemes.flatMap((theme) => subjectTagsForTheme[theme] ?? []), ...subjectTags])];
  const mergedFailures = [...new Set([...normalizedThemes.flatMap((theme) => failureTagsForTheme[theme] ?? []), ...failureTags])];
  return {
    id,
    role: "phrase",
    evidenceRole: "phrase",
    store,
    sourcePath,
    contentKey,
    governanceTier,
    ownerApproved: true,
    ownerAuthored: true,
    readerFacingOwnerMaterial: true,
    excluded: false,
    register,
    themes: normalizedThemes,
    subjectTags: mergedSubjects,
    failureTags: mergedFailures,
    copySha: sha(text),
    text,
    metadata
  };
}

function voiceBankEntries() {
  const markdown = fs.readFileSync(path.join(repoRoot, voicePath), "utf8");
  const entries = [];
  let sequence = 0;
  const add = (text, assignedTheme, kind, metadata = {}) => {
    const clean = text.trim();
    if (!clean) return;
    sequence += 1;
    entries.push(roleEntry({
      id: `phrase:voice-bank:${String(sequence).padStart(3, "0")}`,
      text: clean,
      themes: [assignedTheme],
      sourcePath: voicePath,
      contentKey: `voice-bank/${kind}/${String(sequence).padStart(3, "0")}`,
      store: "voice-bank",
      governanceTier: "owner-approved-verbatim-voice-bank",
      register: /\b(?:you|your|you're|you've|don't|they'll)\b/iu.test(clean) ? "second_person_or_direct" : "unscoped",
      metadata: { kind, ...metadata }
    }));
  };
  const swapThemes = [
    "authenticity-self-expression", "authenticity-self-expression", "authenticity-self-expression",
    "authenticity-self-expression", "self-worth-personal-power", "authenticity-self-expression",
    "retrograde-review", "boundaries-energy-protection", "health", "retrograde-review"
  ];
  const livedThemes = ["relationships-compromise", "relationships-compromise", "empathy-emotional-labor", "relationships-compromise", "relationships-compromise"];
  const section = (heading) => markdown.match(new RegExp(`## ${heading.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\n([\\s\\S]*?)(?=\\n## |$)`, "u"))?.[1] ?? "";
  const swapLines = section("This instead of that (approved swaps)").split(/\r?\n/u).filter((line) => line.startsWith("- "));
  swapLines.forEach((line, index) => {
    const approved = line.slice(2).split("→")[0].trim().replace(/^"|"$/gu, "");
    add(approved, swapThemes[index] ?? "authenticity-self-expression", "approved-swap", { swapIndex: index + 1 });
  });
  const livedBlocks = section("Write the lived moment (compatibility language)")
    .split(/\n(?=- \*\*)/u)
    .map((block) => block.replace(/\s+/gu, " ").trim())
    .filter((block) => block.startsWith("- **"));
  livedBlocks.forEach((block, index) => {
    const writeAt = block.indexOf("Write:");
    const approvedPart = writeAt >= 0 ? block.slice(writeAt) : "";
    const approved = [...approvedPart.matchAll(/"([^"]+)"/gu)].map((match) => match[1]).filter(Boolean);
    if (!approved.length) throw new Error(`VOICE_BANK_LIVED_LANGUAGE_PARSE_FAILED:${index + 1}`);
    add(approved.join(" | "), livedThemes[index] ?? "relationships-compromise", "lived-language", { livedIndex: index + 1 });
  });
  let theme = null;
  for (const line of section("Approved one-liner bank (verbatim, by theme)").split(/\r?\n/u)) {
    if (line.startsWith("### ")) theme = normalizeTheme(line.slice(4));
    else if (theme && line.startsWith("- ")) add(line.slice(2), theme, "one-liner", { sourceHeading: theme });
  }
  if (entries.length !== 87) throw new Error(`VOICE_BANK_INDEX_COUNT_MISMATCH:${entries.length}:expected=87`);
  return entries;
}

const eligiblePhrasebankFiles = Object.freeze({
  "cc-marie-site-templates.json": { array: "records", kind: "mixed-confirmed-exact-only" },
  "cc-ruling-planet-advice.json": { array: "advice", kind: "confirmed" },
  "marie-confirmed-quotes.json": { array: "quotes", kind: "confirmed" },
  "ms-lunation-by-sign-confirmed.json": { array: "cards", kind: "confirmed" },
  "ms-satori-articles-confirmed.json": { array: "quotes", kind: "confirmed" }
});

// These owner-authored source fields remain untouched in the phrasebank, but they are
// not safe as standalone AVAILABLE LINES. The PHRASE index must contain a complete
// reader-facing line, never a headline fragment, a damaged sentence, or a field that
// accidentally joins a heading to prose.
const partialPhrasebankRows = new Map([
  ["cc/quote/marie/032-pull-quote", "dependent Where-clause without a main clause"],
  ["cc/quote/marie/044-pull-quote", "headline fragment rather than a complete line"],
  ["cc/quote/marie/058-pull-quote", "noun-phrase fragment without a finite verb"],
  ["cc/quote/marie/059-pull-quote", "heading and sentence joined in one source field"],
  ["cc/quote/marie/065-pull-quote", "damaged coordination with a missing finite verb"],
  ["cc/quote/marie/068-pull-quote", "damaged contrast construction"],
  ["cc/quote/marie/073-pull-quote", "dependent noun-phrase fragment"],
  ["cc/quote/marie/076-pull-quote", "noun-phrase fragment without a finite verb"],
  ["cc/quote/marie/080-pull-quote", "noun-phrase fragment without a finite verb"],
  ["ms/quote/venus-virgo/daily-practice", "noun-phrase fragment without a finite verb"]
]);

function inferredThemes(text, row = {}) {
  const sourceThemes = String(row.themes ?? row.family ?? "").split(/[,/]/u).map(normalizeTheme).filter(Boolean);
  const lower = text.toLowerCase();
  const keywordMap = {
    "relationships-compromise": ["relationship", "partner", "couple", "agreement", "compromise", "fair", "other person", "closeness"],
    "boundaries-energy-protection": ["boundary", "available", "crisis", "drain", "peace", "saying no", "say no"],
    "empathy-emotional-labor": ["support", "help", "hold it together", "burden", "responsible for", "organizer"],
    "credit-ownership-creative-theft": ["credit", "stolen", "blueprint", "collab", "recognition", "your work"],
    "authenticity-self-expression": ["voice", "expression", "seen", "visibility", "difference", "believe"],
    "self-worth-personal-power": ["worth", "power", "prove", "burnout", "ability"],
    strategy: ["plan", "strategy", "timing", "decision", "momentum", "capacity", "position"],
    "retrograde-review": ["review", "pause", "outgrown", "old choice", "commitment", "slow down"],
    "financial-growth-security": ["money", "dollar", "investment", "expense", "financial", "security"],
    "self-worth-earning-power": ["pay", "paid", "rate", "earning", "wealth", "afford"],
    "career-business-boundaries": ["team", "on call", "work", "career", "business", "collaboration"],
    health: ["body", "health", "stress", "caffeine", "exhaustion", "rest"],
    "channeling-creativity": ["creativity", "creative", "create", "productivity"],
    "family-roles-accountability-patterns": ["family", "parent", "sibling", "blood", "roots"],
    "family-chaos-career-livelihood-boundaries": ["family emergency", "livelihood", "job", "bills"]
  };
  const inferred = Object.entries(keywordMap).filter(([, words]) => words.some((word) => lower.includes(word))).map(([theme]) => theme);
  return [...new Set([...sourceThemes.filter((theme) => Object.hasOwn(subjectTagsForTheme, theme)), ...inferred])];
}

function phrasebankEntriesAndClassification() {
  const dir = path.join(repoRoot, phrasebankDir);
  const files = fs.readdirSync(dir).filter((file) => file.endsWith(".json")).sort();
  const classifications = [];
  const entries = [];
  const partialRowsExcluded = [];
  for (const file of files) {
    const config = eligiblePhrasebankFiles[file];
    const sourcePath = `${phrasebankDir}/${file}`;
    const bundle = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    if (!config) {
      const raw = JSON.stringify(bundle._meta ?? bundle).toLowerCase();
      let reason = "reviewed-or-authored copy without explicit owner approval; excluded until exact owner sign-off";
      if (/draft|pending editorial|pending sign-off|session_approved_draft/u.test(raw)) reason = "working or pending-review material";
      if (["houses.json", "cc-served-fields.json", "cc-slot-resolution-map.json", "cc-empty-house-model.json", "cc-transit-house-model.json", "cc-transit-activation-model.json", "reviewed-clauses.json"].includes(file)) reason = "support, resolver, model, or reference data rather than approved AVAILABLE LINES";
      classifications.push({ file: sourcePath, classification: "reference-or-working-excluded", eligibleRows: 0, reason });
      continue;
    }
    const rows = bundle[config.array] ?? [];
    let eligibleRows = 0;
    let confirmedRowsExamined = 0;
    let partialRows = 0;
    rows.forEach((row, index) => {
      const exact = config.kind === "mixed-confirmed-exact-only" ? row.exact : row;
      const sourceFieldText = String(exact?.text ?? "");
      const text = sourceFieldText.trim();
      const tier = String(exact?.tier ?? row.tier ?? bundle.tier ?? bundle._meta?.tier ?? "").toUpperCase();
      if (!text || tier !== "CONFIRMED") return;
      confirmedRowsExamined += 1;
      const contentKey = row.id ?? `phrasebank/${file}/${index + 1}`;
      const partialReason = partialPhrasebankRows.get(contentKey);
      if (partialReason) {
        partialRows += 1;
        partialRowsExcluded.push({
          sourcePath,
          contentKey,
          text,
          reason: partialReason
        });
        return;
      }
      const themes = inferredThemes(text, row);
      if (!themes.length) themes.push("general-owner-language");
      eligibleRows += 1;
      entries.push(roleEntry({
        id: `phrase:phrasebank:${slug(file)}:${slug(row.id ?? index + 1)}`,
        text,
        themes,
        sourcePath,
        contentKey,
        store: "phrasebank-json",
        governanceTier: "owner-confirmed-verbatim",
        register: row.register ?? bundle._meta?.register ?? null,
        subjectTags: [row.sign, row.ruler, row.lunation_sign, row.kind].filter(Boolean).map(slug),
        metadata: {
          file,
          rowIndex: index,
          source: exact?.source ?? row.source ?? null,
          surface: row.surface ?? row.surface_hint ?? null,
          sourceFieldSha256: sha(sourceFieldText),
          sourceFieldByteExact: sourceFieldText === text,
          sourceFieldCount: 1
        }
      }));
    });
    classifications.push({
      file: sourcePath,
      classification: config.kind === "mixed-confirmed-exact-only" ? "mixed-confirmed-lines-included-templates-excluded" : "reader-facing-owner-approved-included",
      eligibleRows,
      confirmedRowsExamined,
      partialRowsExcluded: partialRows,
      reason: config.kind === "mixed-confirmed-exact-only" ? "only exact.tier=CONFIRMED lines qualify; REVIEWED_TEMPLATE forms are excluded" : "tier=CONFIRMED and may serve verbatim"
    });
  }
  if (classifications.length !== 63) throw new Error(`PHRASEBANK_FILE_COUNT_MISMATCH:${classifications.length}:expected=63`);
  if (partialRowsExcluded.length !== partialPhrasebankRows.size) {
    throw new Error(`PHRASEBANK_PARTIAL_ROW_AUDIT_MISMATCH:${partialRowsExcluded.length}:expected=${partialPhrasebankRows.size}`);
  }
  return { entries, classifications, partialRowsExcluded };
}

const voice = voiceBankEntries();
const phrasebank = phrasebankEntriesAndClassification();
const allEntries = [...voice, ...phrasebank.entries];
const deduped = [...new Map(allEntries.map((entry) => [entry.copySha, entry])).values()];
const retainedPhrasebank = deduped.filter((entry) => entry.store === "phrasebank-json");
const sourceByteMismatches = retainedPhrasebank.filter((entry) => entry.metadata.sourceFieldSha256 !== entry.copySha || entry.metadata.sourceFieldByteExact !== true);
const sourceFieldShapeMismatches = retainedPhrasebank.filter((entry) => entry.metadata.sourceFieldCount !== 1);
const themeCoverage = {};
for (const entry of deduped) for (const theme of entry.themes) {
  themeCoverage[theme] ??= { total: 0, voiceBank: 0, phrasebankJson: 0 };
  themeCoverage[theme].total += 1;
  themeCoverage[theme][entry.store === "voice-bank" ? "voiceBank" : "phrasebankJson"] += 1;
}
const report = {
  version: "owner-phrase-evidence-v1-2026-08-14",
  generatedAt: new Date().toISOString(),
  role: "phrase",
  sourceCounts: {
    voiceBankEntries: voice.length,
    voiceBankThemes: new Set(voice.flatMap((entry) => entry.themes)).size,
    phrasebankFiles: phrasebank.classifications.length,
    phrasebankFilesWithEligibleOwnerMaterial: phrasebank.classifications.filter((entry) => entry.eligibleRows > 0).length,
    phrasebankFilesExcluded: phrasebank.classifications.filter((entry) => entry.eligibleRows === 0).length,
    phrasebankConfirmedRowsExamined: phrasebank.classifications.reduce((sum, entry) => sum + (entry.confirmedRowsExamined ?? 0), 0),
    phrasebankPartialRowsExcluded: phrasebank.partialRowsExcluded.length,
    phrasebankEligibleRows: phrasebank.entries.length,
    totalBeforeCopyDedupe: allEntries.length,
    totalAfterCopyDedupe: deduped.length,
    voiceBankUniqueAfterCopyDedupe: deduped.filter((entry) => entry.store === "voice-bank").length,
    phrasebankUniqueAfterCopyDedupe: deduped.filter((entry) => entry.store === "phrasebank-json").length
  },
  tagCoverage: {
    entries: deduped.length,
    withTheme: deduped.filter((entry) => entry.themes.length > 0).length,
    withSubjectTags: deduped.filter((entry) => entry.subjectTags.length > 0).length,
    withFailureTags: deduped.filter((entry) => entry.failureTags.length > 0).length,
    missingAnyRequiredTag: deduped.filter((entry) => !entry.themes.length || !entry.subjectTags.length || !entry.failureTags.length).length
  },
  governance: {
    sourceFilesEdited: false,
    referenceAndWorkingMaterialExcluded: true,
    reviewedWithoutExplicitOwnerSignoffExcluded: true,
    promptUse: "AVAILABLE LINES may be used verbatim or adapted; distinct from register examples and correction pairs",
    completeSourceFieldRequired: true,
    sourceFieldsNeverSplitOrJoined: true
  },
  integrity: {
    retainedPhrasebankRowsAreWholeSourceFields: true,
    sourceByteMismatches: sourceByteMismatches.length,
    builderCreatedJoinedSegments: sourceFieldShapeMismatches.length,
    partialRowsExcluded: phrasebank.partialRowsExcluded
  },
  themeCoverage,
  phrasebankFiles: phrasebank.classifications
};

if (report.integrity.sourceByteMismatches !== 0) throw new Error(`PHRASEBANK_SOURCE_BYTE_MISMATCH:${report.integrity.sourceByteMismatches}`);
if (report.integrity.builderCreatedJoinedSegments !== 0) throw new Error(`PHRASEBANK_JOINED_SEGMENT_MISMATCH:${report.integrity.builderCreatedJoinedSegments}`);

fs.mkdirSync(path.join(repoRoot, outputDir), { recursive: true });
fs.mkdirSync(path.join(repoRoot, reviewDir), { recursive: true });
fs.writeFileSync(path.join(repoRoot, outputDir, "owner-phrase-evidence-v1.jsonl"), `${deduped.map((entry) => JSON.stringify(entry)).join("\n")}\n`);
fs.writeFileSync(path.join(repoRoot, outputDir, "coverage.json"), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(repoRoot, reviewDir, "phrase-evidence-index-report.json"), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(repoRoot, reviewDir, "phrase-evidence-index-report.md"), `# Phrase evidence index v1

Status: **implemented; no billed calls**

## Counts

- Voice-bank entries indexed: **${report.sourceCounts.voiceBankEntries}** across **${report.sourceCounts.voiceBankThemes}** themes.
- Phrasebank JSON files inspected: **${report.sourceCounts.phrasebankFiles}**.
- Files containing explicit reader-facing owner-approved material: **${report.sourceCounts.phrasebankFilesWithEligibleOwnerMaterial}**.
- Reference, working, generated, or still-awaiting-signoff files excluded: **${report.sourceCounts.phrasebankFilesExcluded}**.
- Confirmed phrasebank rows examined: **${report.sourceCounts.phrasebankConfirmedRowsExamined}**.
- Partial, malformed, or joined source fields excluded: **${report.sourceCounts.phrasebankPartialRowsExcluded}**.
- Complete eligible phrasebank rows before exact-copy deduplication: **${report.sourceCounts.phrasebankEligibleRows}**.
- Unique complete phrasebank PHRASE records after exact-copy deduplication: **${report.sourceCounts.phrasebankUniqueAfterCopyDedupe}**.
- Unique PHRASE entries after exact-copy deduplication: **${report.sourceCounts.totalAfterCopyDedupe}**.
- Entries missing a theme, subject tag, or failure tag: **${report.tagCoverage.missingAnyRequiredTag}**.

The 87 voice-bank records are the 72 themed one-liners, 10 approved "this instead of that"
choices, and five approved lived-language groups. The 20 longer gold examples remain REGISTER
evidence rather than being relabeled as phrases.

Every retained phrasebank PHRASE record is the complete text field from one confirmed source
row. The builder does not split rows or join segments. The following source rows remain
preserved in the phrasebank but are excluded from PHRASE retrieval because they are not safe
standalone lines:

${report.integrity.partialRowsExcluded.map((entry) => `- \`${entry.contentKey}\`: ${entry.reason}. Source text: ${JSON.stringify(entry.text)}`).join("\n")}

## Theme coverage

| Theme | Total | Voice bank | Phrasebank JSON |
|---|---:|---:|---:|
${Object.entries(themeCoverage).sort(([a], [b]) => a.localeCompare(b)).map(([theme, counts]) => `| ${theme} | ${counts.total} | ${counts.voiceBank} | ${counts.phrasebankJson} |`).join("\n")}

## Phrasebank file classification

${phrasebank.classifications.map((entry) => `- \`${entry.file}\`: **${entry.classification}**; ${entry.eligibleRows} eligible rows. ${entry.reason}`).join("\n")}
`);

console.log(JSON.stringify(report.sourceCounts, null, 2));
