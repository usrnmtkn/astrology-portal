#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "../../../..");
const packageRoot = path.join(repoRoot, "packages", "astro-knowledge");
const writerRoot = path.join(packageRoot, "voice", "tldr-astro", "marie-satori-writer");
const ownerCorpusRoot = path.join(packageRoot, "voice", "tldr-astro", "fixtures", "sky-article-longform", "owner-corpus");
const activeOwnerRoot = path.dirname(ownerCorpusRoot);
const outputPath = path.join(writerRoot, "voice-index.json");
const SIGNS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
const PLANETS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "north-node", "south-node", "lilith"];

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const sha256 = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");
const relative = (file) => path.relative(repoRoot, file).replaceAll(path.sep, "/");

function tokens(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9-]+/gu, "-").split("-").filter(Boolean);
}

function detect(values, choices) {
  const haystack = tokens(values.join(" "));
  return choices.find((choice) => haystack.includes(choice)) || "";
}

function surfaceFor(cohort, entry) {
  if (["calibrationCandidates", "diagnosticSameSurface"].includes(cohort)) return "sky-article-longform";
  const format = entry.format || "reference";
  if (format.includes("weekly")) return "weekly-astrology";
  if (format.includes("season") || format.includes("solstice")) return "sky-season";
  if (format.includes("lunation") || format.includes("eclipse") || format.includes("moon")) return "sky-lunation";
  if (format.includes("relationship")) return "relationship-astrology";
  if (format.includes("node")) return "sky-nodes-longform";
  return "sky-article-reference";
}

