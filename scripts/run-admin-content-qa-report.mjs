#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const reportDir = path.join(process.cwd(), "test-results", "content-dashboard-admin-qa-report");
const generatedAt = new Date();

const suites = [
  {
    name: "Content dashboard admin user flows",
    description: "Admin navigation, authoring entry points, composition tools, publish filters, and responsive dashboard checks.",
    command: "npx",
    args: [
      "playwright",
      "test",
      "-c",
      "playwright.config.ts",
      "tests/visual/content-dashboard-admin-user-flows.spec.ts"
    ],
    logFile: "content-dashboard-admin-user-flows.log"
  },
  {
    name: "Editorial writing QA",
    description: "Static scan for placeholder copy, internal scaffolding, emergency fallback leaks, directional phrasing, and mechanical boilerplate.",
    command: "node",
    args: ["scripts/run-editorial-writing-qa.mjs"],
    logFile: "editorial-writing-qa.log"
  }
];

const stripAnsi = (value) => value.replace(/\u001b\[[0-9;]*m/g, "");

const shellQuote = (value) => {
  if (/^[A-Za-z0-9_./:@=-]+$/.test(value)) {
    return value;
  }

  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
};

const commandLabel = (suite) => [suite.command, ...suite.args].map(shellQuote).join(" ");

const countMatches = (output, pattern) => {
  const matches = [...output.matchAll(pattern)];
  return matches.reduce((total, match) => total + Number(match[1]), 0);
};

const parseSummary = (suite, output) => {
  if (suite.name === "Editorial writing QA") {
    return {
      passed: output.match(/Blocking findings:\s+0\b/) ? 1 : 0,
      failed: Number(output.match(/Blocking findings:\s+(\d+)/)?.[1] ?? 0),
      skipped: 0,
      warnings: Number(output.match(/Editorial warnings:\s+(\d+)/)?.[1] ?? 0)
    };
  }

  return {
    passed: countMatches(output, /(\d+)\s+passed/g),
    failed: countMatches(output, /(\d+)\s+failed/g),
    skipped: countMatches(output, /(\d+)\s+skipped/g),
    warnings: 0
  };
};

const findingLines = (output) =>
  output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.includes("✘") || /^\d+\)/.test(line) || line.startsWith("- [BLOCKER]"))
    .slice(0, 20);

const runSuite = async (suite) =>
  new Promise((resolve) => {
    const child = spawn(suite.command, suite.args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let output = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      process.stdout.write(text);
      output += text;
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      process.stderr.write(text);
      output += text;
    });

    child.on("close", (exitCode) => {
      const cleanOutput = stripAnsi(output);
      resolve({
        ...suite,
        commandLabel: commandLabel(suite),
        exitCode,
        status: exitCode === 0 ? "PASS" : "OPEN FINDINGS",
        summary: parseSummary(suite, cleanOutput),
        findings: findingLines(cleanOutput),
        output: cleanOutput
      });
    });
  });

const markdownTableRow = (result) => {
  const { passed, failed, skipped, warnings } = result.summary;
  return `| ${result.name} | ${result.status} | ${passed} | ${failed} | ${skipped} | ${warnings} | \`${result.logFile}\` |`;
};

const buildReport = (results) => {
  const hasOpenFindings = results.some((result) => result.exitCode !== 0);
  const warningCount = results.reduce((total, result) => total + (result.summary.warnings ?? 0), 0);
  const lines = [
    "# Content Dashboard Admin QA Report",
    "",
    `Generated: ${generatedAt.toISOString()}`,
    `Status: ${hasOpenFindings ? "OPEN FINDINGS" : "PASS"}`,
    "",
    "## Summary",
    "",
    "| Suite | Status | Passed | Failed | Skipped | Editorial Warnings | Log |",
    "| --- | --- | ---: | ---: | ---: | ---: | --- |",
    ...results.map(markdownTableRow),
    "",
    "## Commands",
    "",
    ...results.flatMap((result) => [`- ${result.name}: \`${result.commandLabel}\``]),
    "",
    "## Open Findings",
    ""
  ];

  const failingResults = results.filter((result) => result.exitCode !== 0);

  if (failingResults.length === 0) {
    lines.push("- None blocking in this run.");
  } else {
    for (const result of failingResults) {
      lines.push(`- ${result.name} reported open findings.`);
      for (const finding of result.findings) {
        lines.push(`  - ${finding}`);
      }
    }
  }

  lines.push(
    "",
    "## Editorial Review Checks",
    "",
    "- Blocking: placeholder copy, unresolved runtime values, internal scaffold terms, source-framework directions, and known emergency fallback wording.",
    "- Warning: directional or moralizing phrasing, generic boilerplate, mechanically stitched point language, long fields, and repeated adjacent words.",
    "- Relationship safety: Friends/Synastry and Composite copy should resolve authored records before emergency fallback and avoid romantic-only language outside romantic contexts.",
    "- Reader safety: public previews must not show raw template slots, database/admin terms, source snapshots, or review placeholders.",
    "",
    "## Artifacts",
    "",
    "- Playwright artifacts: `test-results/playwright/`",
    "- Admin responsive screenshots: `test-results/content-dashboard-admin-flow/`",
    "- Suite logs: `test-results/content-dashboard-admin-qa-report/`",
    "- Admin case studies: `docs/qa/content-dashboard-admin-user-flow-case-studies.md`",
    "",
    "## QA Notes",
    "",
    warningCount > 0
      ? `This run has ${warningCount} editorial warning${warningCount === 1 ? "" : "s"}. Warnings are not release-blocking by themselves, but they are the editorial read list for human review.`
      : "No editorial warnings were detected by the static scanner.",
    "This report command completes even when QA finds issues, so the markdown report is always written. Treat any `OPEN FINDINGS` suite as red for release until fixed or explicitly waived."
  );

  return `${lines.join("\n")}\n`;
};

await mkdir(reportDir, { recursive: true });

const results = [];
for (const suite of suites) {
  console.log(`\n=== ${suite.name} ===\n${commandLabel(suite)}\n`);
  const result = await runSuite(suite);
  await writeFile(path.join(reportDir, suite.logFile), result.output);
  results.push(result);
}

const report = buildReport(results);
const reportPath = path.join(reportDir, "latest.md");
await writeFile(reportPath, report);

console.log(`\nAdmin QA report written to ${reportPath}`);
console.log(results.some((result) => result.exitCode !== 0) ? "Status: OPEN FINDINGS" : "Status: PASS");
