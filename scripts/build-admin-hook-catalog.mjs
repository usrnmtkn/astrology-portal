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
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/bundled-deferred-core-rows-v3.json"),
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/bundled-shared-placement-rows-v3.json"),
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/bundled-relationship-hook-rows-v3.json"),
  // Include the authoring source directly so held V2 rows remain visible in Content Studio
  // without becoming reader-eligible in the relationship runtime bundle.
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/source-rows/pair-daily-v2-rows.json")
];
const editorGuidanceSource = path.join(repoRoot, "apps/admin/content/fallback-hook-editor-guidance-v1.json");
const resolverEntry = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/resolver/index.browser.ts"),
  "utf8"
);
const packageVersion = resolverEntry.match(/export const PACKAGE_VERSION = "([^"]+)";/u)?.[1];
if (!packageVersion) {
  throw new Error("Could not read the fallback package version from the resolver entry point.");
}

function hookSurface(key) {
  if (key.includes("/pair-daily/")) return "friends";
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

function words(value = "") {
  return value.replace(/[-_]/gu, " ").replace(/\b\w/gu, (match) => match.toUpperCase());
}

function pairDailyLabel(key) {
  if (!key.startsWith("fallback-hook/pair-daily/")) return undefined;
  const [kind, detail, subject, variant] = key.split("/").slice(2);
  const suffix = (variant ?? subject)?.match(/^variant-(\d+)$/u)?.[1];
  const variantLabel = suffix ? ` · Variant ${suffix}` : "";
  if (kind === "v2") {
    if (detail === "headline" || detail === "move") {
      const direction = key.split("/")[6];
      return `Between You Two V2 · ${words(subject)} · ${words(variant)} · ${detail === "headline" ? "Headline" : "Useful move"} · ${direction === "you" ? "Reader direction" : "Reverse direction"}`;
    }
    if (detail === "shared-moon") {
      const piece = key.split("/")[5];
      return `Between You Two V2 · ${words(subject)} Moon · ${words(piece)}`;
    }
  }
  if (kind === "opener") return `Today between you two · ${detail === "shared-clause" ? "Shared-day opening" : "Opening"}${detail === "no-reader-handle" || subject === "no-reader-handle" ? " · Without reader handle" : detail?.startsWith("variant-") ? ` · Variant ${detail.slice(8)}` : ""}`;
  if (kind === "clause") return `Today between you two · ${detail === "house" ? `${subject}${subject === "1" ? "st" : subject === "2" ? "nd" : subject === "3" ? "rd" : "th"} House` : `${words(subject)} ${words(detail).toLowerCase()}`} · Personal daily clause${variantLabel}`;
  if (kind === "bond-clause") return `Today between you two · ${words(subject)} · ${detail === "soft" ? "Supportive" : "Challenging"} bond clause`;
  if (kind === "shared-bond") return `Today between you two · ${detail === "soft" ? "Supportive" : "Challenging"} shared-bond bridge${variantLabel}`;
  if (kind === "shared-moon") return `Today between you two · ${words(detail)} Moon bridge${variantLabel}`;
  if (kind === "close") return `Today between you two · ${words(detail)} closing advice`;
  return `Today between you two · ${[kind, detail, subject, variant].filter(Boolean).map(words).join(" · ")}`;
}

const rowsByKey = new Map();
for (const sourceFile of sourceFiles) {
  const payload = JSON.parse(fs.readFileSync(sourceFile, "utf8"));
  const hookRows = Array.isArray(payload.hookRows)
    ? payload.hookRows
    : Array.isArray(payload.rows)
      ? payload.rows
      : null;
  if (!hookRows) {
    throw new Error(`${path.relative(repoRoot, sourceFile)} does not contain hookRows or rows.`);
  }

  for (const row of hookRows) {
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
  rows: rows.map(({ key, surface }) => ({ key, surface, label: pairDailyLabel(key) }))
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
  fs.copyFileSync(editorGuidanceSource, path.join(outputRoot, "admin-fallback-hook-editor-guidance-v1.json"));
  fs.rmSync(path.join(outputRoot, "admin-source-draft-catalog-v1.json"), { force: true });
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
