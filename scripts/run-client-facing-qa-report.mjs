#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const reportDir = path.join(process.cwd(), "test-results", "client-facing-qa-report");
const generatedAt = new Date();

const suites = [
  {
    name: "Client-facing user flows",
    description: "Navigation, profile, friends, settings, persistence, light/dark visual flow, and error-state flows.",
    command: "npx",
    args: [
      "playwright",
      "test",
      "-c",
      "playwright.config.ts",
      "tests/visual/client-facing-user-flows.spec.ts",
      "--grep-invert",
      "content fallback copy|directional copy"
    ],
    logFile: "client-facing-user-flows.log"
  },
  {
    name: "Content and fallback copy QA",
    description: "Reader-facing copy, placeholder leakage, and directional scaffold-copy checks.",
    command: "npx",
    args: [
      "playwright",
      "test",
      "-c",
      "playwright.config.ts",
      "tests/visual/client-facing-user-flows.spec.ts",
      "-g",
      "content fallback copy|directional copy"
    ],
    logFile: "content-fallback-copy.log"
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

const parsePlaywrightSummary = (output) => ({
  passed: countMatches(output, /(\d+)\s+passed/g),
  failed: countMatches(output, /(\d+)\s+failed/g),
  skipped: countMatches(output, /(\d+)\s+skipped/g)
});

const failureLines = (output) =>
  output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.includes("✘") || /^\d+\)/.test(line))
    .slice(0, 12);

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
        summary: parsePlaywrightSummary(cleanOutput),
        failures: failureLines(cleanOutput),
        output: cleanOutput
      });
    });
  });

const markdownTableRow = (result) => {
  const { passed, failed, skipped } = result.summary;
  return `| ${result.name} | ${result.status} | ${passed} | ${failed} | ${skipped} | \`${result.logFile}\` |`;
};

const buildReport = (results) => {
  const hasOpenFindings = results.some((result) => result.exitCode !== 0);
  const lines = [
    "# Client-Facing QA Report",
    "",
    `Generated: ${generatedAt.toISOString()}`,
    `Status: ${hasOpenFindings ? "OPEN FINDINGS" : "PASS"}`,
    "",
    "## Summary",
    "",
    "| Suite | Status | Passed | Failed | Skipped | Log |",
    "| --- | --- | ---: | ---: | ---: | --- |",
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
    lines.push("- None detected in this run.");
  } else {
    for (const result of failingResults) {
      lines.push(`- ${result.name} reported open findings.`);
      for (const failure of result.failures) {
        lines.push(`  - ${failure}`);
      }
    }

    lines.push(
      "- Known content bugs are documented in `docs/qa/content-fallback-copy-bug-report.md`.",
      "- The full case-study catalog is documented in `docs/qa/client-facing-user-flow-case-studies.md`."
    );
  }

  lines.push(
    "",
    "## Artifacts",
    "",
    "- Playwright artifacts: `test-results/playwright/`",
    "- Theme flow screenshots: `test-results/client-facing-theme-flow/`",
    "- Responsive viewport screenshots: `test-results/client-facing-responsive-flow/`",
    "- Suite logs: `test-results/client-facing-qa-report/`",
    "",
    "## QA Notes",
    "",
    "This report command completes even when QA finds content issues, so the markdown report is always written. Treat any `OPEN FINDINGS` suite as red for release until the linked bugs are fixed or explicitly waived."
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

console.log(`\nQA report written to ${reportPath}`);
console.log(results.some((result) => result.exitCode !== 0) ? "Status: OPEN FINDINGS" : "Status: PASS");
