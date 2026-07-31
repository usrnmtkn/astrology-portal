#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "../../..");
const bankPath = path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/source-rows/editorial-source-bank-v1.json"
);
const voiceRoot = path.join(__dirname, "../voice/tldr-astro");
const generalVoiceRoot = path.join(__dirname, "../voice");
const { runJudgeSamples } = require("./editorial-judge-runtime.js");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function slug(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function flattenBank(bank = readJson(bankPath)) {
  return bank.collections.flatMap((collection) =>
    collection.entries.map((entry) => ({
      ...entry,
      collectionId: collection.id,
      collectionTitle: collection.title,
      family: collection.family,
      surface: collection.surface,
      judgeProfile: collection.judgeProfile,
      source_keys: collection.source_keys,
      contentKey: `fallback-source/editorial/${slug(collection.id)}/${slug(entry.id)}`,
      content_role: "fallback_source",
      review_status: bank.authoring.review_status,
      approved_via: bank.authoring.approved_via,
      owner_authored: true
    }))
  );
}

function phraseMatches(body, phrase) {
  return body.toLowerCase().includes(String(phrase).toLowerCase());
}

function wordMatches(body, term) {
  const escaped = String(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(body);
}

function lintEntry(entry) {
  const errors = [];
  const notes = [];
  const body = String(entry.body ?? "").trim();

  if (!body) errors.push("missing body");
  if (!entry.contentKey) errors.push("missing content key");
  if (!entry.family) errors.push("missing family");
  if (!entry.judgeProfile) errors.push("missing judge profile");
  if (entry.content_role !== "fallback_source") errors.push("must remain fallback_source");
  if (entry.review_status !== "approved") errors.push("owner-authored entry must remain approved");
  if (entry.approved_via !== "owner-authored") errors.push("owner approval provenance is missing");

  if (/[—–]/.test(body)) {
    notes.push("contains a long dash; preserve as authored unless the owner requests a style edit");
  }
  if (/\{\{[^}]+\}\}/.test(body)) {
    notes.push("contains an unresolved template token");
  }

  const bannedPhrases = readJson(path.join(voiceRoot, "banned-phrases.json"));
  const bannedWords = readJson(path.join(generalVoiceRoot, "banned-words.json")).bannedWords;
  const phraseNotes = bannedPhrases
    .filter((phrase) => phrase !== "em dashes" && phraseMatches(body, phrase))
    .map((phrase) => `matches house-style phrase flag: "${phrase}"`);
  const wordNotes = bannedWords
    .filter(({ term }) => wordMatches(body, term))
    .map(({ term }) => `matches house-style word flag: "${term}"`);

  notes.push(...phraseNotes, ...wordNotes);

  if (entry.judgeProfile === "quotable-one-liner") {
    const wordCount = body.split(/\s+/).filter(Boolean).length;
    if (wordCount > 30) notes.push(`long one-liner (${wordCount} words)`);
    if (!entry.category) errors.push("quotable one-liner is missing a category");
  }

  return { errors, notes };
}

function lintBank(bank = readJson(bankPath)) {
  const entries = flattenBank(bank);
  const results = entries.map((entry) => ({
    contentKey: entry.contentKey,
    ...lintEntry(entry)
  }));
  const keys = entries.map((entry) => entry.contentKey);
  const duplicateKeys = keys.filter((key, index) => keys.indexOf(key) !== index);

  return {
    entryCount: entries.length,
    errors: [
      ...new Set(duplicateKeys.map((key) => `duplicate content key: ${key}`)),
      ...results.flatMap((result) =>
        result.errors.map((message) => `${result.contentKey}: ${message}`)
      )
    ],
    notes: results.flatMap((result) =>
      result.notes.map((message) => `${result.contentKey}: ${message}`)
    )
  };
}

function buildJudgePrompt(entry) {
  const category = entry.category ?? entry.family;
  const profileInstruction = entry.judgeProfile === "astrology-source"
    ? "Check that the astrology family and sign, element, season, or lunation labels match the copy. Do not require this source unit to read like a finished card."
    : "Check that the line fits its assigned category, lands cleanly, and remains usable as a quotable unit.";

  return [
    "You are performing optional editorial QA on owner-authored, already-approved TLDR Astro source material.",
    "Do not rewrite the copy. Do not revoke approval. Do not turn this into a publication gate.",
    "",
    `Profile: ${entry.judgeProfile}`,
    `Family: ${entry.family}`,
    `Category: ${category}`,
    `Surface: ${entry.surface}`,
    "",
    profileInstruction,
    "Flag only concrete issues an editor may want to know about:",
    "- label or category mismatch;",
    "- wording that depends on context not present in the unit;",
    "- absolutist or accusatory framing that could be misplaced on a sensitive surface;",
    "- medical, legal, financial, or mental-health claims;",
    "- a likely quotation or attribution concern;",
    "- duplicate or near-duplicate meaning within a bank.",
    "",
    "Score 1-3 for reuse readiness:",
    "3 = cleanly reusable in the named family/category.",
    "2 = reusable, with a specific placement or context note.",
    "1 = keep approved in the source bank, but do not place without resolving a concrete mismatch or risk.",
    "",
    "The score is advisory. Every score retains owner-authored approval and requires no review workflow.",
    "",
    "SOURCE UNIT:",
    entry.body,
    "",
    "Return ONLY strict JSON:",
    "{\"score\":1|2|3,\"verdict\":\"clear\"|\"placement-note\"|\"placement-risk\",\"categoryFit\":\"one short sentence\",\"riskFlags\":[\"short flag\"],\"why\":\"one short reason\",\"approvalAction\":\"retain-owner-approval\"}"
  ].join("\n");
}

function parseVerdict(raw) {
  const match = String(raw).match(/\{[\s\S]*\}/);
  if (!match) {
    return {
      score: 1,
      verdict: "placement-risk",
      categoryFit: "Judge output was unavailable.",
      riskFlags: ["judge-output"],
      why: "Judge did not return JSON.",
      approvalAction: "retain-owner-approval"
    };
  }

  try {
    const parsed = JSON.parse(match[0]);
    return { ...parsed, approvalAction: "retain-owner-approval" };
  } catch {
    return {
      score: 1,
      verdict: "placement-risk",
      categoryFit: "Judge output could not be parsed.",
      riskFlags: ["judge-output"],
      why: "Judge returned invalid JSON.",
      approvalAction: "retain-owner-approval"
    };
  }
}

async function judgeEntry(entry, judgeFn) {
  const prompt = buildJudgePrompt(entry);
  const result = await runJudgeSamples({
    content: entry.body,
    prompt,
    rubric: JSON.stringify({ judgeProfile: entry.judgeProfile, family: entry.family, category: entry.category ?? entry.family }),
    rubricVersion: "editorial-source-bank-v1",
    samples: 1,
    temperature: 0.1,
    judgeFn,
    parseVerdict,
    context: {
      surface: entry.surface,
      modelSurface: "editorial-source-bank",
      family: entry.family,
      contentKey: entry.contentKey
    }
  });

  return {
    contentKey: entry.contentKey,
    ownerAuthored: true,
    reviewStatus: "approved",
    ...result,
    editorialLane: result.score === 3 && !result.disagreement ? "no-action" : "human-review",
    approvalAction: "retain-owner-approval"
  };
}

function findEntry(selector, bank = readJson(bankPath)) {
  const entries = flattenBank(bank);
  const normalized = String(selector ?? "").trim();
  const exact = entries.find((entry) => entry.contentKey === normalized);
  if (exact) return exact;

  const matches = entries.filter((entry) =>
    entry.id === normalized || `${entry.collectionId}/${entry.id}` === normalized
  );
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    throw new Error(`"${normalized}" matches multiple entries; use collection/id or the full content key.`);
  }
  throw new Error(`No editorial source entry matched "${normalized}".`);
}

module.exports = {
  bankPath,
  buildJudgePrompt,
  findEntry,
  flattenBank,
  judgeEntry,
  lintBank,
  lintEntry,
  parseVerdict
};

if (require.main === module) {
  const [mode, ...rest] = process.argv.slice(2);
  const authorizeLive = rest.includes("--authorize-live");
  const selector = rest.filter((value) => value !== "--authorize-live").join(" ");

  if (mode === "--lint") {
    const result = lintBank();
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.errors.length ? 1 : 0;
  } else if (mode === "--dry-run" && selector) {
    console.log(buildJudgePrompt(findEntry(selector)));
  } else if (mode === "--judge" && selector) {
    if (!authorizeLive) {
      console.error("Live source-bank judging requires --authorize-live and TLDR_ALLOW_LIVE_LLM_JUDGE=1.");
      process.exit(1);
    }
    judgeEntry(findEntry(selector))
      .then((result) => console.log(JSON.stringify(result, null, 2)))
      .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
      });
  } else {
    console.error("usage: --lint | --dry-run <collection/id|content-key> | --judge <collection/id|content-key>");
    process.exitCode = 1;
  }
}
