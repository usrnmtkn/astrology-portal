#!/usr/bin/env node
import fs from "node:fs";

function replaceExact(source, from, to, label, expectedCount = 1) {
  const count = source.split(from).length - 1;
  if (count !== expectedCount) throw new Error(`${label}: expected ${expectedCount} matches, found ${count}`);
  return source.split(from).join(to);
}

const manifestPath = "scripts/generate-fallback-package-manifest.mjs";
let manifest = fs.readFileSync(manifestPath, "utf8");
manifest = replaceExact(
  manifest,
  '  const pairDailyClauses = readJson("source-rows/pair-daily-clauses-v1.json");',
  '  const pairDailyClauses = readJson("source-rows/pair-daily-clauses-v1.json");\n  const pairDailyV2Rows = readJson("source-rows/pair-daily-v2-rows.json");',
  "fullReaderBundle pair-daily V2 declaration"
);
manifest = replaceExact(
  manifest,
  'const pairDailyClauses = readJson("source-rows/pair-daily-clauses-v1.json");',
  'const pairDailyClauses = readJson("source-rows/pair-daily-clauses-v1.json");\nconst pairDailyV2Rows = readJson("source-rows/pair-daily-v2-rows.json");',
  "top-level pair-daily V2 declaration"
);
manifest = replaceExact(
  manifest,
  '        ...pairDailyClauses.rows,\n        ...skyArticleRows.hookRows,',
  '        ...pairDailyClauses.rows,\n        ...pairDailyV2Rows.rows,\n        ...skyArticleRows.hookRows,',
  "full reader V2 hook inclusion"
);
manifest = replaceExact(
  manifest,
  '    ...pairDailyFrames.rows,\n    ...pairDailyClauses.rows\n  ]),',
  '    ...pairDailyFrames.rows,\n    ...pairDailyClauses.rows,\n    ...pairDailyV2Rows.rows\n  ]),',
  "relationship V2 hook inclusion"
);
fs.writeFileSync(manifestPath, manifest);

const catalogPath = "scripts/build-admin-hook-catalog.mjs";
let catalog = fs.readFileSync(catalogPath, "utf8");
catalog = replaceExact(
  catalog,
  '  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/bundled-relationship-hook-rows-v3.json")\n];',
  '  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/bundled-relationship-hook-rows-v3.json"),\n  // Include the authoring source directly so held V2 rows remain visible in Content Studio\n  // without becoming reader-eligible in the relationship runtime bundle.\n  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/source-rows/pair-daily-v2-rows.json")\n];',
  "admin V2 source inclusion"
);
catalog = replaceExact(
  catalog,
  '  if (!Array.isArray(payload.hookRows)) {\n    throw new Error(`${path.relative(repoRoot, sourceFile)} does not contain hookRows.`);\n  }\n\n  for (const row of payload.hookRows) {',
  '  const hookRows = Array.isArray(payload.hookRows)\n    ? payload.hookRows\n    : Array.isArray(payload.rows)\n      ? payload.rows\n      : null;\n  if (!hookRows) {\n    throw new Error(`${path.relative(repoRoot, sourceFile)} does not contain hookRows or rows.`);\n  }\n\n  for (const row of hookRows) {',
  "admin source row normalization"
);
catalog = replaceExact(
  catalog,
  '  if (kind === "opener") return `Today between you two · ${detail === "shared-clause" ? "Shared-day opening" : "Opening"}${detail === "no-reader-handle" || subject === "no-reader-handle" ? " · Without reader handle" : detail?.startsWith("variant-") ? ` · Variant ${detail.slice(8)}` : ""}`;',
  '  if (kind === "v2") {\n    if (detail === "headline" || detail === "move") {\n      const direction = key.split("/")[6];\n      return `Between You Two V2 · ${words(subject)} · ${words(variant)} · ${detail === "headline" ? "Headline" : "Useful move"} · ${direction === "you" ? "Reader direction" : "Reverse direction"}`;\n    }\n    if (detail === "shared-moon") {\n      const piece = key.split("/")[5];\n      return `Between You Two V2 · ${words(subject)} Moon · ${words(piece)}`;\n    }\n  }\n  if (kind === "opener") return `Today between you two · ${detail === "shared-clause" ? "Shared-day opening" : "Opening"}${detail === "no-reader-handle" || subject === "no-reader-handle" ? " · Without reader handle" : detail?.startsWith("variant-") ? ` · Variant ${detail.slice(8)}` : ""}`;',
  "admin V2 labels"
);
fs.writeFileSync(catalogPath, catalog);
console.log("Patched Between You Two V2 packaging and Content Studio source discovery.");
