#!/usr/bin/env node

import { readdir, readFile, stat, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const cssRoot = path.join(root, "apps/web/src");
const reportDir = path.join(root, "test-results/css-audit");
const reportPath = path.join(reportDir, "latest.md");

const expectedEyebrow = {
  fontFamily: "var(--label-eyebrow-font-family)",
  fontSize: "var(--label-eyebrow-font-size)",
  fontWeight: "var(--label-eyebrow-font-weight)",
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
  ".admin-nav-section-label",
  ".phone-auth-eyebrow",
  ".natal-pattern-card__activation-eyebrow",
  ".nl-eyebrow",
  ".sky-lunar-pill-copy em"
];

const typographyOnlyEyebrowSelectors = new Set([
  ".phone-auth-eyebrow",
  ".natal-pattern-card__activation-eyebrow",
  ".nl-eyebrow",
  ".sky-lunar-pill-copy em"
]);

const validEyebrowValues = {
  fontFamily: new Set([
    expectedEyebrow.fontFamily,
    "var(--label-eyebrow-font-family, var(--google-sans))"
  ]),
  fontSize: new Set([
    expectedEyebrow.fontSize,
    "var(--label-eyebrow-font-size, var(--text-section-label-size))"
  ]),
  fontWeight: new Set([
    expectedEyebrow.fontWeight,
    "var(--label-eyebrow-font-weight, var(--weight-semibold))"
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
const surfaceDeclarationPattern = /\b(?:background|background-color)\s*:\s*([^;]+)/g;
const containerDeclarationPattern = /(?:^|;)\s*(?:width|max-width)\s*:\s*([^;]+)/g;
const eyebrowSelectorPattern = /(?:^|,\s*)([^{}]*(?:\.eyebrow|\.section-label|eyebrow|section-label|\.sky-lunar-pill-copy\s+em)[^{]*)/i;
const containerSelectorPattern = /(?:page|shell|layout|container|view|panel|column|modal|popover|picker)/i;

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

function collectSurfaceFindings({ source, relative }) {
  if (path.basename(relative) === "theme.css") return [];

  const declarationFindings = [];
  let match;

  while ((match = surfaceDeclarationPattern.exec(source)) !== null) {
    const value = match[1].trim();
    if (
      /^(?:none|transparent|inherit|initial|unset|currentcolor)$/i.test(value)
      || isDesignTokenized(value)
      || !/^(?:#|rgba?\(|hsla?\(|oklch\(|oklab\()/i.test(value)
    ) {
      continue;
    }

    declarationFindings.push({
      file: relative,
      line: lineNumberFor(source, match.index),
      declaration: match[0].trim()
    });
  }

  return declarationFindings;
}

function collectContainerFindings({ source, relative }) {
  const declarationFindings = [];

  for (const block of parseRuleBlocks(source)) {
    if (!containerSelectorPattern.test(block.selector)) continue;

    let match;
    while ((match = containerDeclarationPattern.exec(block.body)) !== null) {
      const value = match[1].trim();
      const pixelValues = [...value.matchAll(/(\d+(?:\.\d+)?)px/g)]
        .map((pixelMatch) => Number.parseFloat(pixelMatch[1]));
      if (
        isDesignTokenized(value)
        || pixelValues.length === 0
        || Math.max(...pixelValues) < 280
      ) {
        continue;
      }

      declarationFindings.push({
        file: relative,
        line: lineNumberFor(source, block.index + match.index),
        declaration: match[0].replace(/^;\s*/, "").trim(),
        selector: block.selector.replace(/\s+/g, " ")
      });
    }
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
const surfaceFindings = [];
const containerFindings = [];

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
        fontFamily: declarationValue(block.body, "font-family"),
        fontSize: declarationValue(block.body, "font-size"),
        fontWeight: declarationValue(block.body, "font-weight"),
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
  if (path.basename(relative) !== "fonts.css") {
    fontWeightFindings.push(...collectFontWeightFindings({ source, relative }));
  }
  lineHeightFindings.push(...collectLineHeightFindings({ source, relative }));
  radiusFindings.push(...collectDeclarationFindings({ pattern: radiusDeclarationPattern, source, relative }));
  shadowFindings.push(...collectDeclarationFindings({ pattern: shadowDeclarationPattern, source, relative, allowZero: false }));
  trackingFindings.push(...collectDeclarationFindings({ pattern: trackingDeclarationPattern, source, relative }));
  surfaceFindings.push(...collectSurfaceFindings({ source, relative }));
  containerFindings.push(...collectContainerFindings({ source, relative }));
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

  const expectedProperties = Object.entries(expectedEyebrow).filter(([property]) => (
    !typographyOnlyEyebrowSelectors.has(target)
    || property === "fontFamily"
    || property === "fontSize"
    || property === "fontWeight"
  ));

  for (const [property, expectedValue] of expectedProperties) {
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
const topSurfaceFiles = topFilesFor(surfaceFindings);
const topContainerFiles = topFilesFor(containerFindings);

const lines = [
  "# CSS Consistency Audit",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "## Scope",
  "",
  "Audits app CSS for inconsistent labels, hardcoded visual values, raw component surfaces, and untokenized container boundaries.",
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
  `- Raw component surface declarations: ${surfaceFindings.length}`,
  `- Untokenized container boundaries: ${containerFindings.length}`,
  "",
  "## Expected Eyebrow Contract",
  "",
  `- Font family: \`${expectedEyebrow.fontFamily}\``,
  `- Font size: \`${expectedEyebrow.fontSize}\``,
  `- Font weight: \`${expectedEyebrow.fontWeight}\``,
  `- Line height: \`${expectedEyebrow.lineHeight}\``,
  `- Letter spacing: \`${expectedEyebrow.letterSpacing}\``,
  `- Margin: \`${expectedEyebrow.margin}\``,
  `- Padding: \`${expectedEyebrow.padding}\``,
  "- Text transform: uppercase",
  "- Compact/auth variants share the family, size, and weight tokens while retaining their component-specific rhythm.",
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
  "## Highest Surface Ownership Debt",
  "",
  ...topSurfaceFiles.map((entry) => `- ${entry.file}: ${entry.count} raw component surface declarations`),
  "",
  "## Highest Container Token Debt",
  "",
  ...topContainerFiles.map((entry) => `- ${entry.file}: ${entry.count} untokenized container boundaries`),
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
  "## First 40 Raw Component Surface Findings",
  "",
  ...surfaceFindings.slice(0, 40).map((finding) => `- ${finding.file}:${finding.line} \`${finding.declaration}\``),
  "",
  "## First 40 Untokenized Container Findings",
  "",
  ...containerFindings.slice(0, 40).map((finding) => `- ${finding.file}:${finding.line} \`${finding.selector}\` → \`${finding.declaration}\``),
  "",
  "## Recommended Fix Order",
  "",
  "1. Keep shared page and component boundaries behind the `--container-*` scale.",
  "2. Keep card and panel colors behind semantic surface tokens rather than component-local colors.",
  "3. Keep repeated padding and margin values behind page, section, card, row, and compact/mobile tokens.",
  "4. Leave one-off optical offsets only when the selector name documents the exception, such as glyph alignment.",
  "5. Maintain desktop, mobile, light, and dark visual coverage for all client-facing surfaces."
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
Raw component surface declarations: ${surfaceFindings.length}
Untokenized container boundaries: ${containerFindings.length}
Report: ${reportPath}`);
