import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = "apps/web/src/ds";
const theme = await readFile("apps/web/src/styles/theme.css", "utf8");
const recipes = await readFile(path.join(root, "recipes.ts"), "utf8");
const catalog = await readFile(path.join(root, "catalog.ts"), "utf8");

assert.doesNotMatch(recipes, /<\w/, "Recipes must not contain JSX");
assert.doesNotMatch(catalog, /<\w/, "Catalog must not contain JSX");
assert.doesNotMatch(theme, /Inter|Manrope|JetBrains Mono/, "Live tokens must not import Ghost or DesignMD fonts");
assert.match(catalog, /hero-section[\s\S]*use: null/, "Marketing heroes must stay out of the live catalog");
assert.match(catalog, /planLiveBuild/, "The catalog must expose a local plan_build analog");

const tokenSource = await readFile(path.join(root, "tokens.ts"), "utf8");
const aliases = [...tokenSource.matchAll(/"(--[a-z0-9-]+)": "theme\.css"/g)].map((match) => match[1]);
assert.ok(aliases.includes("--card-bg") && aliases.includes("--font-body"), "Live tokens must alias reader card and body roles");

for (const token of aliases) {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert.match(theme, new RegExp(`${escaped}\\s*:`), `${token} must exist in theme.css`);
}

function bannedImport(source, layer, banned) {
  for (const match of source.matchAll(/from\s+["']([^"']+)["']/g)) {
    const spec = match[1];
    for (const name of banned) {
      if (spec.includes(`/ds/${name}`) || spec === `./${name}` || spec.startsWith(`./${name}.`)) {
        throw new Error(`${layer} must not import ${name}: ${spec}`);
      }
    }
  }
}

const primitiveSource = await readFile(path.join(root, "primitives.tsx"), "utf8");
bannedImport(primitiveSource, "primitives", ["components", "recipes", "patterns", "page-templates", "catalog"]);
bannedImport(recipes, "recipes", ["patterns", "page-templates", "components", "primitives"]);

const componentSource = await readFile(path.join(root, "components.ts"), "utf8");
bannedImport(componentSource, "components", ["patterns", "page-templates"]);

const patternSource = await readFile(path.join(root, "patterns.tsx"), "utf8");
bannedImport(patternSource, "patterns", ["page-templates"]);

assert.match(await readFile(path.join(root, "page-templates.tsx"), "utf8"), /function ReadingPage/);
assert.match(primitiveSource, /export function Stack/);
assert.match(componentSource, /SegmentedControl/);
assert.match(patternSource, /ReadingCard/);

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
assert.equal(layerFiles.length, 7, `Live-ds must keep six layers plus catalog, found ${layerFiles.length}`);

console.log(`Live design-system layers passed: ${aliases.length} theme-backed token roles.`);
