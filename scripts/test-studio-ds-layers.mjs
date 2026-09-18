import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = "apps/admin/src/studio-ds";
const theme = await readFile("apps/admin/src/admin-theme.css", "utf8");
const recipes = await readFile(path.join(root, "recipes.ts"), "utf8");

assert.doesNotMatch(recipes, /<\w/, "Recipes must not contain JSX");
assert.doesNotMatch(theme, /Inter|Manrope|JetBrains Mono/, "Studio tokens must not import Ghost fonts");
assert.match(theme, /--workspace-canvas:\s*light-dark\(#f4f4f5,\s*#111213\)/i, "Default Studio chrome must stay black-and-white");
assert.match(theme, /\[data-studio-palette="green"\][\s\S]*--workspace-primary:\s*light-dark\(#006b5b,\s*#59dbc1\)/i, "Green chrome must remain a selectable alternative");

const themeModule = await readFile("apps/admin/src/studioTheme.ts", "utf8");
assert.match(themeModule, /StudioPalette = "neutral" \| "green"/, "Studio palette must be an explicit chrome choice");
assert.match(themeModule, /tldrastro:studio-palette/, "Green chrome must persist separately from light/dark");

const aliases = [
  ["--studio-surface-page", "--workspace-canvas"],
  ["--studio-surface-panel", "--workspace-surface"],
  ["--studio-surface-elevated", "--workspace-raised"],
  ["--studio-surface-overlay", "--workspace-surface-highest"],
  ["--studio-preview-canvas", "--workspace-canvas"],
  ["--studio-text-primary", "--workspace-ink"],
  ["--studio-text-secondary", "--workspace-muted"],
  ["--studio-border-default", "--workspace-line"],
  ["--studio-border-strong", "--workspace-line-strong"],
  ["--studio-table-row-hover", "--workspace-hover"],
  ["--studio-table-row-selected", "--workspace-selected"],
  ["--studio-control-height", "--studio-button-height"]
];

for (const [alias, source] of aliases) {
  const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedSource = source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert.match(
    theme,
    new RegExp(`${escapedAlias}\\s*:\\s*var\\(${escapedSource}\\)`),
    `${alias} must alias ${source}`
  );
}

function bannedImport(source, layer, banned) {
  for (const match of source.matchAll(/from\s+["']([^"']+)["']/g)) {
    const spec = match[1];
    for (const name of banned) {
      if (spec.includes(`/studio-ds/${name}`) || spec === `./${name}` || spec.startsWith(`./${name}.`)) {
        throw new Error(`${layer} must not import ${name}: ${spec}`);
      }
    }
  }
}

const primitiveSource = await readFile(path.join(root, "primitives.tsx"), "utf8");
bannedImport(primitiveSource, "primitives", ["components", "recipes", "patterns", "page-templates"]);

bannedImport(recipes, "recipes", ["patterns", "page-templates", "components", "primitives"]);

const componentSource = await readFile(path.join(root, "components.ts"), "utf8");
bannedImport(componentSource, "components", ["patterns", "page-templates"]);

const patternSource = await readFile(path.join(root, "patterns.tsx"), "utf8");
bannedImport(patternSource, "patterns", ["page-templates"]);

assert.match(await readFile(path.join(root, "page-templates.tsx"), "utf8"), /function ListPage/);
assert.match(primitiveSource, /export function Stack/);
assert.match(componentSource, /StudioButton/);
assert.match(patternSource, /MetricCard/);

async function collect(directory) {
  const collected = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) collected.push(...await collect(file));
    else if (/\.[jt]sx?$/.test(entry.name)) collected.push(file);
  }
  return collected;
}

const layerFiles = await collect(root);
assert.equal(layerFiles.length, 6, `Studio-ds must keep the six Shade layer files, found ${layerFiles.length}`);

console.log(`Studio design-system layers passed: ${aliases.length} Shade-shaped token aliases on the reviewed Studio palette.`);
