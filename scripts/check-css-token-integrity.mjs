#!/usr/bin/env node

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const webSourceRoot = path.join(repoRoot, "apps/web/src");
const sourceRoots = [webSourceRoot, path.join(repoRoot, "apps/admin/src")];
const sourceExtensions = new Set([".css", ".js", ".jsx", ".ts", ".tsx"]);

async function collectSourceFiles(directory) {
  const entries = await readdir(directory);
  const files = [];

  for (const entry of entries) {
    const absolute = path.join(directory, entry);
    const entryStat = await stat(absolute);

    if (entryStat.isDirectory()) {
      files.push(...await collectSourceFiles(absolute));
    } else if (sourceExtensions.has(path.extname(entry))) {
      files.push(absolute);
    }
  }

  return files;
}

function lineNumber(source, index) {
  return source.slice(0, index).split("\n").length;
}

function customPropertyDefinitions(source) {
  const definitions = new Set();
  const cssDefinitionPattern = /^\s*(--[\w-]+)\s*:/gmu;
  const objectDefinitionPattern = /["'](--[\w-]+)["']\s*:/gu;

  for (const pattern of [cssDefinitionPattern, objectDefinitionPattern]) {
    for (const match of source.matchAll(pattern)) {
      definitions.add(match[1]);
    }
  }

  return definitions;
}

function matchingParenthesis(source, openingIndex) {
  let depth = 0;

  for (let index = openingIndex; index < source.length; index += 1) {
    if (source[index] === "(") depth += 1;
    if (source[index] === ")") depth -= 1;
    if (depth === 0) return index;
  }

  return -1;
}

function hasTopLevelFallback(expression) {
  let depth = 0;

  for (const character of expression) {
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    if (character === "," && depth === 0) return true;
  }

  return false;
}

function customPropertyUsages(source, file) {
  const usages = [];
  const usagePattern = /var\(\s*(--[\w-]+)/gu;

  for (const match of source.matchAll(usagePattern)) {
    const openingIndex = source.indexOf("(", match.index);
    const closingIndex = matchingParenthesis(source, openingIndex);
    const expression = closingIndex === -1
      ? source.slice(openingIndex + 1)
      : source.slice(openingIndex + 1, closingIndex);

    usages.push({
      name: match[1],
      file,
      line: lineNumber(source, match.index),
      hasFallback: hasTopLevelFallback(expression)
    });
  }

  return usages;
}

function hardcodedColorUsages(source, file) {
  if (file.endsWith("/styles/theme.css") || file.endsWith("/admin-tokens.css")) return [];

  const usages = [];
  const colorPattern = /#[\da-f]{3,8}\b|(?:rgb|hsl)a?\(|okl(?:ch|ab)\(/giu;

  for (const match of source.matchAll(colorPattern)) {
    usages.push({
      file,
      line: lineNumber(source, match.index),
      value: match[0]
    });
  }

  return usages;
}

function blockContents(source, selector) {
  const selectorIndex = source.indexOf(selector);
  const openingIndex = source.indexOf("{", selectorIndex);
  const closingIndex = matchingParenthesis(
    source.replaceAll("{", "(").replaceAll("}", ")"),
    openingIndex
  );

  if (selectorIndex === -1 || openingIndex === -1 || closingIndex === -1) {
    throw new Error(`Could not read CSS token block for ${selector}.`);
  }

  return source.slice(openingIndex + 1, closingIndex);
}

function tokenValues(block) {
  const values = new Map();
  const declarationPattern = /(--[\w-]+)\s*:\s*([^;]+);/gu;

  for (const match of block.matchAll(declarationPattern)) {
    values.set(match[1], match[2].trim());
  }

  return values;
}

function resolveHexColor(name, tokens, seen = new Set()) {
  if (seen.has(name)) return null;
  seen.add(name);

  const value = tokens.get(name);
  if (!value) return null;

  const hex = value.match(/^#([\da-f]{3}|[\da-f]{6})$/iu)?.[1];
  if (hex) {
    return hex.length === 3
      ? hex.split("").map((character) => `${character}${character}`).join("")
      : hex;
  }

  const alias = value.match(/^var\((--[\w-]+)\)$/u)?.[1];
  return alias ? resolveHexColor(alias, tokens, seen) : null;
}

function relativeLuminance(hex) {
  const channels = hex.match(/[\da-f]{2}/giu).map((channel) => Number.parseInt(channel, 16) / 255);
  const linear = channels.map((channel) => (
    channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  ));

  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(firstHex, secondHex) {
  const first = relativeLuminance(firstHex);
  const second = relativeLuminance(secondHex);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

async function textContrastFindings() {
  const themeSource = await readFile(path.join(webSourceRoot, "styles/theme.css"), "utf8");
  const lightTokens = tokenValues(blockContents(themeSource, ":root"));
  const darkTokens = new Map([
    ...lightTokens,
    ...tokenValues(blockContents(themeSource, ".theme-dark,"))
  ]);
  const contracts = ["--ink", "--ink-2", "--muted", "--faint"];
  const findings = [];

  for (const [theme, tokens] of [["light", lightTokens], ["dark", darkTokens]]) {
    const surface = resolveHexColor("--surface", tokens);

    for (const token of contracts) {
      const foreground = resolveHexColor(token, tokens);

      if (!foreground || !surface) {
        findings.push(`${theme} ${token}: color could not be resolved`);
        continue;
      }

      const ratio = contrastRatio(foreground, surface);
      if (ratio < 4.5) {
        findings.push(`${theme} ${token}: ${ratio.toFixed(2)}:1 is below 4.5:1`);
      }
    }
  }

  const adminTokenSource = await readFile(path.join(repoRoot, "apps/admin/src/admin-tokens.css"), "utf8");
  const adminSource = await readFile(path.join(repoRoot, "apps/admin/src/admin.css"), "utf8");
  const adminTokens = new Map([
    ...tokenValues(blockContents(adminTokenSource, ":root")),
    ...tokenValues(blockContents(adminSource, ".admin-dashboard"))
  ]);
  const adminSurface = resolveHexColor("--admin-bg", adminTokens);

  for (const token of ["--admin-ink", "--admin-muted"]) {
    const foreground = resolveHexColor(token, adminTokens);

    if (!foreground || !adminSurface) {
      findings.push(`admin ${token}: color could not be resolved`);
      continue;
    }

    const ratio = contrastRatio(foreground, adminSurface);
    if (ratio < 4.5) {
      findings.push(`admin ${token}: ${ratio.toFixed(2)}:1 is below 4.5:1`);
    }
  }

  return findings;
}

const files = (await Promise.all(sourceRoots.map(collectSourceFiles))).flat();
const definitions = new Set();
const usages = [];
const hardcodedColors = [];

for (const file of files.sort()) {
  const source = await readFile(file, "utf8");

  for (const definition of customPropertyDefinitions(source)) {
    definitions.add(definition);
  }

  usages.push(...customPropertyUsages(source, path.relative(repoRoot, file)));
  hardcodedColors.push(...hardcodedColorUsages(source, path.relative(repoRoot, file)));
}

const unresolved = usages.filter((usage) => (
  !definitions.has(usage.name) && !usage.hasFallback
));
const optionalHooks = new Set(usages.filter((usage) => (
  !definitions.has(usage.name) && usage.hasFallback
)).map((usage) => usage.name));
const contrastFindings = await textContrastFindings();

console.log("# CSS token integrity");
console.log(`Source files scanned: ${files.length}`);
console.log(`Custom properties defined: ${definitions.size}`);
console.log(`Custom property references: ${usages.length}`);
console.log(`Optional fallback hooks: ${optionalHooks.size}`);
console.log(`Unresolved references without fallbacks: ${unresolved.length}`);
console.log(`Hardcoded colors outside designated token files: ${hardcodedColors.length}`);
console.log(`Text contrast failures: ${contrastFindings.length}`);

if (unresolved.length > 0) {
  console.error("\nUndefined CSS custom properties:");

  for (const usage of unresolved) {
    console.error(`- ${usage.file}:${usage.line} ${usage.name}`);
  }

}

if (contrastFindings.length > 0) {
  console.error("\nCSS text contrast failures:");

  for (const finding of contrastFindings) {
    console.error(`- ${finding}`);
  }
}

if (hardcodedColors.length > 0) {
  console.error("\nHardcoded colors outside designated token files:");

  for (const usage of hardcodedColors) {
    console.error(`- ${usage.file}:${usage.line} ${usage.value}`);
  }
}

if (unresolved.length > 0 || hardcodedColors.length > 0 || contrastFindings.length > 0) process.exit(1);

console.log("CSS token integrity passed.");
