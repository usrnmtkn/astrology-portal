#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { lintArticle } = require("./lint-placement-voice.js");

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const sourcePath = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json");
const reviewDir = path.join(repoRoot, "packages/astro-knowledge/review/sky-placement-recovery");
const historicalPath = path.join(reviewDir, "HISTORICAL-FOUR-SLOT-BUNDLE.json");
const approvalsPath = path.join(reviewDir, "OWNER-PROSE-APPROVALS.json");
const slots = ["tagline", "hook", "lived", "turn"];
const planets = ["jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "north-node", "south-node"];
const signs = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
const keyPattern = /^fallback-hook\/sky-placement-(tagline|hook|lived|turn)\/([\w-]+)\/(\w+)$/u;

function collectRows(doc) {
  const rows = new Map();
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    const match = keyPattern.exec(String(node.contentKey ?? ""));
    if (match) rows.set(`${match[2]}/${match[3]}/${match[1]}`, node);
    Object.values(node).forEach(walk);
  };
  walk(doc);
  return rows;
}

function sourceHash(copy) {
  return crypto.createHash("sha256").update(slots.map((slot) => copy[slot]).join("\n\n")).digest("hex");
}

function lint(copy, planet, sign, allowances) {
  return lintArticle({
    planet,
    sign,
    ...copy,
    allowLegacyTagline: allowances.has("allowLegacyTagline"),
    allowLegacyUntracedTiming: allowances.has("allowLegacyUntracedTiming"),
    allowLegacyPerformanceFraming: allowances.has("allowLegacyPerformanceFraming")
  }, {
    allowLegacyPunctuation: allowances.has("allowLegacyPunctuation")
  });
}

const doc = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const rows = collectRows(doc);
const historicalPages = {};
const approved = {};
const allowanceTotals = {};

for (const planet of planets) {
  for (const sign of signs) {
    const page = `${planet}/${sign}`;
    const copy = Object.fromEntries(slots.map((slot) => [slot, String(rows.get(`${page}/${slot}`)?.body_you ?? "")]));
    if (slots.some((slot) => !copy[slot].trim())) throw new Error(`${page}: incomplete four-slot page`);

    const baseline = lint(copy, planet, sign, new Set());
    const allowances = new Set();
    if (baseline.findings.some((finding) => finding.decisionId === "CF-006")) allowances.add("allowLegacyTagline");
    if (baseline.findings.some((finding) => finding.decisionId === "ED-029" || finding.decisionId === "ED-030")) allowances.add("allowLegacyPunctuation");
    if (baseline.findings.some((finding) => finding.term === "untraced-duration")) allowances.add("allowLegacyUntracedTiming");
    if (baseline.findings.some((finding) => finding.decisionId === "CF-002")) allowances.add("allowLegacyPerformanceFraming");

    const governed = lint(copy, planet, sign, allowances);
    const failures = governed.findings.filter((finding) => finding.severity === "fail");
    const harnessErrors = governed.findings.filter((finding) => finding.source === "harness");
    if (failures.length > 0 || harnessErrors.length > 0) {
      throw new Error(`${page}: unwaived findings ${[...failures, ...harnessErrors].map((finding) => finding.decisionId || finding.term).join(", ")}`);
    }

    const hash = sourceHash(copy);
    const legacyAllowances = [...allowances];
    for (const allowance of legacyAllowances) allowanceTotals[allowance] = (allowanceTotals[allowance] ?? 0) + 1;
    historicalPages[page] = {
      source_hash: hash,
      legacy_allowances: legacyAllowances,
      reason: "Owner-approved historical four-slot copy; exceptions apply only while source_hash matches."
    };
    approved[page] = {
      source_hash: hash,
      approved_by: "owner",
      approved_on: "2026-08-15",
      reference: "owner ruling: These are good enough, wire them and serve them"
    };
  }
}

const historical = {
  schema_version: 1,
  recorded_on: "2026-08-16",
  scope: "96 historical four-slot Sky Placement pages: Jupiter through the nodes plus Saturn",
  enforcement: "Exact page hash only. New or changed copy receives no legacy allowance.",
  pages: historicalPages
};
const approvals = {
  note: "Owner prose approvals for the historical Sky Placement four-slot recovery bundle. Eligibility requires a matching source_hash and a clean governed lint.",
  schema: {
    "<planet>/<sign>": {
      source_hash: "sha256 of tagline + hook + lived + turn joined by two newlines",
      approved_by: "owner",
      approved_on: "YYYY-MM-DD",
      reference: "owner ruling"
    }
  },
  approved
};

console.log(JSON.stringify({ pages: Object.keys(historicalPages).length, allowanceTotals }, null, 2));
if (process.argv.includes("--apply")) {
  fs.writeFileSync(historicalPath, `${JSON.stringify(historical, null, 2)}\n`);
  fs.writeFileSync(approvalsPath, `${JSON.stringify(approvals, null, 2)}\n`);
  console.log(`wrote ${path.relative(repoRoot, historicalPath)}`);
  console.log(`wrote ${path.relative(repoRoot, approvalsPath)}`);
}
