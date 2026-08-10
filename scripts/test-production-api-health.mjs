import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiLibRoot = path.join(repoRoot, "api", "_lib");
const runtimeTypeScriptImports = [];

for (const fileName of fs.readdirSync(apiLibRoot).filter((name) => name.endsWith(".ts")).sort()) {
  const source = fs.readFileSync(path.join(apiLibRoot, fileName), "utf8");
  const staticImportPattern = /\b(?:import|export)\s+([^;]*?)\s+from\s+["'](\.[^"']+\.ts)["'];/gu;
  const dynamicImportPattern = /\bimport\(\s*["'](\.[^"']+\.ts)["']\s*\)/gu;

  for (const match of source.matchAll(staticImportPattern)) {
    const statement = match[0].trim();
    if (/^(?:import|export)\s+type\b/u.test(statement)) continue;
    runtimeTypeScriptImports.push(`${fileName}: ${match[2]}`);
  }

  for (const match of source.matchAll(dynamicImportPattern)) {
    runtimeTypeScriptImports.push(`${fileName}: ${match[1]}`);
  }
}

assert.deepEqual(
  runtimeTypeScriptImports,
  [],
  `Runtime API imports must use emitted .js specifiers:\n${runtimeTypeScriptImports.join("\n")}`
);

const buildRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tldrastro-production-health-"));
const bundledHealthPath = path.join(buildRoot, "health.mjs");

const buildResult = await build({
  entryPoints: [path.join(repoRoot, "api", "health.ts")],
  outfile: bundledHealthPath,
  bundle: true,
  format: "esm",
  platform: "node",
  packages: "external",
  metafile: true,
  logLevel: "silent"
});

const bundledInputs = new Set(Object.keys(buildResult.metafile.inputs));
for (const requiredInput of [
  "api/health.ts",
  "api/_lib/content-generation.ts",
  "api/_lib/report-generation.ts",
  "api/_lib/report-owner-comparison.ts"
]) {
  assert.equal(
    bundledInputs.has(requiredInput),
    true,
    `Production health import graph is missing ${requiredInput}.`
  );
}

const healthSource = fs.readFileSync(path.join(repoRoot, "api", "health.ts"), "utf8");
assert.match(healthSource, /import\("\.\/_lib\/content-generation\.js"\)/u);
assert.match(healthSource, /sendJson\(res, ok \? 200 : 503,/u);

fs.rmSync(buildRoot, { recursive: true, force: true });

console.log("Production API health import graph checks passed.");
