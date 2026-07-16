#!/usr/bin/env node

import { readdir, readFile, stat, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const cssRoot = path.join(root, "apps/web/src");
const reportDir = path.join(root, "test-results/css-audit");
const reportPath = path.join(reportDir, "latest.md");

const expectedEyebrow = {
  fontSize: "var(--text-section-label-size)",
  lineHeight: "var(--leading-label)",
  letterSpacing: "var(--tracking-label)",
  margin: "0",
  padding: "0"
};

const canonicalEyebrowSelectors = [
  ".eyebrow",
  ".section-label",
  ".aspect-section-label",
  ".friend-section-label",
  ".placements-heading .eyebrow",
  ".lunar-selected-card__eyebrow",
  ".settings-group-label",
  ".article-eyebrow",
  ".article-section__eyebrow",
  ".admin-eyebrow",
  ".admin-nav-section-label"
];

const validEyebrowValues = {
  fontSize: new Set([
    expectedEyebrow.fontSize,
    "var(--label-eyebrow-font-size)",
    "var(--label-eyebrow-font-size, var(--text-section-label-size))"
  ]),
  lineHeight: new Set([
    expectedEyebrow.lineHeight,
    "var(--label-eyebrow-line-height)",
    "var(--label-eyebrow-line-height, var(--leading-label))"
  ]),
  letterSpacing: new Set([
    expectedEyebrow.letterSpacing,
    "var(--label-eyebrow-tracking)",
    "var(--label-eyebrow-tracking, var(--tracking-label))"
  ]),
  margin: new Set([
    expectedEyebrow.margin,
    "var(--label-eyebrow-margin)",
    "var(--label-eyebrow-margin, 0)"
  ]),
  padding: new Set([
    expectedEyebrow.padding,
    "var(--label-eyebrow-padding)",
    "var(--label-eyebrow-padding, 0)"
  ])
};

const spacingDeclarationPattern = /\b(?:margin|margin-(?:top|right|bottom|left|inline|block)|padding|padding-(?:top|right|bottom|left|inline|block))\s*:\s*([^;]+)/g;
const fontSizeDeclarationPattern = /\bfont-size\s*:\s*([^;]+)/g;
const fontWeightDeclarationPattern = /\bfont-weight\s*:\s*([^;]+)/g;
const lineHeightDeclarationPattern = /\bline-height\s*:\s*([^;]+)/g;
const radiusDeclarationPattern = /\bborder-radius\s*:\s*([^;]+)/g;
const shadowDeclarationPattern = /\bbox-shadow\s*:\s*([^;]+)/g;
const trackingDeclarationPattern = /\bletter-spacing\s*:\s*([^;]+)/g;
const eyebrowSelectorPattern = /(?:^|,\s*)([^{}]*(?:\.eyebrow|\.section-label|eyebrow|section-label)[^{]*)/i;

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

function declarationValue(body, property) {
  const match = body.match(new RegExp(`${property}\\s*:\\s*([^;]+)`));
  return match?.[1]?.trim() ?? null;
}

function isDesignTokenized(value) {
  return value === null || value === "0" || value.includes("var(") || value.includes("clamp(") || value.includes("calc(") || value.includes("color-mix(");
}

function isRawNumericValue(value) {
  return /\d+(?:px|rem|em|vh|vw|%)/.test(value);
}

function collectDeclarationFindings({ pattern, source, relative, allowZero = true }) {
  const declarationFindings = [];
  let match;

  while ((match = pattern.exec(source)) !== null) {
    const value = match[1].trim();
    if ((allowZero && value === "0") || isDesignTokenized(value) || !isRawNumericValue(value)) continue;

    declarationFindings.push({
      file: relative,
      line: lineNumberFor(source, match.index),
      declaration: match[0].trim()
    });
  }

  return declarationFindings;
}

function collectLineHeightFindings({ source, relative }) {
  const declarationFindings = [];
  let match;

  while ((match = lineHeightDeclarationPattern.exec(source)) !== null) {
    const value = match[1].trim();
    if (isDesignTokenized(value) || value === "normal" || value === "inherit") continue;
    if (!/^\d+(?:\.\d+)?$/.test(value) && !isRawNumericValue(value)) continue;

    declarationFindings.push({
      file: relative,
      line: lineNumberFor(source, match.index),
      declaration: match[0].trim()
    });
  }

  return declarationFindings;
}

function collectFontWeightFindings({ source, relative }) {
  const declarationFindings = [];
  let match;

  while ((match = fontWeightDeclarationPattern.exec(source)) !== null) {
    const value = match[1].trim();
    if (isDesignTokenized(value) || /^(normal|bold|bolder|lighter|inherit)$/.test(value)) continue;
    if (!/^\d+$/.test(value)) continue;

    declarationFindings.push({
      file: relative,
      line: lineNumberFor(source, match.index),
      declaration: match[0].trim()
    });
  }

  return declarationFindings;
}

function topFilesFor(declarationFindings, limit = 12) {
  const filesWithDebt = new Set(declarationFindings.map((finding) => finding.file));

  return [...filesWithDebt]
    .map((file) => ({
      file,
      count: declarationFindings.filter((finding) => finding.file === file).length
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

const files = await collectCssFiles(cssRoot);
files.sort((first, second) => {
  const firstName = path.basename(first);
  const secondName = path.basename(second);
  if (firstName === "consistency.css") return 1;
  if (secondName === "consistency.css") return -1;
  if (firstName === "admin.css") return 1;
  if (secondName === "admin.css") return -1;
  return first.localeCompare(second);
});
const findings = [];
const eyebrowRules = [];
const activeEyebrowRules = new Map();
const spacingFindings = [];
const fontSizeFindings = [];
const fontWeightFindings = [];
const lineHeightFindings = [];
const radiusFindings = [];
const shadowFindings = [];
const trackingFindings = [];

function selectorTargetsCanonical(selector, target) {
  if (selector.includes(`:not(${target})`)) return false;
  return selector.includes(target);
}

function validValue(property, value) {
  if (!value) return true;
  return validEyebrowValues[property].has(value);
}

for (const filePath of files) {
  const source = await readFile(filePath, "utf8");
  const relative = path.relative(root, filePath);

  for (const block of parseRuleBlocks(source)) {
    if (eyebrowSelectorPattern.test(block.selector)) {
      const rule = {
        file: relative,
        line: lineNumberFor(source, block.index),
        selector: block.selector.replace(/\s+/g, " "),
        fontSize: declarationValue(block.body, "font-size"),
        lineHeight: declarationValue(block.body, "line-height"),
        letterSpacing: declarationValue(block.body, "letter-spacing"),
        margin: declarationValue(block.body, "margin"),
        padding: declarationValue(block.body, "padding")
      };

      eyebrowRules.push(rule);

      for (const target of canonicalEyebrowSelectors) {
        if (!selectorTargetsCanonical(rule.selector, target)) continue;

        activeEyebrowRules.set(target, {
          ...(activeEyebrowRules.get(target) ?? {}),
          ...Object.fromEntries(
            Object.entries(rule).filter(([, value]) => value !== null)
          )
        });
      }
    }
  }

  spacingFindings.push(...collectDeclarationFindings({ pattern: spacingDeclarationPattern, source, relative }));
  fontSizeFindings.push(...collectDeclarationFindings({ pattern: fontSizeDeclarationPattern, source, relative }));
  fontWeightFindings.push(...collectFontWeightFindings({ source, relative }));
  lineHeightFindings.push(...collectLineHeightFindings({ source, relative }));
  radiusFindings.push(...collectDeclarationFindings({ pattern: radiusDeclarationPattern, source, relative }));
  shadowFindings.push(...collectDeclarationFindings({ pattern: shadowDeclarationPattern, source, relative, allowZero: false }));
  trackingFindings.push(...collectDeclarationFindings({ pattern: trackingDeclarationPattern, source, relative }));
}

for (const target of canonicalEyebrowSelectors) {
  const rule = activeEyebrowRules.get(target);

  if (!rule) {
    findings.push({
      severity: "HIGH",
      type: "missing-eyebrow-contract",
      file: "apps/web/src/styles/consistency.css",
      line: 1,
      selector: target,
      detail: "No effective shared eyebrow rule was found for this selector."
    });
    continue;
  }

  for (const [property, expectedValue] of Object.entries(expectedEyebrow)) {
    const value = rule[property];
    if (validValue(property, value)) continue;

    findings.push({
      severity: property === "letterSpacing" ? "HIGH" : "MEDIUM",
      type: `eyebrow-${property}`,
      file: rule.file,
      line: rule.line,
      selector: target,
      detail: `Expected ${expectedValue}, found ${value}.`
    });
  }
}

const topSpacingFiles = topFilesFor(spacingFindings);
const topFontSizeFiles = topFilesFor(fontSizeFindings);
const topFontWeightFiles = topFilesFor(fontWeightFindings);
const topLineHeightFiles = topFilesFor(lineHeightFindings);
const topRadiusFiles = topFilesFor(radiusFindings);
const topShadowFiles = topFilesFor(shadowFindings);
const topTrackingFiles = topFilesFor(trackingFindings);

const lines = [
  "# CSS Consistency Audit",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "## Scope",
  "",
  "Audits app CSS for inconsistent eyebrow labels, hardcoded spacing, and hardcoded tracking that should move behind shared design tokens.",
  "",
  "## Summary",
  "",
  `- CSS files scanned: ${files.length}`,
  `- Eyebrow/section-label rules found: ${eyebrowRules.length}`,
  `- Eyebrow rule mismatches: ${findings.length}`,
  `- Hardcoded spacing declarations: ${spacingFindings.length}`,
  `- Hardcoded font-size declarations: ${fontSizeFindings.length}`,
  `- Hardcoded font-weight declarations: ${fontWeightFindings.length}`,
  `- Hardcoded line-height declarations: ${lineHeightFindings.length}`,
  `- Hardcoded border-radius declarations: ${radiusFindings.length}`,
  `- Hardcoded box-shadow declarations: ${shadowFindings.length}`,
  `- Hardcoded non-token letter-spacing declarations: ${trackingFindings.length}`,
  "",
  "## Expected Eyebrow Contract",
  "",
  `- Font size: \`${expectedEyebrow.fontSize}\``,
  `- Line height: \`${expectedEyebrow.lineHeight}\``,
  `- Letter spacing: \`${expectedEyebrow.letterSpacing}\``,
  `- Margin: \`${expectedEyebrow.margin}\``,
  `- Padding: \`${expectedEyebrow.padding}\``,
  "- Text transform: uppercase",
  "- Font family: `var(--font-label)`",
  "- Font weight: `var(--weight-semibold)`",
  "",
  "## Eyebrow Findings",
  ""
];

if (findings.length === 0) {
  lines.push("- No eyebrow mismatches detected.");
} else {
  for (const finding of findings.slice(0, 40)) {
    lines.push(`- [${finding.severity}] \`${finding.type}\` ${finding.file}:${finding.line}`);
    lines.push(`  - Selector: \`${finding.selector}\``);
    lines.push(`  - ${finding.detail}`);
  }
  if (findings.length > 40) {
    lines.push(`- ${findings.length - 40} additional eyebrow findings omitted.`);
  }
}

lines.push(
  "",
  "## Highest Spacing Debt",
  "",
  ...topSpacingFiles.map((entry) => `- ${entry.file}: ${entry.count} hardcoded spacing declarations`),
  "",
  "## Highest Font Size Debt",
  "",
  ...topFontSizeFiles.map((entry) => `- ${entry.file}: ${entry.count} hardcoded font-size declarations`),
  "",
  "## Highest Font Weight Debt",
  "",
  ...topFontWeightFiles.map((entry) => `- ${entry.file}: ${entry.count} hardcoded font-weight declarations`),
  "",
  "## Highest Line Height Debt",
  "",
  ...topLineHeightFiles.map((entry) => `- ${entry.file}: ${entry.count} hardcoded line-height declarations`),
  "",
  "## Highest Radius Debt",
  "",
  ...topRadiusFiles.map((entry) => `- ${entry.file}: ${entry.count} hardcoded border-radius declarations`),
  "",
  "## Highest Shadow Debt",
  "",
  ...topShadowFiles.map((entry) => `- ${entry.file}: ${entry.count} hardcoded box-shadow declarations`),
  "",
  "## Highest Tracking Debt",
  "",
  ...topTrackingFiles.map((entry) => `- ${entry.file}: ${entry.count} hardcoded non-token letter-spacing declarations`),
  "",
  "## First 40 Hardcoded Spacing Findings",
  "",
  ...spacingFindings.slice(0, 40).map((finding) => `- ${finding.file}:${finding.line} \`${finding.declaration}\``),
  "",
  "## First 40 Hardcoded Font Size Findings",
  "",
  ...fontSizeFindings.slice(0, 40).map((finding) => `- ${finding.file}:${finding.line} \`${finding.declaration}\``),
  "",
  "## First 40 Hardcoded Font Weight Findings",
  "",
  ...fontWeightFindings.slice(0, 40).map((finding) => `- ${finding.file}:${finding.line} \`${finding.declaration}\``),
  "",
  "## First 40 Hardcoded Line Height Findings",
  "",
  ...lineHeightFindings.slice(0, 40).map((finding) => `- ${finding.file}:${finding.line} \`${finding.declaration}\``),
  "",
  "## First 40 Hardcoded Radius Findings",
  "",
  ...radiusFindings.slice(0, 40).map((finding) => `- ${finding.file}:${finding.line} \`${finding.declaration}\``),
  "",
  "## First 40 Hardcoded Shadow Findings",
  "",
  ...shadowFindings.slice(0, 40).map((finding) => `- ${finding.file}:${finding.line} \`${finding.declaration}\``),
  "",
  "## First 40 Hardcoded Tracking Findings",
  "",
  ...trackingFindings.slice(0, 40).map((finding) => `- ${finding.file}:${finding.line} \`${finding.declaration}\``),
  "",
  "## Recommended Fix Order",
  "",
  "1. Create a single semantic label utility for `.eyebrow`, `.section-label`, `.aspect-section-label`, `.friend-section-label`, and calendar/admin eyebrow variants.",
  "2. Add semantic spacing tokens for page gutters, section gaps, card padding, row padding, and compact/mobile variants.",
  "3. Replace local pixel padding/margin on repeated card and section surfaces with those tokens.",
  "4. Leave one-off optical offsets only when the selector name documents the exception, such as glyph alignment.",
  "5. Add a visual regression test that captures Sky, You, Friends detail, Calendar, Settings, and Admin at desktop/mobile widths."
);

await mkdir(reportDir, { recursive: true });
await writeFile(reportPath, `${lines.join("\n")}\n`);

console.log(`# CSS Consistency Audit
CSS files scanned: ${files.length}
Eyebrow/section-label rules found: ${eyebrowRules.length}
Eyebrow rule mismatches: ${findings.length}
Hardcoded spacing declarations: ${spacingFindings.length}
Hardcoded font-size declarations: ${fontSizeFindings.length}
Hardcoded font-weight declarations: ${fontWeightFindings.length}
Hardcoded line-height declarations: ${lineHeightFindings.length}
Hardcoded border-radius declarations: ${radiusFindings.length}
Hardcoded box-shadow declarations: ${shadowFindings.length}
Hardcoded non-token letter-spacing declarations: ${trackingFindings.length}
Report: ${reportPath}`);
