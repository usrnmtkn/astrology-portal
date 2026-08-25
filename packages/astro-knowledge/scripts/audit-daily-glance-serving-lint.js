#!/usr/bin/env node
"use strict";

// Deterministic only. This script never loads credentials, calls a model, or
// mutates serving rows/review_status values. --write-report writes review artifacts.
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { scheduledCandidateConfig, servingPairs } = require("./audit-daily-glance-voice.js");
const {
  batchLint,
  lintOutput,
  lintTierForRule
} = require("./daily-glance-writer-runtime.js");
const { EFFECTIVE_RULE_REGISTRY } = require("../../../src/astro-writing/effectiveRules.cjs");

const packageRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(packageRoot, "..", "..");
const dateKey = new Date().toISOString().slice(0, 10);
const sourceRowsPath = path.join(repoRoot, "apps", "web", "src", "content", "fallbackArchitectureV3", "source-rows", "fallback-source-rows-v3.json");
const reportJsonPath = path.join(packageRoot, "review", `daily-glance-writer-lint-recalibration-${dateKey}.json`);
const reportMarkdownPath = path.join(packageRoot, "review", `daily-glance-writer-lint-recalibration-${dateKey}.md`);

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function buildServingLintReport() {
  const sourceBytes = fs.readFileSync(sourceRowsPath);
  const sourceRows = JSON.parse(sourceBytes.toString("utf8"));
  const pairs = servingPairs(sourceRows);
  const unapproved = pairs.filter((pair) => pair.headlineStatus !== "approved" || pair.bodyStatus !== "approved");
  if (unapproved.length) throw new Error(`Expected 68 owner-approved serving pairs; non-approved: ${unapproved.map((pair) => pair.key).join(", ")}`);

  const config = scheduledCandidateConfig(pairs.map((pair) => pair.key));
  const rows = pairs.map((pair) => ({
    key: pair.key,
    lint: lintOutput({ headline: pair.headline, body: pair.body }, pair.key, config)
  }));
  const ruleIds = rows[0].lint.checks.map((check) => check.id);
  const ruleStats = ruleIds.map((id) => {
    const failures = rows.filter((row) => !row.lint.checks.find((check) => check.id === id).passed).length;
    return { id, failures, failureRate: failures / pairs.length, tier: lintTierForRule(id) };
  });
  const blockingFailures = rows
    .map((row) => ({
      key: row.key,
      failedRules: row.lint.checks.filter((check) => !check.passed && check.tier === "blocking").map((check) => check.id)
    }))
    .filter((row) => row.failedRules.length);
  const outputs = rows.map((row, index) => ({
    key: row.key,
    candidate: { headline: pairs[index].headline, body: pairs[index].body }
  }));
  const batch = batchLint(outputs, { expectedCount: 68, config });
  const batchChecks = batch.checks.map((check) => {
    if (check.id !== "OWNER-TEST-specificity-batch") return check;
    const failedKeys = check.details.filter((entry) => !entry.passed).map((entry) => entry.key);
    return {
      id: check.id,
      passed: check.passed,
      tier: check.tier,
      advisory: check.advisory,
      details: { failedCount: failedKeys.length, failedKeys }
    };
  });
  return {
    schemaVersion: 1,
    date: dateKey,
    policyId: EFFECTIVE_RULE_REGISTRY.registryId,
    sourceRowsPath: path.relative(repoRoot, sourceRowsPath),
    sourceRowsSha256: sha256(sourceBytes),
    servingPairs: pairs.length,
    approvedPairs: pairs.length - unapproved.length,
    tierPolicy: "Only factual safety, grammar, placeholder integrity, source licensing, register direction, and unsupported astrology claims block.",
    ruleStats,
    blockingTier: {
      passed: pairs.length - blockingFailures.length,
      failed: blockingFailures.length,
      passRate: (pairs.length - blockingFailures.length) / pairs.length,
      failingCards: blockingFailures
    },
    batch: {
      passed: batch.passed,
      allChecksPassed: batch.allChecksPassed,
      checks: batchChecks
    },
    modelCalls: 0,
    servingChanges: 0,
    reviewStatusChanges: 0
  };
}

function renderMarkdown(report) {
  const stats = report.ruleStats.map((rule) => `| \`${rule.id}\` | ${rule.failures}/68 | ${(rule.failureRate * 100).toFixed(1)}% | ${rule.tier} |`).join("\n");
  const failures = report.blockingTier.failingCards.map((card) => `| \`${card.key}\` | ${card.failedRules.map((rule) => `\`${rule}\``).join(", ")} |`).join("\n");
  const batch = report.batch.checks.map((check) => `| \`${check.id}\` | ${check.passed ? "pass" : "fail"} | ${check.tier} |`).join("\n");
  return [
    "# Daily-glance writer lint recalibration",
    "",
    `Date: ${report.date}`,
    `Policy: \`${report.policyId}\``,
    `Serving source SHA-256: \`${report.sourceRowsSha256}\``,
    "",
    "> Baseline: all 68 currently-serving pairs are owner-approved. Tiering comes from the effective-rule registry, not historical failure rates. Only factual safety, grammar, placeholder integrity, source licensing, register direction, and unsupported astrology claims block. No copy or review status changed, and no model was called.",
    "",
    "## Result",
    "",
    `- Blocking-tier pass rate: ${report.blockingTier.passed}/68 (${(report.blockingTier.passRate * 100).toFixed(1)}%)`,
    `- Blocking-tier failures: ${report.blockingTier.failed}`,
    "",
    "## Individual rule calibration",
    "",
    "| Rule | Failures | Rate | Tier |",
    "|---|---:|---:|---|",
    stats,
    "",
    "## Cards still failing blocking rules",
    "",
    "| Key | Blocking failures |",
    "|---|---|",
    failures,
    "",
    "## Batch rules",
    "",
    "| Rule | Observed | Tier |",
    "|---|---|---|",
    batch,
    "",
    "## Governance",
    "",
    "- Advisory failures remain in every lint report but do not make `lint.passed` false.",
    "- Blocking failures continue to discard generated candidates.",
    "- Owner approval remains authoritative; lint cannot promote or change serving content.",
    ""
  ].join("\n");
}

function main() {
  const report = buildServingLintReport();
  if (process.argv.includes("--write-report")) {
    fs.writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);
    fs.writeFileSync(reportMarkdownPath, renderMarkdown(report));
    process.stdout.write(`report=${path.relative(repoRoot, reportMarkdownPath)}\n`);
    process.stdout.write(`reportJson=${path.relative(repoRoot, reportJsonPath)}\n`);
  }
  process.stdout.write(`blockingPass=${report.blockingTier.passed}/68 rate=${(report.blockingTier.passRate * 100).toFixed(1)}% modelCalls=0\n`);
}

if (require.main === module) main();

module.exports = { buildServingLintReport, renderMarkdown };
