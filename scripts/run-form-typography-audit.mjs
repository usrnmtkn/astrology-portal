#!/usr/bin/env node

import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const cssRoot = path.join(root, "apps/web/src");
const reportDir = path.join(root, "test-results/css-audit");
const reportPath = path.join(reportDir, "form-typography.md");

const formSelectorPattern = /(?:\bform\b|input|select|textarea|\.auth-label|\.signup-field|\.signup-city-search|\.field-line|\.city-search-field|\.add-chart-field|\.add-chart-city-search|\.settings-location|\.settings-theme-control|\.lunar-location-picker|\.city-suggestions|\.admin-search|\.admin-metadata-field|\.admin-title-field|\.admin-review-tldr-editor|\.admin-review-copy-editor|\.admin-template-slot-preview|\.admin-status-select|\.admin-dashboard\s+(?:input|select|textarea|label|button))/i;
const readableTextSelectorPattern = /(?:button|label|legend|span|strong|small|input|select|textarea|\.auth-label|\.settings-row__label|\.city-suggestions|\.lunar-location-picker)/i;
const rawSizeSelectorPattern = /(?:button|input|select|textarea|\.auth-label|\.signup-field|\.signup-city-search|\.field-line|\.city-search-field|\.add-chart-field|\.add-chart-city-search|\.settings-location|\.settings-theme-control|\.lunar-location-picker|\.city-suggestions|\.admin-search|\.admin-metadata-field|\.admin-title-field|\.admin-review-tldr-editor|\.admin-review-copy-editor|\.admin-template-slot-preview|\.admin-status-select)/i;
const weightPattern = /\bfont-weight\s*:\s*([^;]+)/;
const sizePattern = /\bfont-size\s*:\s*([^;]+)/;
const allowedRawSizes = new Set(["inherit"]);

async function collectCssFiles(dir) {
  const entries = await readdir(dir);
  const files = [];

  for (const entry of entries) {
    const absolute = path.join(dir, entry);
    const entryStat = await stat(absolute);

    if (entryStat.isDirectory()) {
      files.push(...await collectCssFiles(absolute));
    } else if (absolute.endsWith(".css")) {
      files.push(absolute);
    }
  }

  return files;
}

function lineNumberFor(source, index) {
  return source.slice(0, index).split("\n").length;
}

function parseRuleBlocks(source) {
  const blocks = [];
  const rulePattern = /([^{}]+)\{([^{}]+)\}/g;
  let match;

  while ((match = rulePattern.exec(source)) !== null) {
    blocks.push({
      selector: match[1].replace(/\/\*[\s\S]*?\*\//g, "").trim(),
      body: match[2],
      index: match.index
    });
  }

  return blocks;
}

function numericWeight(value) {
  const trimmed = value.trim();

  if (trimmed === "normal" || trimmed === "var(--weight-regular)") return 400;
  if (trimmed === "var(--weight-medium)") return 500;
  if (trimmed === "bold" || trimmed === "var(--weight-semibold)" || trimmed === "var(--weight-bold)") return 600;

  const numeric = Number.parseInt(trimmed, 10);
  return Number.isFinite(numeric) ? numeric : null;
}

function isTokenizedSize(value) {
  const trimmed = value.trim();

  return (
    allowedRawSizes.has(trimmed) ||
    trimmed.includes("var(") ||
    trimmed.includes("clamp(") ||
    trimmed.includes("calc(")
  );
}

const files = await collectCssFiles(cssRoot);
const findings = [];
let scannedRules = 0;

for (const filePath of files.sort()) {
  const source = await readFile(filePath, "utf8");
  const relative = path.relative(root, filePath);

  for (const block of parseRuleBlocks(source)) {
    if (!formSelectorPattern.test(block.selector)) continue;

    scannedRules += 1;
    const line = lineNumberFor(source, block.index);
    const weight = block.body.match(weightPattern)?.[1]?.trim() ?? null;
    const size = block.body.match(sizePattern)?.[1]?.trim() ?? null;

    if (weight && readableTextSelectorPattern.test(block.selector)) {
      const numeric = numericWeight(weight);

      if (numeric !== null && numeric > 500) {
        findings.push({
          type: "heavy-form-weight",
          file: relative,
          line,
          selector: block.selector.replace(/\s+/g, " "),
          detail: `font-weight: ${weight}`
        });
      }
    }

    if (size && rawSizeSelectorPattern.test(block.selector) && !isTokenizedSize(size) && /\d/.test(size)) {
      findings.push({
        type: "raw-form-font-size",
        file: relative,
        line,
        selector: block.selector.replace(/\s+/g, " "),
        detail: `font-size: ${size}`
      });
    }
  }
}

const lines = [
  "# Form Typography Audit",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "## Contract",
  "",
  "- Inputs, selects, and textareas should use `var(--weight-regular)`.",
  "- Form labels, legends, and picker/dropdown options should be no heavier than `var(--weight-medium)`.",
  "- Form font sizes should use design tokens or intentional responsive expressions, not one-off raw values.",
  "",
  "## Summary",
  "",
  `- CSS files scanned: ${files.length}`,
  `- Form-related CSS rules scanned: ${scannedRules}`,
  `- Findings: ${findings.length}`,
  "",
  "## Findings",
  ""
];

if (findings.length === 0) {
  lines.push("- No heavy form weights or raw form font sizes detected.");
} else {
  for (const finding of findings.slice(0, 80)) {
    lines.push(`- [${finding.type}] ${finding.file}:${finding.line}`);
    lines.push(`  - Selector: \`${finding.selector}\``);
    lines.push(`  - ${finding.detail}`);
  }

  if (findings.length > 80) {
    lines.push(`- ${findings.length - 80} additional findings omitted.`);
  }
}

await mkdir(reportDir, { recursive: true });
await writeFile(reportPath, `${lines.join("\n")}\n`);

console.log(`# Form Typography Audit
CSS files scanned: ${files.length}
Form-related CSS rules scanned: ${scannedRules}
Findings: ${findings.length}
Report: ${reportPath}`);
