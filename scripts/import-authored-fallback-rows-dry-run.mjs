#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

export const fallbackImportBatchId = "handoff-fallback-authoring-v18-dry-run";
export const defaultFallbackSourcePath = "/Users/mprez/Downloads/us.sitesucker.mac.sitesucker/www.chani.com/tldr-astro-fallback-rows.json";
export const defaultSatoriFallbackSourcePath = "/Users/mprez/Downloads/us.sitesucker.mac.sitesucker/www.chani.com/tldr-astro-satori-fallback-rows.json";
export const defaultPlacementChildrenSourcePath = "/Users/mprez/Downloads/us.sitesucker.mac.sitesucker/www.chani.com/tldrastro-placement-children.json";
export const defaultFallbackReportPath = "/Users/mprez/Downloads/us.sitesucker.mac.sitesucker/www.chani.com/tldr-astro-fallback-import-report.md";
export const defaultFallbackOutDir = path.join(repoRoot, "scripts", "generated", "fallback-row-import-v18");

const runtimeFallbackFamilies = new Set([
  "fallback-hook/sky.aspect-detail",
  "fallback-hook/sky.ingress",
  "fallback-hook/you.transit-to-natal",
  "fallback-hook/you.transit-through-house",
  "fallback-hook/you.transit-to-angle",
  "fallback-hook/sky.planetary-placement",
  "fallback-hook/you.daily-timing",
  "fallback-hook/sky.retrograde",
  "fallback-hook/sky.station",
  "fallback-hook/sky.retrograde-section",
  "fallback-hook/you.natal-placement",
  "fallback-hook/you.natal-house-placement",
  "fallback-hook/you.natal-angle-placement",
  "fallback-hook/you.natal-aspect",
  "fallback-hook/friends.synastry-contact",
  "fallback-hook/friends.same-planet",
  "fallback-hook/friends.house-overlay",
  "fallback-hook/settings.life-area-focus"
]);

const runtimeFallbackFamilyAliases = [
  ["fallback-hook/sky.eclipse", "fallback-hook/sky.planetary-placement"]
];

const surfaceByFamily = {
  "sky-aspect-fallback": "sky",
  "transit-to-natal-fallback": "you",
  "ingress-fallback": "sky",
  "eclipse-fallback": "sky",
  "retrograde-per-planet-fallback": "sky",
  "retrograde-phase-fallback": "sky",
  "multi-retrograde-fallback": "sky",
  "planetary-placement-child-fallback": "sky",
  "synastry-short-fallback": "synastry",
  "synastry_same_planet": "synastry",
  "synastry-same-planet-fallback": "synastry"
};

function csvEscape(value) {
  const stringValue = value == null ? "" : String(value);

  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function csv(rows, headers) {
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))
  ].join("\n") + "\n";
}

