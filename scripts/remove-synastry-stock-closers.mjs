import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const sourceRelativePath = "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json";
const manifestRelativePath = "packages/astro-knowledge/review/synastry-stock-closer-removal-manifest.json";
const sourcePath = path.join(repoRoot, sourceRelativePath);
const manifestPath = path.join(repoRoot, manifestRelativePath);
const synastryPrefix = "fallback-hook/synastry-pair/";
const approvalLabel = "owner-approved stock-closer removal, chat 2026-08-04";
const expectedCounts = Object.freeze({ hard: 112, soft: 112, conjunction: 112 });
const sentenceSegmenter = new Intl.Segmenter("en", { granularity: "sentence" });

const signatures = Object.freeze([
  {
    id: "hard",
    suffix: "until the friction builds muscle.",
    pureTemplatePattern: /^That's \{\{holder1Poss\}\} [^:;.!?]+ against \{\{holder2Poss\}\} [^:;.!?]+: [^:;.!?]+ pulling against each other until the friction builds muscle\.$/u
  },
  {
    id: "soft",
    suffix: "the same side without trying.",
    pureTemplatePattern: /^That's \{\{holder1Poss\}\} [^:;.!?]+ with \{\{holder2Poss\}\} [^:;.!?]+: [^:;.!?]+ on the same side without trying\.$/u
  },
  {
    id: "conjunction",
    suffix: "running as one instinct.",
    pureTemplatePattern: /^That's \{\{holder1Poss\}\} [^:;.!?]+ on \{\{holder2Poss\}\} [^:;.!?]+: [^:;.!?]+ running as one instinct\.$/u
  }
]);

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sentences(value) {
  return Array.from(sentenceSegmenter.segment(value), ({ segment }) => segment.trim()).filter(Boolean);
}

function finalSentence(value) {
  return sentences(value).at(-1) ?? "";
}

function signatureFor(sentence) {
  return signatures.find(({ suffix }) => sentence.endsWith(suffix)) ?? null;
}

function removeFinalSentence(value, sentence) {
  const index = value.lastIndexOf(sentence);
  assert.notEqual(index, -1, "Final sentence must be present in the source body");
  return value.slice(0, index).trimEnd();
}

function hasTerminalPunctuation(value) {
  return /[.!?]$/u.test(value);
}

function appendApproval(existing) {
  const current = typeof existing === "string" ? existing.trim() : "";
  if (!current) return approvalLabel;
  if (current.split(" | ").includes(approvalLabel)) return current;
  return `${current} | ${approvalLabel}`;
}

function parseArgs(argv) {
  const unknown = argv.filter((arg) => arg !== "--apply");
  if (unknown.length > 0) {
    throw new Error(`Unknown argument(s): ${unknown.join(", ")}`);
  }
  return { apply: argv.includes("--apply") };
}

const { apply } = parseArgs(process.argv.slice(2));
const sourceTextBefore = fs.readFileSync(sourcePath, "utf8");
const source = JSON.parse(sourceTextBefore);
const synastryRows = source.hookRows.filter((row) => row.contentKey?.startsWith(synastryPrefix));
const matchedCounts = { hard: 0, soft: 0, conjunction: 0 };
const modified = [];
const skipped = [];

