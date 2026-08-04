"use strict";

const fs = require("fs");
const path = require("path");
const { reviewPairSources } = require("./generate-sky-aspect-cards.js");

const root = path.join(__dirname, "..");
const OWNER_CORPUS_PATH = path.join(
  root,
  "sources",
  "authored",
  "sky-aspect-owner-refined-v101.json"
);
const CLASSICAL = [
  "sun", "moon", "mercury", "venus", "mars",
  "jupiter", "saturn", "uranus", "neptune", "pluto"
];
const ASPECTS = ["conjunction", "sextile", "square", "trine", "quincunx", "opposition"];
const PROSE_FIELDS = [
  "humanMoment",
  "developmentDetail",
  "planetaryDynamic",
  "aspectMechanic",
  "conditionalConsequence"
];
const TITLE = {
  sun: "Sun", moon: "Moon", mercury: "Mercury", venus: "Venus", mars: "Mars",
  jupiter: "Jupiter", saturn: "Saturn", uranus: "Uranus", neptune: "Neptune",
  pluto: "Pluto", chiron: "Chiron", lilith: "Lilith", nodes: "North Node"
};
const ASPECT_TITLE = {
  conjunction: "conjunct",
  sextile: "sextile",
  square: "square",
  trine: "trine",
  quincunx: "quincunx",
  opposition: "opposite"
};
const ASPECT_MECHANIC = {
  conjunction: "The conjunction merges both functions in one event, so their strength and blind spot become difficult to separate.",
  sextile: "The sextile creates a usable opening, but a person or group still has to notice it and act.",
  square: "The square forces a practical conflict, and the same consequence keeps returning until the underlying choice is addressed.",
  trine: "The trine lets both functions reinforce each other with little resistance, which can help a result or let a problem travel farther before anyone questions it.",
  quincunx: "The quincunx makes both functions solve different problems at once. It produces persistent awkward adjustments, repeated renegotiation, and a result that never settles cleanly. It is not a direct standoff, explosive fight, or one-time break.",
  opposition: "The opposition places both functions across from each other through different people, groups, or positions, so neither side can be edited out of the outcome."
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function titleFor({ a, b, aspect }) {
  return `${TITLE[a]} ${ASPECT_TITLE[aspect]} ${TITLE[b]}`;
}

function bodyFor(entry) {
  if (String(entry.body || "").trim()) return String(entry.body).trim();
  return PROSE_FIELDS.map((field) => String(entry[field] || "").trim()).filter(Boolean).join(" ");
}

function ownerCorpus() {
  if (!fs.existsSync(OWNER_CORPUS_PATH)) {
    throw new Error(`Owner exact-aspect corpus is missing: ${OWNER_CORPUS_PATH}`);
  }
  const entries = Object.entries(readJson(OWNER_CORPUS_PATH)).map(([id, entry]) => ({ id, ...entry }));
  if (entries.length !== 225) throw new Error(`Expected 225 owner exact-aspect entries; found ${entries.length}.`);
  return entries;
}

function readerEligibleOwnerCorpus() {
  return ownerCorpus().filter((entry) => fs.existsSync(path.join(
    root,
    "data",
    "transits",
    `${entry.planetA}-${entry.aspect}-${entry.planetB}.json`
  )));
}

function classicalPairSource(a, b) {
  const filePath = path.join(root, "data", "pairs", `${a}-${b}.json`);
  if (!fs.existsSync(filePath)) throw new Error(`Missing pair source: ${filePath}`);
  const source = readJson(filePath);
  return {
    pairKey: `${a}-${b}`,
    sourcePath: path.relative(root, filePath).replaceAll(path.sep, "/"),
    sourceStatus: source.status || "unknown",
    sourceText: JSON.stringify({
      blend: source.blend || source.modern?.blend || "",
      harmonious: source.harmonious || source.modern?.harmonious || "",
      hard: source.hard || source.modern?.hard || "",
      business: source.business || source.modern?.business || "",
      traditional: source.traditional || ""
    }, null, 2)
  };
}

function humanMomentFromPairSource(sourceText) {
  const match = String(sourceText || "").match(/\bLooks like:\s*([\s\S]*?)(?=\s+Check:|$)/iu);
  return String(match?.[1] || "").trim();
}

function pointTargets() {
  const rows = [];
  for (const [pairKey, source] of reviewPairSources()) {
    const [a, b] = pairKey.split("-");
    for (const aspect of ASPECTS) {
      let batch;
      if (b === "lilith" || (a === "lilith" && b === "nodes")) batch = "lilith";
      else if (b === "chiron" || (a === "chiron" && b === "nodes")) batch = "chiron";
      else batch = "node-axis";
      rows.push({
        id: `sky.${a}.${aspect}.${b}`,
        a,
        b,
        aspect,
        batch,
        title: titleFor({ a, b, aspect }),
        pairKey,
        sourcePath: source.provenance?.source || "review/TLDR-Aspect-PairSources-Chiron-Lilith-Nodes-REVIEW.md",
        sourceStatus: source.status || "needs_review",
        sourceText: source.sourceText,
        humanMoment: humanMomentFromPairSource(source.sourceText)
      });
    }
  }
  return rows;
}

function classicalQuincunxTargets() {
  const rows = [];
  for (let first = 0; first < CLASSICAL.length; first += 1) {
    for (let second = first + 1; second < CLASSICAL.length; second += 1) {
      const a = CLASSICAL[first];
      const b = CLASSICAL[second];
      if (["sun-mercury", "sun-venus", "mercury-venus"].includes(`${a}-${b}`)) continue;
      rows.push({
        id: `sky.${a}.quincunx.${b}`,
        a,
        b,
        aspect: "quincunx",
        batch: "classical-quincunx",
        title: titleFor({ a, b, aspect: "quincunx" }),
        ...classicalPairSource(a, b)
      });
    }
  }
  return rows;
}

function missingTargets() {
  const rows = [...pointTargets(), ...classicalQuincunxTargets()];
  const counts = batchCounts(rows);
  const expected = { lilith: 72, chiron: 66, "node-axis": 60, "classical-quincunx": 42 };
  if (rows.length !== 240 || Object.entries(expected).some(([key, value]) => counts[key] !== value)) {
    throw new Error(`Unexpected missing-target inventory: ${JSON.stringify(counts)} (${rows.length} total).`);
  }
  return rows;
}

function batchCounts(rows) {
  return rows.reduce((counts, row) => {
    counts[row.batch] = (counts[row.batch] || 0) + 1;
    return counts;
  }, {});
}

function sentenceCount(text) {
  return [...new Intl.Segmenter("en", { granularity: "sentence" }).segment(String(text || ""))]
    .map(({ segment }) => segment.trim())
    .filter(Boolean).length;
}

function lintExactEntry(entry) {
  const findings = [];
  const body = String(entry.body || "").trim();
  if (body) {
    const paragraphs = body.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
    const sentences = sentenceCount(body);
    const words = body.split(/\s+/).filter(Boolean).length;
    const aspect = String(entry.aspect || "aspect");
    if (paragraphs.length !== 2) findings.push({ severity: "fail", field: "body", reason: `expected two paragraphs; found ${paragraphs.length}` });
    if (sentences < 5 || sentences > 10) findings.push({ severity: "fail", field: "body", reason: `expected 5-10 sentences; found ${sentences}` });
    if (words < 90 || words > 180) findings.push({ severity: "fail", field: "body", reason: `expected 90-180 words; found ${words}` });
    if (!/\b(we|our|us)\b/i.test(body)) findings.push({ severity: "fail", field: "body", reason: "missing collective we/our/us voice" });
    if (/(^|[^-])\b(you|your|yours|yourself)\b/i.test(body)) findings.push({ severity: "fail", field: "body", reason: "second person" });
    if (/—/.test(body)) findings.push({ severity: "fail", field: "body", reason: "em dash" });
    if (/\b(Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces)\b/.test(body)) {
      findings.push({ severity: "fail", field: "body", reason: "sign-specific language in evergreen source" });
    }
    if (/\b(natal|synastry|house|degrees?|orb)\b/i.test(body)) findings.push({ severity: "fail", field: "body", reason: "wrong-surface mechanics" });
    if (new RegExp(`\\b(?:the|this) ${aspect}\\b`, "i").test(body)) {
      findings.push({ severity: "fail", field: "body", reason: "names the aspect as explanatory scaffolding" });
    }
    if (/\b(?:Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto|Chiron|Lilith|North Node)\s+(?:brings|carries|supplies|represents|rules|governs|protects|marks)\b[^.!?]*\bwhile\b/i.test(body)) {
      findings.push({ severity: "fail", field: "body", reason: "formulaic planet-definition contrast" });
    }
    if (/\bIf\b[^.!?]*[.!?]\s*$/.test(body)) findings.push({ severity: "fail", field: "body", reason: "conditional consequence ending" });
    if (/\n\s*\nWe feel (?:the|this|it)\b/i.test(body)) findings.push({ severity: "fail", field: "body", reason: "flat We feel transition" });
    if (/\bUnder (?:Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto|Chiron|Lilith|North Node)\b/i.test(body)) {
      findings.push({ severity: "fail", field: "body", reason: "stiff Under-aspect anchor" });
    }
    const { lintCard } = require("./lint-sky-voice.js");
    const skyLint = lintCard(body);
    for (const finding of skyLint.findings) {
      findings.push({
        severity: "fail",
        field: "body",
        reason: `Sky voice ${finding.severity}: ${finding.reason || finding.term}`,
        source: finding.source,
        match: finding.match || ""
      });
    }
    return {
      score: findings.some((finding) => finding.severity === "fail") ? 1 : 3,
      fails: findings.filter((finding) => finding.severity === "fail").length,
      findings
    };
  }
  for (const field of PROSE_FIELDS) {
    const value = String(entry[field] || "").trim();
    if (!value && field === "humanMoment") {
      findings.push({
        severity: "fail",
        field,
        source: "editorial-data-completeness",
        blocking: true,
        ownerProseRequired: false,
        reason: "missing human-moment beat; flag for aspect editorial work, not new owner prose"
      });
    } else if (!value) findings.push({ severity: "fail", field, reason: "missing field" });
    else if (sentenceCount(value) !== 1) findings.push({ severity: "fail", field, reason: `expected one sentence; found ${sentenceCount(value)}` });
    if (/—/.test(value)) findings.push({ severity: "fail", field, reason: "em dash" });
    if (/(^|[^-])\b(you|your|yours|yourself)\b/i.test(value)) findings.push({ severity: "fail", field, reason: "second person" });
    if (/\b(Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces)\b/.test(value)) {
      findings.push({ severity: "fail", field, reason: "sign-specific language" });
    }
    if (/\b(natal|synastry|house|degrees?|orb)\b/i.test(value)) findings.push({ severity: "fail", field, reason: "wrong-surface mechanics" });
  }
  if (entry.collectiveLeadEligible !== false && entry.collectiveLeadEligible !== true) {
    findings.push({ severity: "fail", field: "collectiveLeadEligible", reason: "must be boolean" });
  }
  return {
    score: findings.some((finding) => finding.severity === "fail") ? 1 : 3,
    fails: findings.filter((finding) => finding.severity === "fail").length,
    findings
  };
}

module.exports = {
  ASPECTS,
  ASPECT_MECHANIC,
  ASPECT_TITLE,
  CLASSICAL,
  OWNER_CORPUS_PATH,
  PROSE_FIELDS,
  TITLE,
  batchCounts,
  bodyFor,
  classicalPairSource,
  humanMomentFromPairSource,
  lintExactEntry,
  missingTargets,
  ownerCorpus,
  readerEligibleOwnerCorpus,
  titleFor
};