function sqlString(value) {
  if (value == null) return "null";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlJson(value) {
  return `${sqlString(JSON.stringify(value ?? {}))}::jsonb`;
}

function normalizeContentKey(value) {
  return String(value ?? "").trim();
}

function normalizeRuntimeFamily(value) {
  const key = normalizeContentKey(value);
  if (!key) return "";

  for (const family of runtimeFallbackFamilies) {
    if (key === family || key.startsWith(`${family}.`) || key.startsWith(`${family}/`)) {
      return family;
    }
  }

  for (const [prefix, family] of runtimeFallbackFamilyAliases) {
    if (key === prefix || key.startsWith(`${prefix}.`) || key.startsWith(`${prefix}/`)) {
      return family;
    }
  }

  return key;
}

function titleFromKey(key) {
  const leaf = key.split("/").pop() ?? key;
  return leaf
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function modeForTier(tier) {
  return tier === "expanded" ? "in_depth" : "feed";
}

function resolveAction(row, seenKeys) {
  const canonicalKey = normalizedCanonicalKey(row);
  const existingMatch = normalizeContentKey(row.existing_canonical_match);
  const normalizedExistingFamily = normalizeRuntimeFamily(existingMatch);
  const flags = [];

  if (!canonicalKey) {
    flags.push("MISSING_CANONICAL_KEY");
    return { action: "SKIP", flags };
  }

  if (row.mapping_action === "SKIP_LOWER_PRIORITY_DUPLICATE") {
    flags.push("LOWER_PRIORITY_DUPLICATE");
    return { action: "SKIP", flags };
  }

  if (canonicalKey.startsWith("store/")) {
    flags.push("BLANKET_STORE_PREFIX_BLOCKED");
    return { action: "CONFLICT", flags };
  }

  if (row.status !== "DRAFT") {
    flags.push("FORCED_TO_DRAFT");
  }

  if (row.lane !== "serving") {
    flags.push("FORCED_TO_SERVING");
  }

  if (row.review_state !== "editorial-review-required") {
    flags.push("FORCED_EDITORIAL_REVIEW_REQUIRED");
  }

  if (seenKeys.has(canonicalKey)) {
    flags.push("DUPLICATE_INCOMING_KEY");
    return { action: "CONFLICT", flags };
  }

  seenKeys.add(canonicalKey);

  if (!existingMatch) {
    flags.push("NO_EXISTING_CANONICAL_MATCH");
    return { action: "UNMAPPED", flags };
  }

  if (!runtimeFallbackFamilies.has(normalizedExistingFamily)) {
    flags.push("UNKNOWN_EXISTING_RUNTIME_FAMILY");
    return { action: "UNMAPPED", flags };
  }

  if (row.mapping_action === "VOICE_UPGRADE_EXISTING") {
    flags.push("VOICE_UPGRADE_EXISTING");
    return { action: "MATCH_EXISTING", flags };
  }

  if (canonicalKey === existingMatch) {
    return { action: "MATCH_EXISTING", flags };
  }

  return { action: "NEW_CANONICAL_KEY", flags };
}

function normalizedCanonicalKey(row) {
  const canonicalKey = normalizeContentKey(row.canonical_key);

  if (row.content_family === "sky-aspect-fallback") {
    const scope = typeof row.scope === "object" && row.scope ? row.scope : {};
    const aspect = normalizeContentKey(scope.aspect || row.aspect);
    const tier = normalizeContentKey(row.surface_tier);

    if (aspect && tier) {
      return `fallback-hook/sky.aspect-detail/${aspect}/${tier}`;
    }
  }

  return canonicalKey;
}

function mappedRow(row, index, action, flags) {
  const canonicalKey = normalizedCanonicalKey(row);
  const scope = typeof row.scope === "object" && row.scope ? row.scope : {};
  const surface = surfaceByFamily[row.content_family] ?? "sky";
  const text = String(row.text ?? row.body ?? "").trim();

  return {
    row_number: index + 1,
    incoming_source: row.incoming_source ?? "handoff-fallback-authoring-v18",
    canonical_key: canonicalKey,
    existing_canonical_match: normalizeContentKey(row.existing_canonical_match),
    content_family: row.content_family ?? "",
    surface_tier: row.surface_tier ?? "",
    surface,
    mode: modeForTier(row.surface_tier),
    status: "DRAFT",
    lane: "serving",
    review_state: "editorial-review-required",
    mapping_action: action,
    flags: flags.join("|"),
    headline: String(row.headline ?? "").trim(),
    summary: String(row.summary ?? "").trim(),
    text,
    provenance: row.provenance ?? "",
    scope_json: JSON.stringify(scope)
  };
}

export function loadFallbackImportRows(sourcePath = defaultFallbackSourcePath) {
  const payload = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload.rows) ? payload.rows : null;

  if (!rows) {
    throw new Error(`Expected ${sourcePath} to contain a JSON array or an object with rows[].`);
  }

  return rows;
}

function normalizePlacementChildRows(sourcePath = defaultPlacementChildrenSourcePath) {
  const payload = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload.templateRows) ? payload.templateRows : null;

  if (!rows) {
    throw new Error(`Expected ${sourcePath} to contain a JSON array or an object with templateRows[].`);
  }

  return rows.map((row) => {
    const key = normalizeContentKey(row.contentKey ?? row.canonical_key);
    const [, planet = "", sign = ""] = key.match(/^fallback-hook\/sky\.planetary-placement\/([^/]+)\/([^/]+)$/) ?? [];

    return {
      incoming_source: "tldrastro-placement-children",
      canonical_key: key,
      existing_canonical_match: "fallback-hook/sky.planetary-placement",
      content_family: "planetary-placement-child-fallback",
      surface_tier: "card",
      scope: { planet, sign },
      status: "DRAFT",
      lane: "serving",
      review_state: "editorial-review-required",
      provenance: payload.provenance ?? "CC-derived, revoice-pending (user approved interim use)",
      headline: row.headline ?? "",
      summary: row.summary ?? "",
      text: row.body ?? "",
      mapping_action: "NEW_CANONICAL_KEY"
    };
  });
}

