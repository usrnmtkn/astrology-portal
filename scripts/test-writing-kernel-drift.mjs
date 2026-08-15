#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const allowlistPath = path.join(repoRoot, "config/writing-kernel-drift-allowlist.json");
const sourceRoots = ["api", "src", "scripts", "packages/astro-knowledge/scripts", ".agents/skills"];
const sourceExtensions = new Set([".js", ".cjs", ".mjs", ".ts", ".tsx"]);
const ignoredSegments = new Set(["node_modules", "dist", "generated", "review", "out"]);
const kernelFiles = new Set([
  "packages/astro-knowledge/scripts/knowledge-resolver.js",
  "src/astro-writing/geminiInteractions.cjs",
  "src/astro-writing/openAIResponses.cjs"
]);

const RULES = Object.freeze({
  provider_call: [
    /api\.openai\.com/gu,
    /api\.anthropic\.com/gu,
    /generativelanguage\.googleapis\.com/gu,
    /\bcallOpenAIResponses\s*\(/gu
  ],
  packet_builder: [
    /\bfunction\s+buildPacket\s*\(/gu,
    /\b(?:const|let|var)\s+buildPacket\s*=\s*/gu
  ],
  owner_prose_prompt_read: [
    /OWNER_APPROVED_EXAMPLES\.jsonl/gu,
    /voice\/tldr-astro\/examples\.json/gu,
    /phrase-library-batch1\.md/gu,
    /rewrite-corpora/gu,
    /source-backed-revisions/gu,
    /natal-placement-primitives/gu,
    /authored-placements/gu,
    /corpus-warmth-harvest/gu
  ]
});
const PROMPT_USE_PATTERN = /\b(?:prompt|modelInput|renderModelInput|writerPrompt|buildPrompt|callOpenAIResponses)\b/iu;

// This immutable-in-test ceiling is the initial exception set. The JSON
// allowlist may delete entries as migrations land, but a new path/category
// cannot be introduced by editing the data file alone.
const FROZEN_INITIAL_EXCEPTIONS = Object.freeze([
  ".agents/skills/satori-writer/scripts/compile-writing-packet-legacy-audit.js|packet_builder",
  ".agents/skills/satori-writer/scripts/compile-writing-packet.js|packet_builder",
  "api/_lib/content-generation.ts|owner_prose_prompt_read",
  "api/_lib/content-generation.ts|provider_call",
  "api/_lib/report-model-client.ts|provider_call",
  "packages/astro-knowledge/scripts/audit-daily-glance-voice.js|provider_call",
  "packages/astro-knowledge/scripts/daily-glance-writer-runtime.js|owner_prose_prompt_read",
  "packages/astro-knowledge/scripts/daily-glance-writer-runtime.js|packet_builder",
  "packages/astro-knowledge/scripts/generate-sky-aspect-cards.js|owner_prose_prompt_read",
  "packages/astro-knowledge/scripts/generate-sky-aspect-cards.js|provider_call",
  "packages/astro-knowledge/scripts/generate-sky-exact-aspect-drafts.js|owner_prose_prompt_read",
  "packages/astro-knowledge/scripts/judge-daily-glance.js|provider_call",
  "packages/astro-knowledge/scripts/run-daily-glance-judged.js|provider_call",
  "packages/astro-knowledge/scripts/run-daily-glance-self-audit-pilot.js|provider_call",
  "packages/astro-knowledge/scripts/run-daily-glance-writer-pilots.js|provider_call",
  "packages/astro-knowledge/scripts/run-sky-placement-judge-ab-evaluation.js|provider_call",
  "packages/astro-knowledge/scripts/run-sky-placement-writer-sample.js|provider_call",
  "scripts/run-ascendant-batch-drafts.mjs|provider_call",
  "scripts/run-astro-writing-harness.mjs|owner_prose_prompt_read",
  "scripts/run-astro-writing-harness.mjs|provider_call",
  "scripts/run-astro-writing-live-reviewer-eval-v3-1-run-2c.mjs|provider_call",
  "scripts/run-astro-writing-live-reviewer-eval-v3-1.mjs|provider_call",
  "scripts/run-astro-writing-live-reviewer-eval-v3.mjs|provider_call",
  "scripts/run-astro-writing-live-reviewer-eval.mjs|provider_call",
  "scripts/run-cold-rendered-prose-live-eval.mjs|provider_call",
  "scripts/run-cold-rendered-prose-round-2-live-eval.mjs|provider_call",
  "scripts/run-friends-transit-wave-comparison.mjs|provider_call",
  "scripts/run-sky-placement-hook-audit.mjs|provider_call",
  "scripts/run-sun-aquarius-9th-admin-draft-test.mjs|owner_prose_prompt_read",
  "scripts/run-sun-aquarius-9th-admin-draft-test.mjs|provider_call"
]);

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignoredSegments.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(absolute));
    else if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) files.push(absolute);
  }
  return files;
}

function isTestFile(relative) {
  const base = path.basename(relative);
  return /(?:^test-|\.test\.)/u.test(base) || relative.startsWith("tests/");
}

export function scanWritingKernelDrift() {
  const findings = [];
  const files = sourceRoots.flatMap((root) => walk(path.join(repoRoot, root)));
  for (const absolute of files) {
    const relative = path.relative(repoRoot, absolute).split(path.sep).join("/");
    if (isTestFile(relative) || kernelFiles.has(relative)) continue;
    const source = fs.readFileSync(absolute, "utf8");
    for (const [category, patterns] of Object.entries(RULES)) {
      if (category === "owner_prose_prompt_read" && !PROMPT_USE_PATTERN.test(source)) continue;
      if (patterns.some((pattern) => {
        pattern.lastIndex = 0;
        return pattern.test(source);
      })) findings.push(`${relative}|${category}`);
    }
  }
  return [...new Set(findings)].sort();
}

function main() {
  const allowlist = JSON.parse(fs.readFileSync(allowlistPath, "utf8"));
  assert.equal(allowlist.schemaVersion, 1);
  const active = (allowlist.entries ?? []).map((entry) => {
    assert.equal(typeof entry.path, "string", "Every drift exception needs a path.");
    assert.equal(typeof entry.category, "string", "Every drift exception needs a category.");
    assert.match(String(entry.removalTicket ?? ""), /\S/u, `Missing removalTicket for ${entry.path}|${entry.category}.`);
    return `${entry.path}|${entry.category}`;
  }).sort();
  assert.equal(new Set(active).size, active.length, "Drift allowlist entries must be unique.");
  const ceiling = new Set(FROZEN_INITIAL_EXCEPTIONS);
  const additions = active.filter((entry) => !ceiling.has(entry));
  assert.deepEqual(additions, [], `The drift allowlist may only shrink. Unauthorized additions: ${additions.join(", ")}`);

  const findings = scanWritingKernelDrift();
  const unallowlisted = findings.filter((finding) => !active.includes(finding));
  const stale = active.filter((entry) => !findings.includes(entry));
  assert.deepEqual(unallowlisted, [], `Writing-kernel bypasses must be migrated or use an existing frozen exception: ${unallowlisted.join(", ")}`);
  assert.deepEqual(stale, [], `Remove resolved entries from the shrink-only drift allowlist: ${stale.join(", ")}`);
  console.log(`Writing-kernel drift freeze passed: ${findings.length} frozen exception(s), zero new bypasses.`);
}

if (process.argv.includes("--report")) {
  console.log(JSON.stringify(scanWritingKernelDrift(), null, 2));
} else {
  main();
}
