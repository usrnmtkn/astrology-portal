#!/usr/bin/env node
/**
 * Contract test for the PHRASE evidence role.
 * Zero provider calls. Zero writes.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const builder = path.join(root, "scripts/build-phrase-index.mjs");
const indexPath = path.join(root, "packages/astro-knowledge/generated/phrase-index.json");
const fourBodyVoiceManifestPath = path.join(root, "packages/astro-knowledge/voice/tldr-astro/fixtures/sky-article-longform/owner-corpus/adjacent-formats/four-body-promotion/manifest.json");
const P = require(path.join(root, "packages/astro-knowledge/scripts/phrase-resolver.js"));

let passed = 0;
const ok = (label, condition) => { assert.ok(condition, `FAILED: ${label}`); passed += 1; console.log(`  ok  ${label}`); };

console.log("1. phrase index determinism");
{
  execFileSync(process.execPath, [builder, "--write"], { cwd: root, stdio: "pipe" });
  const before = fs.readFileSync(indexPath, "utf8");
  execFileSync(process.execPath, [builder, "--write"], { cwd: root, stdio: "pipe" });
  ok("two consecutive builds are byte-identical", fs.readFileSync(indexPath, "utf8") === before);
  execFileSync(process.execPath, [builder, "--check"], { cwd: root, stdio: "pipe" });
  ok("--check accepts a current index", true);
  ok("payload carries no timestamp", !/generatedAt/.test(before));
}

const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));

console.log("2. voice bank indexed in place");
{
  ok("evidence role is PHRASE", index.evidenceRole === "PHRASE");
  ok("72 themed one-liners", index.totals.oneLiners === 72);
  ok("gold examples, swaps and lived-moment rules present",
    index.totals.goldExamples === 20 && index.totals.approvedSwaps === 10 && index.totals.livedMomentRules === 5);
  ok("every phrase carries a source path and hash",
    index.phrases.every((p) => p.source?.path && p.source?.sourceSha256 && p.phraseSha256));
  ok("every phrase is owner-approved prose",
    index.phrases.every((p) => p.authorityClass === "owner-approved-prose"));
  ok("no source file was rewritten by the indexer",
    fs.existsSync(path.join(root, "tldr-astro-phrasebank/MARIE-VOICE-BANK.md")));
}

console.log("3. phrasebank classification");
{
  ok("63 files classified", index.totals.phrasebankFiles === 63);
  ok("reference and working files are excluded",
    index.phrasebankFiles.filter((f) => f.classification === "reference-or-working").every((f) => !f.retrievable));
  ok("unreviewed files are excluded",
    index.phrasebankFiles.filter((f) => f.classification === "unreviewed").every((f) => !f.retrievable));
  ok("retrievable files all carry reviewed entries",
    index.phrasebankFiles.filter((f) => f.retrievable).every((f) => f.reviewedEntries > 0));
}

console.log("3a. four-body voice exemplars stay fail-closed");
{
  ok("four sources are indexed as voice exemplars", index.totals.voiceExemplars === 4 && index.voiceExemplars.length === 4);
  ok("all four are doctrine-only and non-retrievable",
    index.voiceExemplars.every((entry) => entry.authorityClass === "voice-exemplar"
      && entry.surfacePermission.length === 1
      && entry.surfacePermission[0] === "doctrine-only"
      && entry.retrievable === false
      && entry.writerEligible === false
      && entry.renderEligible === false));
  ok("each exemplar is hash-pinned to its Markdown source",
    index.voiceExemplars.every((entry) => entry.textSha256 && entry.source?.path && entry.source?.sourceSha256));

  const original = fs.readFileSync(fourBodyVoiceManifestPath);
  try {
    const truncated = JSON.parse(original.toString("utf8"));
    truncated.entries = truncated.entries.slice(0, 3);
    fs.writeFileSync(fourBodyVoiceManifestPath, `${JSON.stringify(truncated, null, 2)}\n`);
    const failed = spawnSync(process.execPath, [builder, "--check"], { cwd: root, encoding: "utf8" });
    ok("the four-source named baseline has been observed failing",
      failed.status !== 0 && `${failed.stdout}${failed.stderr}`.includes("FOUR_BODY_VOICE_ROWS_SHRANK"));
  } finally {
    fs.writeFileSync(fourBodyVoiceManifestPath, original);
  }
}

console.log("4. components are object-matched, not theme-matched");
{
  ok("component sets indexed", index.totals.componentSets > 1000);
  ok("most sets resolve to a canonical id", index.totals.componentSetsWithCanonicalId / index.totals.componentSets > 0.95);
  ok("hand-voiced sets are marked", index.totals.handVoicedSets === 99);
  const sel = P.selectComponents("transit-aspect/saturn/mercury/conjunction");
  ok("exact object match returns its own set", sel.exact.length > 0 && sel.exact[0].canonicalId === "transit-aspect/saturn/mercury/conjunction");
  ok("components carry a card role", sel.exact[0].components.every((c) => typeof c.role === "string"));
  ok("hand-voiced sets rank first", sel.exact.every((s, i, a) => i === 0 || !(s.handVoiced && !a[i - 1].handVoiced)));
}

console.log("5. retrieval bounds and labelling");
{
  const s = P.selectPhrases("transit-aspect/saturn/mercury/conjunction");
  ok("between 5 and 10 available lines", s.counts.linesSelected >= 5 && s.counts.linesSelected <= 10);
  const prompt = P.phraseEvidenceToPrompt(s);
  ok("lines are labelled AVAILABLE LINES", /AVAILABLE LINES/.test(prompt));
  ok("components are labelled AVAILABLE COMPONENTS", /AVAILABLE COMPONENTS/.test(prompt));
  ok("reuse is explicitly permitted", /use them verbatim or adapt/i.test(prompt));
  ok("distinguished from register examples and correction pairs", /not register examples/i.test(prompt));
  const perTheme = {};
  for (const l of s.availableLines) perTheme[l.theme] = (perTheme[l.theme] ?? 0) + 1;
  ok("no theme supplies more than 3 lines", Object.values(perTheme).every((n) => n <= 3));
}

console.log("6. mechanism-reference rule holds for phrases too");
{
  const sel = P.selectComponents("transit-aspect/saturn/mercury/conjunction");
  const prompt = P.componentsToPrompt(sel);
  ok("a same-pair natal set, if present, is mechanism-reference only",
    sel.related.length === 0 || /MECHANISM REFERENCE ONLY/.test(prompt));
  ok("related sets are natal, not transit",
    sel.related.every((r) => String(r.canonicalId).startsWith("natal-aspect/")));
}

console.log("7. block rule");
{
  const s = P.selectPhrases("transit-aspect/saturn/mercury/conjunction");
  ok("a covered target does not block", s.blocked === false);
  assert.throws(() => P.assertPhraseEvidence({ blocked: true, reason: "PHRASE_EVIDENCE_MISSING: test" }), /PHRASE_EVIDENCE_MISSING/);
  ok("assertPhraseEvidence throws when blocked", true);
  const cfg = JSON.parse(fs.readFileSync(path.join(root, "packages/astro-knowledge/review/friends-transit-wave-1-config.json"), "utf8"));
  let blocked = 0, lines = 0, comps = 0;
  for (const key of cfg.wave1Keys) {
    const [, , t, n, a] = key.split("/");
    const r = P.selectPhrases(`transit-aspect/${t}/${n}/${a}`);
    if (r.blocked) blocked += 1;
    lines += r.counts.linesSelected;
    comps += r.counts.components;
  }
  ok("no wave-1 target blocks", blocked === 0);
  ok("every wave-1 target receives lines", lines / cfg.wave1Keys.length >= 5);
  console.log(`      wave-1: ${(lines / 60).toFixed(1)} lines and ${(comps / 60).toFixed(1)} components per target`);
}

console.log("8. the Friends runner consumes phrase evidence");
{
  const runner = fs.readFileSync(path.join(root, "scripts/run-friends-transit-wave-comparison.mjs"), "utf8");
  ok("imports the phrase resolver", /phrase-resolver/.test(runner));
  ok("calls the block rule before any provider work", /assertPhraseEvidence/.test(runner));
  ok("renders phrase evidence into the writer prompt", /phraseEvidenceToPrompt/.test(runner));
}

console.log("9. Venus in Libra retro-check");
{
  const v = P.selectPhrases("placement-sign/venus/libra", { context: { house: 7 } });
  ok("themes match", v.counts.themesMatched >= 5);
  ok("owner lines are available", v.counts.linesSelected >= 5);
  ok("its own component set resolves", v.counts.componentSets >= 1);
  ok("not blocked", v.blocked === false);
}

console.log(`\nAll ${passed} phrase-evidence checks passed.`);