export function loadCombinedFallbackImportRows(options = {}) {
  const includeSatori = options.includeSatori ?? true;
  const includePlacementChildren = options.includePlacementChildren ?? true;
  const authoredRows = loadFallbackImportRows(options.sourcePath ?? defaultFallbackSourcePath);
  const satoriRows = includeSatori
    ? loadFallbackImportRows(options.satoriSourcePath ?? defaultSatoriFallbackSourcePath)
    : [];
  const placementRows = includePlacementChildren
    ? normalizePlacementChildRows(options.placementChildrenSourcePath ?? defaultPlacementChildrenSourcePath)
    : [];

  const satoriKeys = new Set(satoriRows.map((row) => normalizedCanonicalKey(row)));
  const prioritizedAuthoredRows = authoredRows.map((row) => (
    satoriKeys.has(normalizedCanonicalKey(row))
      ? { ...row, mapping_action: "SKIP_LOWER_PRIORITY_DUPLICATE" }
      : row
  ));

  return [...prioritizedAuthoredRows, ...satoriRows, ...placementRows];
}

export function buildFallbackImportAudit(rows) {
  const seenKeys = new Set();

  return rows.map((row, index) => {
    const resolved = resolveAction(row, seenKeys);
    return mappedRow(row, index, resolved.action, resolved.flags);
  });
}

function insertSqlForRows(rows, importBatchId = fallbackImportBatchId) {
  const insertable = rows.filter((row) => row.mapping_action === "MATCH_EXISTING" || row.mapping_action === "NEW_CANONICAL_KEY");

  if (!insertable.length) {
    return "-- Dry run only. No insertable fallback rows were resolved.\n";
  }

  const values = insertable.map((row) => {
    const sourceSnapshot = {
      importBatchId,
      incomingSource: row.incoming_source,
      existingCanonicalMatch: row.existing_canonical_match,
      mappingAction: row.mapping_action,
      lane: row.lane,
      reviewState: row.review_state,
      provenance: row.provenance,
      scope: JSON.parse(row.scope_json || "{}")
    };

    return [
      sqlString(row.canonical_key),
      sqlString(row.surface),
      sqlString(row.mode),
      "null",
      sqlString(row.status),
      sqlString(row.content_family),
      sqlString(row.headline || titleFromKey(row.canonical_key)),
      sqlString(row.summary || null),
      sqlString(row.text),
      "null",
      sqlJson(sourceSnapshot),
      sqlJson({ fallbackScope: JSON.parse(row.scope_json || "{}") }),
      sqlString(row.provenance),
      sqlString(`fallback-dry-run-${importBatchId}`),
      sqlString(row.content_family),
      sqlString(row.lane),
      sqlString(row.review_state)
    ].join(", ");
  });

  return [
    "-- Dry run only. Review before executing manually.",
    "-- All rows are DRAFT / serving / editorial-review-required.",
    "insert into public.generated_interpretations (",
    "  content_key, surface, mode, target_date, status, event_type, headline, summary, body, sections,",
    "  source_snapshot, facts, reviewer_notes, prompt_version, block_type, lane, review_state",
    ") values",
    values.map((value, index) => `  (${value})${index === values.length - 1 ? "" : ","}`).join("\n"),
    "on conflict (content_key, target_date, mode) do nothing;",
    ""
  ].join("\n");
}

function rollbackSql(importBatchId = fallbackImportBatchId) {
  return [
    "-- Rollback for rows inserted from this reviewed dry-run batch.",
    "delete from public.generated_interpretations",
    `where source_snapshot ->> 'importBatchId' = ${sqlString(importBatchId)};`,
    ""
  ].join("\n");
}

