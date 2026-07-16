#!/usr/bin/env node

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();

const scanRoots = [
  "packages/astro-knowledge/data/angles",
  "packages/astro-knowledge/data/synastry/aspects",
  "tldr-astro-phrasebank/phrasebank",
  "apps/web/src/content/skyContentSnapshot.json",
  "apps/web/src/content/aspectPairSourcePhrases.json",
  "apps/web/src/content/seasonArcCopy.ts",
  "apps/web/src/content/lunarBeatCopy.ts"
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

function collectReaderStringsFromJson(value, filePath, trail = []) {
  if (typeof value === "string") {
    const key = String(trail.at(-1) ?? "");
    if (!readerFieldPattern.test(key) || ignoredFieldPattern.test(key)) return [];
    return [{ value, fieldPath: trail.join(".") }];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectReaderStringsFromJson(item, filePath, [...trail, String(index)]));
  }

  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => collectReaderStringsFromJson(child, filePath, [...trail, key]));
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

function checkString({ filePath, source, fieldPath, value }) {
  const findings = [];
  const line = lineForJsonField(source, fieldPath, value);

  for (const check of blockingChecks) {
    if (check.pattern.test(value)) {
      findings.push({
        severity: "BLOCKER",
        check: check.id,
        description: check.description,
        filePath,
        line,
        fieldPath,
        excerpt: truncate(value)
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
        excerpt: truncate(value)
      });
    }
  }

  const wordCount = value.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount > 180) {
    findings.push({
      severity: "WARNING",
      check: "long-copy",
      description: "Long field may need editorial scannability review",
      filePath,
      line,
      fieldPath,
      excerpt: truncate(value)
    });
  }

  if (/\b(\w+)\s+\1\b/i.test(value)) {
    findings.push({
      severity: "WARNING",
      check: "repeated-word",
      description: "Repeated adjacent word",
      filePath,
      line,
      fieldPath,
      excerpt: truncate(value)
    });
  }

  return findings;
}

const allFiles = (await Promise.all(scanRoots.map(collectFiles))).flat().filter(shouldScanFile);
const allFindings = [];
let scannedStrings = 0;

for (const filePath of allFiles) {
  const source = await readFile(filePath, "utf8");
  let readerStrings = [];

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
console.log("- Blocking: placeholder copy, unresolved runtime values, internal scaffold terms, source-framework directions, and known emergency fallback wording.");
console.log("- Warnings: directional/moralizing phrasing, generic boilerplate, mechanically stitched point language, long fields, and repeated adjacent words.");

if (blockers.length > 0) {
  process.exitCode = 1;
}
