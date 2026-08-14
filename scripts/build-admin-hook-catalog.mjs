#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoots = [
  path.join(repoRoot, "apps/admin/public/generated"),
  path.join(repoRoot, "apps/web/public/generated")
];
const sourceFiles = [
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/bundled-sky-core-rows-v3.json"),
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/bundled-deferred-core-rows-v3.json")
];
const resolverEntry = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/resolver/index.browser.ts"),
  "utf8"
);
const packageVersion = resolverEntry.match(/export const PACKAGE_VERSION = "([^"]+)";/u)?.[1];
if (!packageVersion) {
  throw new Error("Could not read the fallback package version from the resolver entry point.");
}

function hookSurface(key) {
  if (key.includes("/friends") || key.includes("/relationship") || key.includes("/synastry") || key.includes("/composite")) return "friends";
  if (key.includes("/you") || key.includes("/natal") || key.includes("/placement") || key.includes("/aspect")) return "you";
  if (key.includes("/settings")) return "modifier";
  return "sky";
}

function hookBody(row) {
  const preferred = row.body_you ?? row.body ?? row.template ?? row.copy;
  if (typeof preferred === "string") return preferred;
  if (typeof row.body_they === "string") return row.body_they;
  return "";
}

const rowsByKey = new Map();
for (const sourceFile of sourceFiles) {
  const payload = JSON.parse(fs.readFileSync(sourceFile, "utf8"));
  if (!Array.isArray(payload.hookRows)) {
    throw new Error(`${path.relative(repoRoot, sourceFile)} does not contain hookRows.`);
  }

  for (const row of payload.hookRows) {
    const key = typeof row.contentKey === "string" ? row.contentKey : "";
    if (!key || rowsByKey.has(key)) continue;
    rowsByKey.set(key, {
      key,
      surface: hookSurface(key),
      body: hookBody(row)
    });
  }
}

const rows = [...rowsByKey.values()].sort((first, second) => first.key.localeCompare(second.key));
const indexPayload = {
  schemaVersion: 1,
  packageVersion,
  rows: rows.map(({ key, surface }) => ({ key, surface }))
};
const domainPayloads = {
  sky: { schemaVersion: 1, rows: [] },
  you: { schemaVersion: 1, rows: [] },
  friends: { schemaVersion: 1, rows: [] },
  modifier: { schemaVersion: 1, rows: [] }
};

for (const { key, surface, body } of rows) {
  domainPayloads[surface].rows.push({ key, body });
}

for (const outputRoot of outputRoots) {
  fs.mkdirSync(outputRoot, { recursive: true });
  fs.writeFileSync(
    path.join(outputRoot, "admin-hook-catalog-index-v1.json"),
    `${JSON.stringify(indexPayload)}\n`
  );
  for (const [domain, payload] of Object.entries(domainPayloads)) {
    fs.writeFileSync(
      path.join(outputRoot, `admin-hook-catalog-${domain}-v1.json`),
      `${JSON.stringify(payload)}\n`
    );
  }
}

console.log(`Built Admin hook catalog: ${rows.length} unique rows across ${Object.keys(domainPayloads).length} domain packages for ${outputRoots.length} app targets.`);
