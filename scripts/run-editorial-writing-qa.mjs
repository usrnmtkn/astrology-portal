#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const require = createRequire(import.meta.url);

const scanRoots = [
  "packages/astro-knowledge/data/angles",
  "packages/astro-knowledge/data/synastry/aspects",
  "tldr-astro-phrasebank/phrasebank",
  "apps/web/src/content/fallbackArchitectureV3/source-rows",
  "apps/web/src/content/fallbackArchitectureV3/templates",
  "apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js"
];

const excludedPathParts = [
  "/phrasebank/cc-slot-templates.json",
  "/phrasebank/cc-fallback-hooks.json",
  "/phrasebank/cc-slot-resolution-map.json"
];

const readerFieldPattern = /^(headline|title|summary|body|plainTranslation|tagline|advice|text|copy|content|description|bestMove|emptyState|card|detail|tldr|you|friend|natal|sky|romantic|friendship|family|coworkers|creative|exes|complicated)$/i;
const ignoredFieldPattern = /^(id|key|content_key|contentKey|schema|source|sources|source_id|sourceIds|knowledge_ids|provider|model|prompt|promptVersion|reviewer_notes|notes|note|metadata|facts|aliases|template|templates|requiredFacts|exampleIds)$/i;

const blockingChecks = [
  {
    id: "placeholder-copy",
    description: "Placeholder or unresolved runtime value",
    pattern: /\b(?:Interpretation in review|TODO|TBD|TK|lorem ipsum|NaN)\b/i
  },
  {
    id: "internal-scaffold",
    description: "Internal scaffolding or implementation language",
    pattern: /\b(?:sourceSnapshot|templateVersion|Missing VITE|hydrated|Supabase|record id|slot-template|source framework|fallback hook|write a sentence|use this when)\b/i
  },
  {
    id: "known-emergency-synastry",
    description: "Known emergency synastry fallback wording",
    pattern: /puts first impressions,\s*outward style/i
  },
  {
    id: "mechanical-natal-aspect-fallback",
    description: "Mechanical natal aspect fallback fragments",
    pattern: /\b(?:giving North Node a clear place|one part of the contact|other part of the contact pushes back|They disagree about how you should respond|Recurring friction that asks for an adjustment|Name both sides of the pattern before choosing the next concrete response)\b/i
  },
  {
    id: "mechanical-emergency-detail-fallback",
    description: "Mechanical emergency detail fallback fragments",
    pattern: /\b(?:This pattern is active now|This transit is active now|is active here|current emphasis (?:is|may be) visible in timing, mood|everyday choices|while this contact is active)\b/i
  }
];

const warningChecks = [
  {
    id: "directional-copy",
    description: "Directive or moralizing phrasing for editorial review",
    pattern: /\b(?:Notice how|pay attention to|watch for|asks for attention|invites you to|the lesson is|gentle reminder|step into your power)\b/i
  },
  {
    id: "vague-boilerplate",
    description: "Potentially generic boilerplate wording",
    pattern: /\b(?:same relationship field|themes are activated|this energy|your highest self|the universe)\b/i
  },
  {
    id: "mechanical-pairing",
    description: "Mechanically stitched point/function language",
    pattern: /\b(?:bringing .+ together with .+\. Between you it plays as|linking .+ with .+\. It plays as)\b/i
  }
];

const sourceLeakChecks = [
  {
    id: "mechanical-emergency-detail-fallback",
    description: "Mechanical emergency detail fallback fragments",
    pattern: /\b(?:This pattern is active now|This transit is active now|is active here|current emphasis (?:is|may be) visible in timing, mood|everyday choices|while this contact is active)\b/i
  }
];

const makeLineLookup = (source) => {
  const starts = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === "\n") starts.push(index + 1);
  }

  return (needle) => {
    const index = source.indexOf(needle);
    if (index < 0) return 1;
    let low = 0;
    let high = starts.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (starts[mid] <= index) low = mid + 1;
      else high = mid - 1;
    }

    return Math.max(1, high + 1);
  };
};

async function collectFiles(entry) {
  const absolute = path.join(root, entry);
  const entryStat = await stat(absolute).catch(() => null);
  if (!entryStat) return [];

  if (entryStat.isFile()) {
    return [absolute];
  }

  const files = [];
  const children = await readdir(absolute);
  for (const child of children) {
    files.push(...await collectFiles(path.join(entry, child)));
  }

  return files;
}

function shouldScanFile(filePath) {
  const normalized = filePath.split(path.sep).join("/");
  if (!/\.(json|ts)$/.test(normalized)) return false;
  return !excludedPathParts.some((part) => normalized.endsWith(part));
}

function truncate(value) {
  return value.replace(/\s+/g, " ").trim().slice(0, 180);
}