function reportMarkdown(rows, sourcePath, sourceReportPath, importBatchId = fallbackImportBatchId, sourceDetails = []) {
  const counts = rows.reduce((memo, row) => {
    memo[row.mapping_action] = (memo[row.mapping_action] ?? 0) + 1;
    return memo;
  }, {});
  const insertable = (counts.MATCH_EXISTING ?? 0) + (counts.NEW_CANONICAL_KEY ?? 0);
  const conflicts = counts.CONFLICT ?? 0;
  const unmapped = counts.UNMAPPED ?? 0;
  const skipped = counts.SKIP ?? 0;

  return [
    "# TLDR Astro Fallback Row Import Dry Run",
    "",
    `Import batch: \`${importBatchId}\``,
    `Source JSON: \`${sourcePath}\``,
    `Source report: \`${sourceReportPath}\``,
    ...sourceDetails.map((detail) => `- ${detail.label}: \`${detail.path}\``),
    "",
    "## Counts",
    "",
    `- Source rows: ${rows.length}`,
    `- Insertable DRAFT rows: ${insertable}`,
    `- MATCH_EXISTING: ${counts.MATCH_EXISTING ?? 0}`,
    `- NEW_CANONICAL_KEY: ${counts.NEW_CANONICAL_KEY ?? 0}`,
    `- CONFLICT: ${conflicts}`,
    `- UNMAPPED: ${unmapped}`,
    `- SKIP: ${skipped}`,
    "",
    "## Safety",
    "",
    "- No SQL was executed.",
    "- Every insertable row is emitted as `status = DRAFT`, `lane = serving`, and `review_state = editorial-review-required`.",
    "- `on conflict (content_key, target_date, mode) do nothing` preserves existing rows, including LIVE rows.",
    "- No incoming row is allowed to use a blanket `store/` prefix.",
    "",
    "## Artifacts",
    "",
    "- `tldr-astro-fallback-row-audit.csv`",
    "- `tldr-astro-fallback-conflicts.csv`",
    "- `tldr-astro-fallback-unmapped.csv`",
    "- `tldr-astro-fallback-dry-run.sql`",
    "- `tldr-astro-fallback-rollback.sql`",
    ""
  ].join("\n");
}

export function writeFallbackImportDryRunArtifacts(options = {}) {
  const sourcePath = options.sourcePath ?? defaultFallbackSourcePath;
  const satoriSourcePath = options.satoriSourcePath ?? defaultSatoriFallbackSourcePath;
  const placementChildrenSourcePath = options.placementChildrenSourcePath ?? defaultPlacementChildrenSourcePath;
  const sourceReportPath = options.sourceReportPath ?? defaultFallbackReportPath;
  const outDir = options.outDir ?? defaultFallbackOutDir;
  const importBatchId = options.importBatchId ?? fallbackImportBatchId;
  const sourceRows = options.combined === false
    ? loadFallbackImportRows(sourcePath)
    : loadCombinedFallbackImportRows({ sourcePath, satoriSourcePath, placementChildrenSourcePath });
  const auditRows = buildFallbackImportAudit(sourceRows);
  const headers = [
    "row_number",
    "incoming_source",
    "canonical_key",
    "existing_canonical_match",
    "content_family",
    "surface_tier",
    "surface",
    "mode",
    "status",
    "lane",
    "review_state",
    "mapping_action",
    "flags",
    "headline",
    "summary",
    "provenance",
    "scope_json",
    "text"
  ];

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "tldr-astro-fallback-row-audit.csv"), csv(auditRows, headers));
  fs.writeFileSync(path.join(outDir, "tldr-astro-fallback-conflicts.csv"), csv(auditRows.filter((row) => row.mapping_action === "CONFLICT"), headers));
  fs.writeFileSync(path.join(outDir, "tldr-astro-fallback-unmapped.csv"), csv(auditRows.filter((row) => row.mapping_action === "UNMAPPED"), headers));
  fs.writeFileSync(path.join(outDir, "tldr-astro-fallback-dry-run.sql"), insertSqlForRows(auditRows, importBatchId));
  fs.writeFileSync(path.join(outDir, "tldr-astro-fallback-rollback.sql"), rollbackSql(importBatchId));
  fs.writeFileSync(path.join(outDir, "tldr-astro-fallback-import-report.md"), reportMarkdown(auditRows, sourcePath, sourceReportPath, importBatchId, [
    { label: "Satori fallback JSON", path: satoriSourcePath },
    { label: "Sky placement child JSON", path: placementChildrenSourcePath }
  ]));

  return { rows: auditRows, outDir };
}

function parseArgs(argv) {
  const options = {};

  for (const arg of argv) {
    if (arg.startsWith("--source=")) {
      options.sourcePath = arg.slice("--source=".length);
    } else if (arg.startsWith("--source-report=")) {
      options.sourceReportPath = arg.slice("--source-report=".length);
    } else if (arg.startsWith("--out-dir=")) {
      options.outDir = arg.slice("--out-dir=".length);
    } else if (arg.startsWith("--batch-id=")) {
      options.importBatchId = arg.slice("--batch-id=".length);
    } else if (arg === "--single-source") {
      options.combined = false;
    }
  }

  return options;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = writeFallbackImportDryRunArtifacts(parseArgs(process.argv.slice(2)));
  console.log(`Wrote ${result.rows.length} fallback dry-run rows to ${result.outDir}`);
}