for (const row of synastryRows) {
  const sentenceYou = finalSentence(row.body_you ?? "");
  const signatureYou = signatureFor(sentenceYou);
  if (!signatureYou) continue;

  matchedCounts[signatureYou.id] += 1;
  const sentenceThey = finalSentence(row.body_they ?? "");
  const signatureThey = signatureFor(sentenceThey);

  if (!signatureThey || signatureThey.id !== signatureYou.id) {
    skipped.push({
      contentKey: row.contentKey,
      signature: signatureYou.id,
      reason: "body_you and body_they do not end on the same stock-closer signature",
      removedSentenceYou: sentenceYou,
      removedSentenceThey: sentenceThey || null
    });
    continue;
  }

  if (!signatureYou.pureTemplatePattern.test(sentenceYou) || !signatureThey.pureTemplatePattern.test(sentenceThey)) {
    skipped.push({
      contentKey: row.contentKey,
      signature: signatureYou.id,
      reason: "matching final sentence contains material outside the pure recap template frame",
      removedSentenceYou: sentenceYou,
      removedSentenceThey: sentenceThey
    });
    continue;
  }

  const bodyYouAfter = removeFinalSentence(row.body_you, sentenceYou);
  const bodyTheyAfter = removeFinalSentence(row.body_they, sentenceThey);
  const remainingYouSentences = sentences(bodyYouAfter).length;
  const remainingTheySentences = sentences(bodyTheyAfter).length;

  if (remainingYouSentences < 2 || remainingTheySentences < 2) {
    skipped.push({
      contentKey: row.contentKey,
      signature: signatureYou.id,
      reason: "removing the closer would leave a body under two sentences",
      removedSentenceYou: sentenceYou,
      removedSentenceThey: sentenceThey,
      remainingSentenceCounts: { body_you: remainingYouSentences, body_they: remainingTheySentences }
    });
    continue;
  }

  if (!hasTerminalPunctuation(bodyYouAfter) || !hasTerminalPunctuation(bodyTheyAfter)) {
    skipped.push({
      contentKey: row.contentKey,
      signature: signatureYou.id,
      reason: "remaining body would not end on terminal punctuation",
      removedSentenceYou: sentenceYou,
      removedSentenceThey: sentenceThey
    });
    continue;
  }

  const approvedViaBefore = typeof row.approved_via === "string" ? row.approved_via : null;
  const approvedViaAfter = appendApproval(row.approved_via);
  const reviewStatus = row.review_status;

  row.body_you = bodyYouAfter;
  row.body_they = bodyTheyAfter;
  row.approved_via = approvedViaAfter;

  modified.push({
    contentKey: row.contentKey,
    signature: signatureYou.id,
    removedSentence: sentenceYou,
    removedSentenceThey: sentenceThey,
    approvedViaBefore,
    approvedViaAfter,
    reviewStatus,
    remainingSentenceCounts: { body_you: remainingYouSentences, body_they: remainingTheySentences }
  });
}

assert.equal(synastryRows.length, 483, "The synastry serving-row count changed before the deletion pass");
assert.deepEqual(matchedCounts, expectedCounts, "Post-PR #61 stock-closer counts do not match the approved baseline");

const modifiedCounts = Object.fromEntries(
  Object.keys(expectedCounts).map((id) => [id, modified.filter((entry) => entry.signature === id).length])
);
const sourceTextAfter = `${JSON.stringify(source, null, 1)}\n`;
const manifest = {
  schema: "tldrastro-synastry-stock-closer-removal-manifest-v1",
  ownerDecision: {
    action: "delete stock recap closer after the behavior and cost are clear",
    source: "owner-approved in chat on 2026-08-04",
    approvedVia: approvalLabel
  },
  sourcePath: sourceRelativePath,
  scopePrefix: synastryPrefix,
  signatures: Object.fromEntries(signatures.map(({ id, suffix }) => [id, suffix])),
  expectedCounts,
  matchedCounts,
  modifiedCounts,
  modifiedCount: modified.length,
  skippedCount: skipped.length,
  synastryRowCountBefore: synastryRows.length,
  synastryRowCountAfter: source.hookRows.filter((row) => row.contentKey?.startsWith(synastryPrefix)).length,
  sourceSha256Before: sha256(sourceTextBefore),
  sourceSha256After: sha256(sourceTextAfter),
  modified,
  skipped
};

if (!apply) {
  console.log(JSON.stringify({
    mode: "dry-run",
    matchedCounts,
    modifiedCounts,
    modifiedCount: modified.length,
    skippedCount: skipped.length,
    sourcePath: sourceRelativePath,
    manifestPath: manifestRelativePath
  }, null, 2));
  process.exit(0);
}

fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
fs.writeFileSync(sourcePath, sourceTextAfter);
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

for (const entry of modified) {
  console.log(`${entry.contentKey}\t${entry.removedSentence}`);
}
for (const entry of skipped) {
  console.error(`SKIPPED\t${entry.contentKey}\t${entry.reason}`);
}
console.log(`Modified ${modified.length} rows; skipped ${skipped.length}.`);
console.log(`Manifest: ${manifestRelativePath}`);

if (skipped.length > 0) process.exitCode = 2;