function isExactOwnerApprovedRecord(value) {
  return Boolean(
    value
    && typeof value === "object"
    && !Array.isArray(value)
    && value.owner_approved === true
    && value.review_status === "approved"
    && value.approval?.approvalLevel === "exact_owner_approved"
    && typeof value.approval?.recordPath === "string"
    && value.approval.recordPath.length > 0
    && /^[a-f0-9]{64}$/i.test(value.approval?.payloadSha256 ?? "")
  );
}

function collectReaderStringsFromJson(value, filePath, trail = [], exactOwnerApproved = false) {
  if (typeof value === "string") {
    const key = String(trail.at(-1) ?? "");
    if (!readerFieldPattern.test(key) || ignoredFieldPattern.test(key)) return [];
    return [{ value, fieldPath: trail.join("."), exactOwnerApproved }];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => (
      collectReaderStringsFromJson(item, filePath, [...trail, String(index)], exactOwnerApproved)
    ));
  }

  if (value && typeof value === "object") {
    const childExactOwnerApproved = exactOwnerApproved || isExactOwnerApprovedRecord(value);
    return Object.entries(value).flatMap(([key, child]) => (
      collectReaderStringsFromJson(child, filePath, [...trail, key], childExactOwnerApproved)
    ));
  }

  return [];
}