function markdownParagraphs(markdown) {
  const lines = String(markdown).replace(/\r\n?/gu, "\n").split("\n");
  const blocks = [];
  let heading = "";
  let buffer = [];
  let inFence = false;
  const flush = () => {
    const text = buffer.join("\n").trim();
    buffer = [];
    if (text) blocks.push({ text, heading });
  };
  for (const line of lines) {
    if (/^```/u.test(line.trim())) {
      flush();
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const headingMatch = line.match(/^#{1,6}\s+(.+)$/u);
    if (headingMatch) {
      flush();
      heading = headingMatch[1].trim();
      continue;
    }
    if (!line.trim()) flush();
    else buffer.push(line.trimEnd());
  }
  flush();
  return blocks;
}

function beatFromHeading(heading) {
  const value = String(heading || "").toLowerCase();
  if (/\bhook|opening|introduction\b/u.test(value)) return "hook";
  if (/\bturn|shadow|challenge|caution\b/u.test(value)) return "turn";
  if (/\bmove|practice|ritual|work with\b/u.test(value)) return "moves";
  if (/\bhoroscope\b/u.test(value)) return "horoscope";
  return "body";
}

function baseEntry({ sourceId, text, sourcePath, author, origin, surface, planet = "", sign = "", house = "", articleBeat, structuralFunction, authorityClass, ownerAuthored, ownerApproved, reviewStatus, editorialStatus, canonical, useAsPositiveVoiceEvidence, useAsContextualEvidence = false, useAsNegativeEvidence, failureTags = [], provenance, governance, judgeLineage, workbookSourceRow, governedKey, planetA, aspect, planetB, placementType, placementValue }) {
  return {
    sourceId,
    text,
    sourcePath,
    author,
    origin,
    surface,
    planet,
    sign,
    house,
    articleBeat,
    structuralFunction,
    authorityClass,
    ownerAuthored,
    ownerApproved,
    reviewStatus,
    editorialStatus,
    canonical,
    useAsPositiveVoiceEvidence,
    useAsContextualEvidence,
    useAsNegativeEvidence,
    failureTags,
    factUseAuthorized: false,
    provenance,
    ...(governance ? { governance } : {}),
    ...(judgeLineage ? { judgeLineage } : {}),
    ...(workbookSourceRow ? { workbookSourceRow } : {}),
    ...(governedKey ? { governedKey } : {}),
    ...(planetA ? { planetA } : {}),
    ...(aspect ? { aspect } : {}),
    ...(planetB ? { planetB } : {}),
    ...(placementType ? { placementType } : {}),
    ...(placementValue ? { placementValue } : {}),
    sourceSha256: sha256(text)
  };
}

function ownerCorpusEntries() {
  const manifest = readJson(path.join(ownerCorpusRoot, "manifest.json"));
  const entries = [];
  for (const [cohort, records] of Object.entries(manifest.cohorts)) {
    for (const record of records) {
      const file = path.join(ownerCorpusRoot, record.file);
      const paragraphs = markdownParagraphs(fs.readFileSync(file, "utf8"));
      const planet = record.planet || detect([record.sourceSlug, record.title], PLANETS);
      const sign = detect([record.sourceSlug, record.title], SIGNS);
      paragraphs.forEach((paragraph, index) => entries.push(baseEntry({
        sourceId: `owner-article:${record.sourceSlug}:p${String(index + 1).padStart(3, "0")}`,
        text: paragraph.text,
        sourcePath: relative(file),
        author: "Marie Satori",
        origin: "owner-published-site",
        surface: surfaceFor(cohort, record),
        planet,
        sign,
        articleBeat: index === 0 ? "hook" : beatFromHeading(paragraph.heading),
        structuralFunction: paragraph.heading ? `paragraph under ${paragraph.heading}` : "article paragraph",
        authorityClass: "owner_authored_final",
        ownerAuthored: true,
        ownerApproved: true,
        reviewStatus: "published",
        editorialStatus: "owner_authored_final",
        canonical: false,
        useAsPositiveVoiceEvidence: true,
        useAsNegativeEvidence: false,
        provenance: `Published article body preserved by ${relative(path.join(ownerCorpusRoot, "manifest.json"))}; voice evidence only, never runtime facts.`
      })));
    }
  }
  return entries;
}

function activeOwnerEntries() {
  const manifest = readJson(path.join(activeOwnerRoot, "manifest.json"));
  const entries = [];
  for (const record of manifest) {
    const file = path.join(activeOwnerRoot, record.file);
    const raw = fs.readFileSync(file, "utf8");
    const body = raw.includes("\n---\n") ? raw.split("\n---\n").slice(1).join("\n---\n") : raw;
    const bodyLines = body.trimStart().split("\n");
    let metadataFieldsSeen = 0;
    let contentStart = 0;
    for (let index = 0; index < bodyLines.length; index += 1) {
      if (bodyLines[index].trim()) metadataFieldsSeen += 1;
      if (metadataFieldsSeen >= 3) {
        contentStart = index + 1;
        break;
      }
    }
    const compact = bodyLines
      .slice(contentStart)
      .map((line) => line.trim())
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/gu, " ")
      .trim();
    const sentenceList = compact.match(/[^.!?]+[.!?]+|[^.!?]+$/gu)?.map((sentence) => sentence.trim()).filter(Boolean) || [];
    const excerpts = [];
    for (let index = 0; index < sentenceList.length; index += 3) {
      const text = sentenceList.slice(index, index + 3).join(" ");
      if (text.length >= 60) excerpts.push(text);
    }
    const planet = record.planet || detect([record.title], PLANETS);
    const sign = detect([record.title], SIGNS);
    excerpts.forEach((text, index) => entries.push(baseEntry({
      sourceId: `owner-active:${path.basename(record.file, ".md")}:e${String(index + 1).padStart(3, "0")}`,
      text,
      sourcePath: relative(file),
      author: "Marie Satori",
      origin: "owner-published-active-fixture",
      surface: "sky-article-longform",
      planet,
      sign,
      articleBeat: index === 0 ? "hook" : "body",
      structuralFunction: index === 0 ? "published article opening excerpt" : "published article body excerpt",
      authorityClass: "owner_authored_final",
      ownerAuthored: true,
      ownerApproved: true,
      reviewStatus: "published",
      editorialStatus: "owner_authored_final",
      canonical: false,
      useAsPositiveVoiceEvidence: true,
      useAsNegativeEvidence: false,
      provenance: `Active owner-published fixture preserved by ${relative(path.join(activeOwnerRoot, "manifest.json"))}; voice evidence only, never runtime facts.`
    })));
  }
  return entries;
}

function articleSlotEntries(file, candidate, policy = {}) {
  const slots = ["tagline", "hook", "lived", "turn"];
  const entries = [];
  for (const slot of slots) {
    const text = candidate.article?.[slot];
    if (!text) continue;
    entries.push(baseEntry({
      sourceId: `${candidate.candidateId || candidate.sourceId}:${slot}`,
      text,
      sourcePath: relative(file),
      author: policy.author || "AI-assisted editorial candidate",
      origin: policy.origin || "review-candidate",
      surface: "sky-placement",
      planet: candidate.planet || "",
      sign: candidate.sign || "",
      articleBeat: slot,
      structuralFunction: `sky placement ${slot}`,
      authorityClass: policy.authorityClass || "ai_candidate_unreviewed",
      ownerAuthored: Boolean(policy.ownerAuthored),
      ownerApproved: Boolean(policy.ownerApproved),
      reviewStatus: policy.reviewStatus || candidate.reviewStatus || candidate.status || "needs_review",
      editorialStatus: policy.editorialStatus || candidate.editorialStatus || "ai_candidate_unreviewed",
      canonical: Boolean(policy.canonical),
      useAsPositiveVoiceEvidence: Boolean(policy.useAsPositiveVoiceEvidence),
      useAsContextualEvidence: Boolean(policy.useAsContextualEvidence),
      useAsNegativeEvidence: Boolean(policy.useAsNegativeEvidence),
      failureTags: policy.failureTags || [],
      provenance: policy.provenance || "Unapproved candidate; never positive voice evidence."
    }));
  }
  (candidate.article?.moves || []).forEach((text, index) => entries.push(baseEntry({
    sourceId: `${candidate.candidateId || candidate.sourceId}:move-${index + 1}`,
    text,
    sourcePath: relative(file),
    author: policy.author || "AI-assisted editorial candidate",
    origin: policy.origin || "review-candidate",
    surface: "sky-placement",
    planet: candidate.planet || "",
    sign: candidate.sign || "",
    articleBeat: "moves",
    structuralFunction: "sky placement move",
    authorityClass: policy.authorityClass || "ai_candidate_unreviewed",
    ownerAuthored: Boolean(policy.ownerAuthored),
    ownerApproved: Boolean(policy.ownerApproved),
    reviewStatus: policy.reviewStatus || candidate.reviewStatus || candidate.status || "needs_review",
    editorialStatus: policy.editorialStatus || candidate.editorialStatus || "ai_candidate_unreviewed",
    canonical: Boolean(policy.canonical),
    useAsPositiveVoiceEvidence: Boolean(policy.useAsPositiveVoiceEvidence),
    useAsContextualEvidence: Boolean(policy.useAsContextualEvidence),
    useAsNegativeEvidence: Boolean(policy.useAsNegativeEvidence),
    failureTags: policy.failureTags || [],
    provenance: policy.provenance || "Unapproved candidate; never positive voice evidence."
  })));
  return entries;
}

function reviewCandidateEntries() {
  const files = [
    "sky-placement-rewrite-pilot-v2-candidates.json",
    "sky-placement-voice-pass-v3-candidates.json",
    "sky-placement-voice-pass-v4-gpt-5.6-review-candidates.json",
    "sky-placement-voice-pass-v6-targeted-candidates.json",
    "sky-placement-voice-pass-v7-writer-candidates.json",
    "sky-placement-voice-pass-v8-source-derived-candidates.json",
    "sky-placement-voice-pass-v9-neptune-libra-owner-turn-candidate.json"
  ].map((name) => path.join(packageRoot, "review", name));
  const entries = [];
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const bundle = readJson(file);
    for (const candidate of bundle.candidates || []) entries.push(...articleSlotEntries(file, candidate));
  }
  for (const version of [1, 2, 3]) {
    const file = path.join(packageRoot, "review", `sky-placement-uranus-cancer-owner-approval-candidate-v${version}.json`);
    const candidate = readJson(file);
    const exactCalibrationOnly = version === 3 && candidate.ownerApproved === true;
    entries.push(...articleSlotEntries(file, candidate, exactCalibrationOnly ? {
      author: "Owner-approved exact wording",
      origin: "owner-approved-calibration-only",
      authorityClass: "exact_owner_approved",
      ownerApproved: true,
      reviewStatus: "approved",
      editorialStatus: "current_sky_owner_approved",
      useAsPositiveVoiceEvidence: false,
      useAsContextualEvidence: true,
      provenance: "Exact v3 approval is limited to judge calibration. Generation evidence, production use, and canonical status remain unauthorized."
    } : {}));
  }
  return entries;
}

function approvedFormatExemplarEntries() {
  const file = path.join(writerRoot, "sky-placement-format-exemplars-v4.json");
  if (!fs.existsSync(file)) return [];
  const dataset = readJson(file);
  return (dataset.cards || []).flatMap((candidate) => articleSlotEntries(file, { ...candidate, candidateId: candidate.id }, {
    author: "Owner-approved exact wording",
    origin: "owner-approved-voice-format-evidence",
    authorityClass: "exact_owner_approved",
    ownerApproved: candidate.ownerApproved === true,
    reviewStatus: candidate.reviewStatus || "needs_review",
    editorialStatus: "exact_owner_approved",
    canonical: false,
    useAsPositiveVoiceEvidence: candidate.generationEvidenceAuthorized === true,
    provenance: "Exact wording approved for writer voice-format evidence only. Production approval, canonical status, factual authority, and serving promotion remain unauthorized."
  }));
}

function historicalEntries() {
  const file = path.join(packageRoot, "voice", "tldr-astro", "fixtures", "sky-placement-historical-second-person.json");
  const fixture = readJson(file);
  return fixture.exemplars.flatMap((candidate) => articleSlotEntries(file, { ...candidate, candidateId: candidate.sourceId, article: candidate }, {
    author: "Marie Satori",
    origin: "historical-owner-approved",
    authorityClass: "historical_only",
    ownerAuthored: true,
    ownerApproved: true,
    reviewStatus: "historical",
    editorialStatus: "historical_owner_approved",
    useAsContextualEvidence: true,
    provenance: "Preserved verbatim for provenance; second-person copy is incompatible with the active Current Sky contract and is never positive evidence."
  }));
}

function contrastiveEntries() {
  const file = path.join(writerRoot, "contrastive-edits.json");
  const records = readJson(file).records;
  const entries = [];
  for (const record of records) {
    if (record.beforeIsRejected !== false) {
      entries.push(baseEntry({
        sourceId: `contrastive:${record.id}:before`,
        text: record.before,
        sourcePath: relative(file),
        author: "AI-assisted or superseded copy",
        origin: "owner-correction-before",
        surface: record.surface,
        planet: record.planet || "",
        sign: record.sign || "",
        articleBeat: record.articleBeat,
        structuralFunction: `${record.articleBeat} before owner correction`,
        authorityClass: "owner_rejected",
        ownerAuthored: false,
        ownerApproved: false,
        reviewStatus: "replaced",
        editorialStatus: "owner_rejected",
        canonical: false,
        useAsPositiveVoiceEvidence: false,
        useAsNegativeEvidence: true,
        failureTags: record.failureTags,
        provenance: record.provenance
      }));
    }
    if (record.approvalLevel === "owner_rejected") continue;
    const exactCalibrationOnly = record.approvalLevel === "exact_owner_approved_calibration_only";
    const exactOwnerApproved = record.approvalLevel === "exact_owner_approved";
    const exactApprovalScope = String(record.exactApprovalScope || "");
    const exactApprovalAllowsWriterEvidence = exactOwnerApproved
      && (!exactApprovalScope || /generation_evidence/u.test(exactApprovalScope));
    const authorityClass = exactCalibrationOnly || exactOwnerApproved
      ? "exact_owner_approved"
      : record.approvalLevel === "owner_revised_candidate"
        ? "owner_revised_candidate"
        : "positive_direction_not_approved";
    entries.push(baseEntry({
      sourceId: `contrastive:${record.id}:after`,
      text: record.after,
      sourcePath: relative(file),
      author: "Owner-directed revision",
      origin: "owner-correction-after",
      surface: record.surface,
      planet: record.planet || "",
      sign: record.sign || "",
      articleBeat: record.articleBeat,
      structuralFunction: `${record.articleBeat} after owner correction`,
      authorityClass,
      ownerAuthored: false,
      ownerApproved: exactCalibrationOnly || exactOwnerApproved,
      reviewStatus: exactCalibrationOnly ? "approved_calibration_only" : exactOwnerApproved ? "approved" : "needs_review",
      editorialStatus: authorityClass,
      canonical: false,
      useAsPositiveVoiceEvidence: exactApprovalAllowsWriterEvidence,
      useAsContextualEvidence: !exactOwnerApproved && !exactCalibrationOnly,
      useAsNegativeEvidence: false,
      failureTags: [],
      provenance: record.provenance
    }));
  }
  return entries;
}

function negativeEntries() {
  const file = path.join(writerRoot, "negative-examples.json");
  return readJson(file).records.map((record) => baseEntry({
    sourceId: `negative:${record.id}`,
    text: record.text,
    sourcePath: record.sourcePath,
    author: "Rejected or retired copy",
    origin: "negative-example",
    surface: record.surface,
    planet: record.planet || "",
    sign: record.sign || "",
    articleBeat: record.articleBeat,
    structuralFunction: `${record.articleBeat} failure example`,
    authorityClass: "owner_rejected",
    ownerAuthored: false,
    ownerApproved: false,
    reviewStatus: "rejected",
    editorialStatus: "owner_rejected",
    canonical: false,
    useAsPositiveVoiceEvidence: false,
    useAsNegativeEvidence: true,
    failureTags: record.failureTags,
    provenance: record.reason
  }));
}

function thirdPartyEntries() {
  const file = path.join(packageRoot, "reference", "ac-reference-index.json");
  if (!fs.existsSync(file)) return [];
  return readJson(file).entries.map((record) => baseEntry({
    sourceId: `AC:${record.id}:title`,
    text: record.title,
    sourcePath: relative(file),
    author: "AC",
    origin: "third-party-reference-index-title",
    surface: "third-party-reference",
    planet: detect([record.title, ...(record.topics || [])], PLANETS),
    sign: detect([record.title, ...(record.topics || [])], SIGNS),
    articleBeat: "metadata",
    structuralFunction: "reference title only",
    authorityClass: "third_party_source",
    ownerAuthored: false,
    ownerApproved: false,
    reviewStatus: "unverified-source-reference",
    editorialStatus: "third_party_source",
    canonical: false,
    useAsPositiveVoiceEvidence: false,
    useAsNegativeEvidence: false,
    provenance: "AC title metadata only. Retrieve AC as unverified knowledge testimony; never use its phrasing, cadence, dates, or doctrine as Marie Satori voice evidence."
  }));
}

function knowledgeMatrixV9Entries() {
  // Governance-labeled canonical matrix (v9, 2026-08-09). Governance is the
  // current authority layer; Judge remains historical editing/review lineage.
  // Copy and Experience are preserved exactly. Existing render exclusions
  // remain fail-closed and v9 is never changed in place; changes become v10.
  const matrixRoot = path.join(writerRoot, "knowledge-matrix-v9");
  if (!fs.existsSync(matrixRoot)) return [];
  const normalizePlanet = (value) => {
    const slug = tokens([String(value || "")].join(" ")).join("-");
    if (slug === "black-moon-lilith") return "lilith";
    return slug;
  };
  const normalizeSign = (value) => {
    const slug = tokens([String(value || "")].join(" ")).join("-");
    return slug === "any" ? "" : slug;
  };
  const policy = {
    author: "Owner-approved exact wording",
    origin: "owner-approved-knowledge-matrix-v9",
    authorityClass: "exact_owner_approved",
    ownerApproved: true,
    reviewStatus: "approved",
    editorialStatus: "owner-approved-v9-governance-labeled",
    canonical: true,
    useAsPositiveVoiceEvidence: true,
    useAsContextualEvidence: true,
    provenance: "Canonical owner-approved v9 governance-labeled knowledge matrix (2026-08-09). Governance is current authority; Judge is historical lineage. Copy preserved exactly. Any change becomes v10 and returns to the owner."
  };
  const entries = [];
  const rowsFile = path.join(matrixRoot, "knowledge-matrix-v9-owner-approved-rows.json");
  const matrix = readJson(rowsFile);
  for (const row of matrix.transit_meanings || []) {
    if (!row?.Copy || row.Governance !== "owner-approved") continue;
    const excluded = row.Copy.startsWith("[EXCLUDE FROM FALLBACK]");
    entries.push(baseEntry({
      ...policy,
      sourceId: `kmv9-transit-row-${row.source_row}`,
      text: row.Copy,
      sourcePath: relative(rowsFile),
      surface: "sky-placement",
      planet: normalizePlanet(row.Planet),
      sign: normalizeSign(row.Sign),
      articleBeat: "knowledge-matrix-transit",
      structuralFunction: `knowledge matrix transit meaning (${row.Event || "ingress"})`,
      governance: row.Governance,
      judgeLineage: row.Judge || "",
      workbookSourceRow: row.source_row,
      useAsPositiveVoiceEvidence: !excluded,
      useAsContextualEvidence: !excluded
    }));
  }
  for (const row of matrix.house_activations || []) {
    if (!row?.Experience || row.Governance !== "owner-approved") continue;
    const excluded = row.Experience.startsWith("[EXCLUDE FROM FALLBACK]");
    entries.push(baseEntry({
      ...policy,
      sourceId: `kmv9-house-row-${row.source_row}`,
      text: row.Experience,
      sourcePath: relative(rowsFile),
      surface: "sky-placement",
      planet: normalizePlanet(row.Planet),
      sign: normalizeSign(row["Transit sign"]),
      house: row.House ? String(row.House) : "",
      articleBeat: "knowledge-matrix-house",
      structuralFunction: `knowledge matrix house activation (${row["Rising sign"] || "unknown"} rising, ${row.Event || "ingress"})`,
      governance: row.Governance,
      judgeLineage: row.Judge || "",
      workbookSourceRow: row.source_row,
      useAsPositiveVoiceEvidence: !excluded,
      useAsContextualEvidence: !excluded
    }));
  }
  return entries;
}

function llMatrixV13Entries() {
  // Canonical LL natal matrix, owner-approved 2026-08-10. The locked file
  // contains only governed rows and preserves workbook copy exactly. The
  // discarded Gemini V12-to-V13 blind-edit path is not part of this build.
  const file = path.join(writerRoot, "ll-matrix-v13", "knowledge-matrix-v13-owner-approved-locked.json");
  if (!fs.existsSync(file)) return [];
  const dataset = readJson(file);
  if (
    dataset.schema !== "tldrastro.knowledge-matrix.rows.v13"
    || dataset.version !== "v13-direct-language-owner-approved"
    || dataset.rows?.length !== 301
  ) {
    throw new Error("Canonical LL matrix V13 voice evidence is incomplete.");
  }
  return dataset.rows.map((row) => {
    const parts = String(row.key).split("|");
    const placement = row.sheet === "PlacementMeanings" ? parts[1] ?? "" : "";
    const placementSlug = tokens(placement).join("-");
    const planet = tokens(parts[0] || "").join("-");
    const sign = SIGNS.includes(placementSlug) ? placementSlug : "";
    const house = placement.match(/^(\d{1,2})(?:st|nd|rd|th) house$/u)?.[1] ?? "";
    return baseEntry({
      sourceId: `ll-v13:${row.sheet.toLowerCase()}:${row.workbookRow}:${tokens(row.key).join("-")}`,
      text: row.copy,
      sourcePath: relative(file),
      author: "Owner-approved exact wording",
      origin: "owner-approved-ll-matrix-v13",
      surface: row.sheet === "AspectMeanings" ? "natal-aspect" : "natal-placement",
      planet,
      sign,
      house,
      articleBeat: "ll-delineation",
      structuralFunction: row.sheet === "AspectMeanings"
        ? `natal aspect delineation (${parts[1] || "aspect"} ${parts[2] || ""})`.trim()
        : row.sheet === "NodesPhasesFortune"
          ? "natal point delineation"
          : "natal placement delineation",
      authorityClass: "exact_owner_approved",
      ownerApproved: true,
      reviewStatus: "approved",
      editorialStatus: row.governance,
      canonical: true,
      useAsPositiveVoiceEvidence: true,
      useAsContextualEvidence: true,
      provenance: `Canonical owner-approved LL matrix V13 row (2026-08-10), workbook ${dataset.sourceWorkbook}, ${row.sheet} row ${row.workbookRow}. Copy preserved exactly; Gemini blind-edit path discarded. Runtime payload ${row.payloadSha256}.`,
      governedKey: row.key,
      workbookSourceRow: row.workbookRow,
      planetA: row.sheet === "AspectMeanings" && parts.length === 3 ? tokens(parts[0]).join("-") : "",
      aspect: row.sheet === "AspectMeanings" && parts.length === 3 ? tokens(parts[1]).join("-") : "",
      planetB: row.sheet === "AspectMeanings" && parts.length === 3 ? tokens(parts[2]).join("-") : "",
      placementType: row.sheet === "PlacementMeanings" && parts.length === 2 ? (house ? "house" : sign ? "sign" : "") : "",
      placementValue: row.sheet === "PlacementMeanings" && parts.length === 2 ? (house || sign) : ""
    });
  });
}

function llMatrixV13Wp1Entries() {
  // Owner-reviewed WP-1 additions are a separate, append-only approval lineage.
  // The importer writes only complete owner verdict batches here; unapproved
  // matrix rows and review-gated Friend derivations never enter this loader.
  const file = path.join(writerRoot, "ll-matrix-v13", "wp1-owner-approved-locked.json");
  if (!fs.existsSync(file)) return [];
  const dataset = readJson(file);
  if (dataset.schemaVersion !== "ll-matrix-v13-wp1-owner-approved-locked-v1" || !Array.isArray(dataset.rows)) {
    throw new Error("LL matrix V13 WP-1 voice evidence has an invalid schema.");
  }
  const seen = new Set();
  return dataset.rows.map((row) => {
    if (row.ownerApproved !== true || !row.copy || !row.contentKey || seen.has(row.contentKey)) {
      throw new Error("LL matrix V13 WP-1 voice evidence is incomplete or duplicated.");
    }
    seen.add(row.contentKey);
    const parts = String(row.key).split("|");
    const placement = row.sheet === "PlacementMeanings" ? parts[1] ?? "" : "";
    const placementSlug = tokens(placement).join("-");
    return baseEntry({
      sourceId: `ll-v13-wp1:${row.batchId.toLowerCase()}:${row.sheet.toLowerCase()}:${tokens(row.key).join("-")}`,
      text: row.copy,
      sourcePath: relative(file),
      author: "Owner-approved exact wording",
      origin: "owner-approved-ll-matrix-v13-wp1",
      surface: row.sheet === "AspectMeanings" ? "natal-aspect" : "natal-placement",
      planet: tokens(parts[0] || "").join("-"),
      sign: SIGNS.includes(placementSlug) ? placementSlug : "",
      house: placement.match(/^(\d{1,2})(?:st|nd|rd|th) house$/u)?.[1] ?? "",
      articleBeat: "ll-delineation",
      structuralFunction: row.sheet === "AspectMeanings" ? `natal aspect delineation (${parts[1] || "aspect"} ${parts[2] || ""})`.trim() : "natal placement delineation",
      authorityClass: "exact_owner_approved",
      ownerApproved: true,
      reviewStatus: "approved",
      editorialStatus: row.governance,
      canonical: true,
      useAsPositiveVoiceEvidence: true,
      useAsContextualEvidence: true,
      provenance: `Owner-approved LL V13 WP-1 row, ${row.batchId}, approved ${row.approvedAt}. Copy preserved exactly. Runtime payload ${row.payloadSha256}.`,
      governedKey: row.key,
      workbookSourceRow: row.workbookRow,
      planetA: row.sheet === "AspectMeanings" && parts.length === 3 ? tokens(parts[0]).join("-") : "",
      aspect: row.sheet === "AspectMeanings" && parts.length === 3 ? tokens(parts[1]).join("-") : "",
      planetB: row.sheet === "AspectMeanings" && parts.length === 3 ? tokens(parts[2]).join("-") : "",
      placementType: row.sheet === "PlacementMeanings" && parts.length === 2 ? (String(row.key).match(/\|\d+(?:st|nd|rd|th) house$/u) ? "house" : SIGNS.includes(placementSlug) ? "sign" : "") : "",
      placementValue: row.sheet === "PlacementMeanings" && parts.length === 2 ? (String(row.key).match(/\|(\d+)(?:st|nd|rd|th) house$/u)?.[1] || (SIGNS.includes(placementSlug) ? placementSlug : "")) : ""
    });
  });
}

function buildIndex() {
  const entries = [
    ...activeOwnerEntries(),
    ...ownerCorpusEntries(),
    ...reviewCandidateEntries(),
    ...approvedFormatExemplarEntries(),
    ...knowledgeMatrixV9Entries(),
    ...llMatrixV13Entries(),
    ...llMatrixV13Wp1Entries(),
    ...historicalEntries(),
    ...contrastiveEntries(),
    ...negativeEntries(),
    ...thirdPartyEntries()
  ];
  const seen = new Set();
  for (const entry of entries) {
    if (seen.has(entry.sourceId)) throw new Error(`Duplicate voice-index sourceId: ${entry.sourceId}`);
    seen.add(entry.sourceId);
    if (entry.useAsPositiveVoiceEvidence && !["owner_authored_final", "exact_owner_approved"].includes(entry.authorityClass)) {
      throw new Error(`${entry.sourceId} has unauthorized positive evidence class ${entry.authorityClass}`);
    }
  }
  const byAuthorityClass = {};
  const bySurface = {};
  for (const entry of entries) {
    byAuthorityClass[entry.authorityClass] = (byAuthorityClass[entry.authorityClass] || 0) + 1;
    bySurface[entry.surface] = (bySurface[entry.surface] || 0) + 1;
  }
  return {
    schemaVersion: 1,
    indexId: "marie-satori-governed-voice-index-v1",
    generatedAt: "2026-08-02T00:00:00.000Z",
    authorityPolicy: relative(path.join(writerRoot, "authority-policy.json")),
    summary: {
      entryCount: entries.length,
      positiveVoiceEvidenceCount: entries.filter((entry) => entry.useAsPositiveVoiceEvidence).length,
      contextualEvidenceCount: entries.filter((entry) => entry.useAsContextualEvidence).length,
      negativeEvidenceCount: entries.filter((entry) => entry.useAsNegativeEvidence).length,
      byAuthorityClass,
      bySurface
    },
    entries
  };
}

function serializeIndex(index) {
  const header = JSON.stringify({ ...index, entries: undefined }, null, 2);
  const compactEntries = index.entries.map((entry) => `    ${JSON.stringify(entry)}`).join(",\n");
  return `${header.slice(0, -2)},\n  \"entries\": [\n${compactEntries}\n  ]\n}\n`;
}

function main(argv = process.argv.slice(2)) {
  const check = argv.includes("--check");
  const index = buildIndex();
  const serialized = serializeIndex(index);
  if (check) {
    if (!fs.existsSync(outputPath) || fs.readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error(`${relative(outputPath)} is stale. Run build-voice-index.js without --check.`);
    }
    console.log(`Voice index current: ${index.summary.entryCount} entries.`);
    return;
  }
  fs.writeFileSync(outputPath, serialized);
  console.log(`Built ${relative(outputPath)} with ${index.summary.entryCount} entries.`);
  console.log(JSON.stringify(index.summary, null, 2));
}

module.exports = { buildIndex, markdownParagraphs, repoRoot, serializeIndex };

if (require.main === module) {
  try { main(); } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
