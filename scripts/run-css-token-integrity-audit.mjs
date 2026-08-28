#!/usr/bin/env node

import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import postcss from "postcss";

const root = process.cwd();
const tokenThemePaths = new Set([
  "apps/web/src/styles/theme.css",
  "apps/admin/src/admin-theme.css"
]);
const cssRoots = ["apps/web/src/styles", "apps/admin/src"];
const reportDir = path.join(root, "test-results/css-audit");
const reportPath = path.join(reportDir, "token-integrity.md");

// These tokens are supplied by React/SVG at runtime or are intentionally
// component-overridable. All other unresolved references are release blockers.
const dynamicTokens = new Set([
  "--aspect-line-dash",
  "--aspect-line-stroke",
  "--ip",
  "--sunrise-orb-degrees"
]);

// Existing broad debt is tracked as a ratchet. New debt fails CI, while each
// cleanup pass lowers these budgets until they reach zero.
const debtBudgets = {
  webRawVisuals: 0,
  adminRawVisuals: 0,
  webRawColors: 0,
  adminRawColors: 0,
  webLocalTokens: 0,
  adminLocalTokens: 0
};

const rawColorPattern = /(?:#[0-9a-f]{3,8}\b|\b(?:rgb|hsl|oklab|oklch)a?\()/i;
const rawLengthPattern = /(?:^|[\s,(])(?:-?\d*\.?\d+)(?:px|rem|em|vh|vw|vmin|vmax|ch|%)\b/i;
const visualProperties = /^(?:background(?:-color)?|border(?:-(?:top|right|bottom|left))?(?:-color|-width|-radius)?|box-shadow|color|column-gap|gap|margin(?:-(?:top|right|bottom|left|inline|block))?|padding(?:-(?:top|right|bottom|left|inline|block))?|row-gap)$/;

async function collectCssFiles(directory) {
  const entries = await readdir(directory);
  const files = [];

  for (const entry of entries) {
    const absolute = path.join(directory, entry);
    const metadata = await stat(absolute);
    if (metadata.isDirectory()) files.push(...await collectCssFiles(absolute));
    else if (absolute.endsWith(".css")) files.push(absolute);
  }

  return files;
}

function hasFallback(value, token) {
  const start = value.indexOf(`var(${token}`);
  if (start < 0) return false;

  let depth = 0;
  for (let index = start + 4; index < value.length; index += 1) {
    if (value[index] === "(") depth += 1;
    if (value[index] === "," && depth === 0) return true;
    if (value[index] === ")") {
      if (depth === 0) return false;
      depth -= 1;
    }
  }
  return false;
}

function location(relative, node) {
  return `${relative}:${node.source?.start?.line ?? 1}`;
}

const files = (await Promise.all(cssRoots.map((cssRoot) => collectCssFiles(path.join(root, cssRoot)))))
  .flat()
  .filter((file, index, all) => all.indexOf(file) === index)
  .sort();
const parsedFiles = [];
const definitions = new Map();

for (const absolute of files) {
  const relative = path.relative(root, absolute);
  const source = await readFile(absolute, "utf8");
  const tree = postcss.parse(source, { from: absolute });
  parsedFiles.push({ relative, tree });
  tree.walkDecls(/^--/, (declaration) => {
    const refs = definitions.get(declaration.prop) ?? [];
    refs.push(location(relative, declaration));
    definitions.set(declaration.prop, refs);
  });
}

const unresolved = [];
const rawVisuals = [];
const localTokens = [];
const contextualTokenOverrides = [];

for (const { relative, tree } of parsedFiles) {
  tree.walkDecls((declaration) => {
    for (const match of declaration.value.matchAll(/var\((--[a-z0-9-]+)/gi)) {
      const token = match[1];
      if (definitions.has(token) || dynamicTokens.has(token) || hasFallback(declaration.value, token)) continue;
      unresolved.push({ token, where: location(relative, declaration), declaration: declaration.toString() });
    }

    if (declaration.prop.startsWith("--")) {
      if (!tokenThemePaths.has(relative) && declaration.parent?.type === "rule") {
        const entry = { token: declaration.prop, where: location(relative, declaration), value: declaration.value };
        contextualTokenOverrides.push(entry);
        if (rawColorPattern.test(declaration.value) || rawLengthPattern.test(declaration.value)) localTokens.push(entry);
      }
      return;
    }

    if (tokenThemePaths.has(relative) || !visualProperties.test(declaration.prop)) return;
    const isRawColor = rawColorPattern.test(declaration.value);
    const isRawLength = rawLengthPattern.test(declaration.value);
    if (!isRawColor && !isRawLength) return;

    rawVisuals.push({
      where: location(relative, declaration),
      property: declaration.prop,
      value: declaration.value,
      kind: isRawColor ? "color" : "length"
    });
  });
}

const webRawVisuals = rawVisuals.filter(({ where }) => where.startsWith("apps/web/")).length;
const adminRawVisuals = rawVisuals.filter(({ where }) => where.startsWith("apps/admin/")).length;
const webRawColors = rawVisuals.filter(({ where, kind }) => where.startsWith("apps/web/") && kind === "color").length;
const adminRawColors = rawVisuals.filter(({ where, kind }) => where.startsWith("apps/admin/") && kind === "color").length;
const webLocalTokens = localTokens.filter(({ where }) => where.startsWith("apps/web/")).length;
const adminLocalTokens = localTokens.filter(({ where }) => where.startsWith("apps/admin/")).length;
const budgetResults = [
  ["webRawVisuals", webRawVisuals],
  ["adminRawVisuals", adminRawVisuals],
  ["webRawColors", webRawColors],
  ["adminRawColors", adminRawColors],
  ["webLocalTokens", webLocalTokens],
  ["adminLocalTokens", adminLocalTokens]
].map(([name, count]) => ({ name, count, budget: debtBudgets[name], passed: count <= debtBudgets[name] }));

const lines = [
  "# CSS Token Integrity Audit",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  `- CSS files scanned: ${files.length}`,
  `- Tokens defined: ${definitions.size}`,
  `- Unresolved active token references: ${unresolved.length}`,
  `- Reader raw visual values: ${webRawVisuals} / ${debtBudgets.webRawVisuals}`,
  `- Admin raw visual values: ${adminRawVisuals} / ${debtBudgets.adminRawVisuals}`,
  `- Reader raw component colors: ${webRawColors} / ${debtBudgets.webRawColors}`,
  `- Admin raw component colors: ${adminRawColors} / ${debtBudgets.adminRawColors}`,
  `- Reader page-local raw token declarations: ${webLocalTokens} / ${debtBudgets.webLocalTokens}`,
  `- Admin page-local raw token declarations: ${adminLocalTokens} / ${debtBudgets.adminLocalTokens}`,
  `- Contextual token aliases and overrides: ${contextualTokenOverrides.length}`,
  "",
  "## Unresolved Tokens",
  "",
  ...(unresolved.length === 0
    ? ["- None."]
    : unresolved.map(({ token, where, declaration }) => `- ${where} \`${token}\` in \`${declaration}\``)),
  "",
  "## Debt Budgets",
  "",
  ...budgetResults.map(({ name, count, budget, passed }) => `- ${passed ? "PASS" : "FAIL"}: ${name} ${count} / ${budget}`),
  "",
  "## First 80 Raw Visual Values",
  "",
  ...rawVisuals.slice(0, 80).map(({ where, property, value, kind }) => `- ${where} [${kind}] \`${property}: ${value}\``),
  "",
  "## First 80 Page-local Raw Token Declarations",
  "",
  ...localTokens.slice(0, 80).map(({ token, where, value }) => `- ${where} \`${token}: ${value}\``)
];

await mkdir(reportDir, { recursive: true });
await writeFile(reportPath, `${lines.join("\n")}\n`);

console.log(`# CSS Token Integrity Audit
CSS files scanned: ${files.length}
Unresolved active token references: ${unresolved.length}
Reader raw visual values: ${webRawVisuals} / ${debtBudgets.webRawVisuals}
Admin raw visual values: ${adminRawVisuals} / ${debtBudgets.adminRawVisuals}
Reader raw component colors: ${webRawColors} / ${debtBudgets.webRawColors}
Admin raw component colors: ${adminRawColors} / ${debtBudgets.adminRawColors}
Reader page-local raw token declarations: ${webLocalTokens} / ${debtBudgets.webLocalTokens}
Admin page-local raw token declarations: ${adminLocalTokens} / ${debtBudgets.adminLocalTokens}
Contextual token aliases and overrides: ${contextualTokenOverrides.length}
Report: ${reportPath}`);

if (unresolved.length > 0 || budgetResults.some(({ passed }) => !passed)) process.exitCode = 1;