function collectReaderStringsFromSource(source) {
  const matches = [];
  const assignmentPattern = /\b(?:headline|summary|body|title|tagline|description|bestMove|emptyState)\s*:\s*(["'`])([\s\S]*?)\1/g;
  let match;

  while ((match = assignmentPattern.exec(source)) !== null) {
    matches.push({ value: match[2], fieldPath: match[0].split(":")[0].trim() });
  }

  return matches;
}

function lineForJsonField(source, fieldPath, value) {
  const lineFor = makeLineLookup(source);
  const directLine = lineFor(value);
  if (directLine > 1) return directLine;

  const lastKey = fieldPath.split(".").at(-1);
  return lastKey ? lineFor(`"${lastKey}"`) : 1;
}

function checkString({ filePath, source, fieldPath, value, exactOwnerApproved = false }) {
  const findings = [];
  const line = lineForJsonField(source, fieldPath, value);
  const fieldName = String(fieldPath.split(".").at(-1) ?? "");

  for (const check of blockingChecks) {
    if (check.id === "mechanical-emergency-detail-fallback" && exactOwnerApproved) continue;
    if (check.pattern.test(value)) {
      findings.push({
        severity: "BLOCKER",
        check: check.id,
        description: check.description,
        filePath,
        line,
        fieldPath,
        excerpt: truncate(value),
        exactOwnerApproved
      });
    }
  }

  for (const check of warningChecks) {
    if (check.pattern.test(value)) {
      findings.push({
        severity: "WARNING",
        check: check.id,
        description: check.description,
        filePath,
        line,
        fieldPath,
        excerpt: truncate(value),
        exactOwnerApproved
      });
    }
  }

  const wordCount = value.trim().split(/\s+/).filter(Boolean).length;
  const shouldWarnForLength = !/^(body|content|text|copy)$/i.test(fieldName);
  if (shouldWarnForLength && wordCount > 180) {
    findings.push({
      severity: "WARNING",
      check: "long-copy",
      description: "Long field may need editorial scannability review",
      filePath,
      line,
      fieldPath,
      excerpt: truncate(value),
      exactOwnerApproved
    });
  }

  // Do not classify contractions such as "you you're" as adjacent duplicates.
  if (/\b(\w+)\s+\1\b(?!['’])/i.test(value)) {
    findings.push({
      severity: "WARNING",
      check: "repeated-word",
      description: "Repeated adjacent word",
      filePath,
      line,
      fieldPath,
      excerpt: truncate(value),
      exactOwnerApproved
    });
  }

  return findings;
}

function checkSourceForKnownLeaks({ filePath, source }) {
  // JSON reader fields are checked structurally above so their approval
  // provenance is available. Raw-source scanning is retained for TypeScript,
  // where emergency copy can otherwise hide outside an extracted reader field.
  if (filePath.endsWith(".json")) return [];

  const findings = [];
  const lineFor = makeLineLookup(source);

  for (const check of sourceLeakChecks) {
    const match = source.match(check.pattern);
    if (!match?.[0]) continue;

    findings.push({
      severity: "BLOCKER",
      check: check.id,
      description: check.description,
      filePath,
      line: lineFor(match[0]),
      fieldPath: "source",
      excerpt: truncate(match[0])
    });
  }

  return findings;
}

function assertEditorialApprovalContract() {
  const source = JSON.stringify({
    approved: {
      owner_approved: true,
      review_status: "approved",
      approval: {
        approvalLevel: "exact_owner_approved",
        recordPath: "packages/astro-knowledge/review/contract.json",
        payloadSha256: "a".repeat(64)
      },
      body: "Identity is active here."
    },
    unreviewed: {
      review_status: "draft",
      body: "This transit is active now."
    }
  }, null, 2);
  const strings = collectReaderStringsFromJson(JSON.parse(source), "contract.json");
  const approved = strings.find((entry) => entry.fieldPath === "approved.body");
  const unreviewed = strings.find((entry) => entry.fieldPath === "unreviewed.body");

  assert.ok(approved?.exactOwnerApproved, "Exact owner approval must travel with its reader text.");
  assert.equal(
    checkString({ filePath: "contract.json", source, ...approved })
      .some((finding) => finding.check === "mechanical-emergency-detail-fallback"),
    false,
    "Exact owner-approved wording must not be rejected by the generic emergency-copy heuristic."
  );
  assert.equal(
    checkString({ filePath: "contract.json", source, ...unreviewed })
      .some((finding) => finding.check === "mechanical-emergency-detail-fallback"),
    true,
    "Unreviewed mechanical emergency copy must remain blocking."
  );
}

assertEditorialApprovalContract();

try {
  const handledSurface = await runSurfaceVoiceQa(process.argv.slice(2));
  if (handledSurface) process.exit(process.exitCode ?? 0);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const allFiles = (await Promise.all(scanRoots.map(collectFiles))).flat().filter(shouldScanFile);
const allFindings = [];
let scannedStrings = 0;

for (const filePath of allFiles) {
  const source = await readFile(filePath, "utf8");
  let readerStrings = [];

  allFindings.push(...checkSourceForKnownLeaks({ filePath, source }));

  if (filePath.endsWith(".json")) {
    try {
      readerStrings = collectReaderStringsFromJson(JSON.parse(source), filePath);
    } catch (error) {
      allFindings.push({
        severity: "BLOCKER",
        check: "invalid-json",
        description: error instanceof Error ? error.message : "Invalid JSON",
        filePath,
        line: 1,
        fieldPath: "",
        excerpt: ""
      });
      continue;
    }
  } else {
    readerStrings = collectReaderStringsFromSource(source);
  }

  scannedStrings += readerStrings.length;
  for (const readerString of readerStrings) {
    allFindings.push(...checkString({ filePath, source, ...readerString }));
  }
}

const blockers = allFindings.filter((finding) => finding.severity === "BLOCKER");
const warnings = allFindings.filter((finding) => finding.severity === "WARNING");

const reportFinding = (finding) => {
  const relativePath = path.relative(root, finding.filePath);
  const fingerprint = createHash("sha256")
    .update([finding.severity, finding.check, relativePath, finding.fieldPath, finding.excerpt].join("\u0000"))
    .digest("hex");
  return { ...finding, filePath: relativePath, fingerprint };
};

const reportBlockers = blockers.map(reportFinding);
const reportWarnings = warnings.map(reportFinding);
const editorialReportDir = path.join(root, "test-results", "editorial-writing-qa");
const warningGroups = [...Map.groupBy(reportWarnings, (finding) => finding.check).entries()]
  .sort((left, right) => right[1].length - left[1].length || left[0].localeCompare(right[0]));
const reviewQueueMarkdown = [
  "# Editorial Writing Review Queue",
  "",
  `Generated: ${new Date().toISOString()}`,
  `Blocking findings: ${reportBlockers.length}`,
  `Human-review warnings: ${reportWarnings.length}`,
  "",
  "This queue is diagnostic. Do not bulk-rewrite owner-authored or governed copy. Review each item in source context and record an explicit editorial decision.",
  "",
  "## Warning groups",
  "",
  ...warningGroups.map(([check, findings]) => `- ${check}: ${findings.length}`),
  "",
  "## Review items",
  "",
  ...warningGroups.flatMap(([check, findings]) => [
    `### ${check} (${findings.length})`,
    "",
    ...findings.flatMap((finding) => [
      `- [ ] \`${finding.filePath}:${finding.line}\` · \`${finding.fieldPath}\` · \`${finding.fingerprint.slice(0, 12)}\``,
      `  - ${finding.description}`,
      `  - “${finding.excerpt.replaceAll("“", "\\“").replaceAll("”", "\\”")}”`
    ]),
    ""
  ])
].join("\n");

await mkdir(editorialReportDir, { recursive: true });
await writeFile(path.join(editorialReportDir, "latest.json"), `${JSON.stringify({
  schema: "editorial-writing-review-queue/v1",
  generatedAt: new Date().toISOString(),
  filesScanned: allFiles.length,
  stringsScanned: scannedStrings,
  blockers: reportBlockers,
  warnings: reportWarnings
}, null, 2)}\n`);
await writeFile(path.join(editorialReportDir, "review-queue.md"), `${reviewQueueMarkdown}\n`);

if (process.env.EDITORIAL_QA_SUMMARY_JSON === "1") {
  const countBy = (values, keyFor) => Object.fromEntries(
    [...values.reduce((counts, value) => {
      const key = keyFor(value);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      return counts;
    }, new Map()).entries()].sort((left, right) => right[1] - left[1])
  );
  const warningFingerprints = new Set(warnings.map((finding) => `${finding.check}\u0000${finding.excerpt}`));

  console.log(JSON.stringify({
    filesScanned: allFiles.length,
    stringsScanned: scannedStrings,
    blockers: blockers.length,
    warnings: warnings.length,
    uniqueWarningFingerprints: warningFingerprints.size,
    mirroredOrRepeatedWarnings: warnings.length - warningFingerprints.size,
    exactOwnerApprovedWarnings: warnings.filter((finding) => finding.exactOwnerApproved).length,
    exactOwnerApprovedWarningDetails: warnings.filter((finding) => finding.exactOwnerApproved),
    byCheck: countBy(warnings, (finding) => finding.check),
    byFile: countBy(warnings, (finding) => path.relative(root, finding.filePath)),
    mechanicallyActionable: warnings.filter((finding) => (
      finding.check === "repeated-word" || finding.check === "mechanical-pairing"
    ))
  }, null, 2));
  process.exit(blockers.length > 0 ? 1 : 0);
}

if (process.env.EDITORIAL_QA_JSON === "1") {
  console.log(JSON.stringify({
    filesScanned: allFiles.length,
    stringsScanned: scannedStrings,
    blockers,
    warnings
  }, null, 2));
  process.exit(blockers.length > 0 ? 1 : 0);
}

console.log("# Editorial Writing QA");
console.log("");
console.log(`Files scanned: ${allFiles.length}`);
console.log(`Reader-facing strings scanned: ${scannedStrings}`);
console.log(`Blocking findings: ${blockers.length}`);
console.log(`Editorial warnings: ${warnings.length}`);
console.log("");

const printFinding = (finding) => {
  const relative = path.relative(root, finding.filePath);
  console.log(`- [${finding.severity}] ${finding.check}: ${finding.description}`);
  console.log(`  ${relative}:${finding.line} (${finding.fieldPath})`);
  console.log(`  "${finding.excerpt}"`);
};

if (blockers.length > 0) {
  console.log("## Blocking Findings");
  blockers.slice(0, 50).forEach(printFinding);
  if (blockers.length > 50) console.log(`- ${blockers.length - 50} more blocking findings omitted from console output.`);
  console.log("");
}

if (warnings.length > 0) {
  console.log("## Editorial Warnings");
  warnings.slice(0, 50).forEach(printFinding);
  if (warnings.length > 50) console.log(`- ${warnings.length - 50} more editorial warnings omitted from console output.`);
  console.log("");
}

console.log("## Editorial Checks");
console.log("- Blocking: placeholder copy, unresolved runtime values, internal scaffold terms, source-framework directions, known emergency fallback wording, and mechanical natal-aspect fallback fragments.");
console.log("- Warnings: directional/moralizing phrasing, generic boilerplate, mechanically stitched point language, long fields, and repeated adjacent words.");

if (blockers.length > 0) {
  process.exitCode = 1;
}

function argumentValue(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

async function runSurfaceVoiceQa(args) {
  const surface = argumentValue(args, "--surface");
  const contentKey = argumentValue(args, "--content-key");
  if (!surface && !contentKey) return false;

  const file = argumentValue(args, "--file");
  if (!file) throw new Error("surface voice QA requires --file <article.md|trio.json>");
  const filePath = path.resolve(root, file);
  const source = await readFile(filePath, "utf8");
  const planet = argumentValue(args, "--planet") || "";
  const samples = Number(argumentValue(args, "--samples") || 1);
  const { LONGFORM_SURFACE, resolveSurface, runEditorialVoiceQa } = require("../packages/astro-knowledge/scripts/editorial-voice-router.js");
  const resolvedSurface = resolveSurface({ surface, contentKey });
  const input = resolvedSurface === LONGFORM_SURFACE
    ? { surface: resolvedSurface, contentKey, articleText: source, planet, edition: argumentValue(args, "--edition") || "" }
    : { surface: resolvedSurface, contentKey, article: JSON.parse(source), planet, sign: argumentValue(args, "--sign") || "" };
  const result = await runEditorialVoiceQa(input, {
    withJudge: !args.includes("--lint-only"),
    ownerVerbatim: args.includes("--owner-verbatim"),
    samples: Number.isFinite(samples) && samples > 0 ? samples : 1
  });
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.gate === "regenerate" ? 2 : result.gate === "human-review" ? 1 : 0;
  return true;
}
