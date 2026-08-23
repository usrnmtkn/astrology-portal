#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const defaultSourceDir = "/Users/mprez/Downloads/us.sitesucker.mac.sitesucker/www.CC.com";
const importBatchId = `dashboard-source-${new Date().toISOString().slice(0, 10)}`;
const dignityLinesPath = path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/authored-inputs/dignity-sky-lines-2026-07-23.json"
);
const requestedSourceId = process.argv
  .find((arg) => arg.startsWith("--source="))
  ?.slice("--source=".length);

const sourceFiles = [
  {
    id: "fallback-language",
    path: process.env.TLDR_FALLBACK_LANGUAGE_ROWS_PATH ?? path.join(defaultSourceDir, "tldrastro-fallback-language-rows.json"),
    kind: "fallback-vocab"
  },
  {
    id: "placement-children",
    path: process.env.TLDR_PLACEMENT_CHILDREN_ROWS_PATH ?? path.join(defaultSourceDir, "tldrastro-placement-children.json"),
    kind: "fallback-hook"
  },
  {
    id: "authored-fallbacks",
    path: process.env.TLDR_AUTHORED_FALLBACK_ROWS_PATH ?? path.join(defaultSourceDir, "tldr-astro-fallback-rows.json"),
    kind: "fallback-hook"
  },
  {
    id: "satori-fallbacks",
    path: process.env.TLDR_SATORI_FALLBACK_ROWS_PATH ?? path.join(defaultSourceDir, "tldr-astro-satori-fallback-rows.json"),
    kind: "fallback-hook"
  },
  {
    id: "rich-synastry",
    path: process.env.TLDR_RICH_SYNASTRY_ROWS_PATH ?? path.join(defaultSourceDir, "tldrastro-rich-synastry-content.json"),
    kind: "fallback-hook"
  },
  {
    id: "fallback-templates",
    path: process.env.TLDR_FALLBACK_TEMPLATE_ROWS_PATH ?? path.join(defaultSourceDir, "tldrastro-fallback-templates-rows.json"),
    kind: "fallback-template"
  }
];

function unquoteEnvValue(value) {
  const trimmed = value.trim();
  const quote = trimmed[0];

  if ((quote === "\"" || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function loadLocalWebEnv() {
  const envPath = path.join(repoRoot, "apps/web/.env.local");

  if (!fs.existsSync(envPath)) {
    return;
  }

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = unquoteEnvValue(trimmed.slice(separatorIndex + 1));

    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function rowsFromSource(source) {
  if (Array.isArray(source)) {
    return source;
  }

  for (const key of ["hookRows", "templateRows", "rows", "records"]) {
    if (Array.isArray(source?.[key])) {
      return source[key];
    }
  }

  return [];
}

function normalizeRowsDocument(source, rows) {
  if (Array.isArray(source)) {
    return rows;
  }

  for (const key of ["hookRows", "templateRows", "rows", "records"]) {
    if (Array.isArray(source?.[key])) {
      return { ...source, [key]: rows };
    }
  }

  throw new Error("Dashboard source JSON must be an array or expose hookRows/templateRows/rows/records.");
}

function mergeRowsByContentKey(masterRows, authoredRows) {
  const merged = [...masterRows];
  const indexes = new Map(
    merged.map((row, index) => [normalizeContentKey(row), index]).filter(([key]) => key)
  );
  let inserted = 0;
  let updated = 0;

  for (const row of authoredRows) {
    const contentKey = normalizeContentKey(row);

    if (!contentKey) {
      throw new Error("Canonical dignity authoring row is missing contentKey.");
    }

    const existingIndex = indexes.get(contentKey);

    if (existingIndex === undefined) {
      indexes.set(contentKey, merged.length);
      merged.push(row);
      inserted += 1;
    } else {
      merged[existingIndex] = row;
      updated += 1;
    }
  }

  return { rows: merged, inserted, updated };
}

function mergeDignityLinesIntoAuthoredMaster(sourceFile, source) {
  const dignitySource = readJson(dignityLinesPath);
  const dignityRows = rowsFromSource(dignitySource);

  if (dignityRows.length !== 28) {
    throw new Error(`Expected 28 canonical dignity lines, found ${dignityRows.length}.`);
  }

  const merged = mergeRowsByContentKey(rowsFromSource(source), dignityRows);
  const document = normalizeRowsDocument(source, merged.rows);
  fs.writeFileSync(sourceFile.path, `${JSON.stringify(document, null, 2)}\n`);

  return {
    source: document,
    inserted: merged.inserted,
    updated: merged.updated,
    totalDignityRows: merged.rows.filter((row) =>
      normalizeContentKey(row).startsWith("fallback-hook/dignity-line/")
    ).length
  };
}

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function supabaseUrl() {
  return process.env.SUPABASE_URL ?? requireEnv("VITE_SUPABASE_URL");
}

function serviceRoleKey() {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
}

function adminHeaders(extra = {}) {
  const key = serviceRoleKey();

  return {
    apikey: key,
    authorization: `Bearer ${key}`,
    "content-type": "application/json",
    ...extra
  };
}

function normalizeContentKey(row) {
  return String(row.contentKey ?? row.content_key ?? row.canonical_key ?? row.key ?? "").trim();
}

function titleFromKey(key) {
  const leaf = key.split("/").pop() ?? key;

  return leaf
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function modeForRow(row) {
  const tier = String(row.surface_tier ?? row.tier ?? "").trim().toLowerCase();

  if (tier === "expanded" || tier === "detail" || tier === "article") {
    return "in_depth";
  }

  return "feed";
}

const liveServingSourceIds = new Set(["fallback-language", "fallback-templates"]);

function familyForKey(key, row, sourceFile) {
  const sourceKind = sourceFile.kind;

  if (key.startsWith("fallback-vocab/")) return "fallback-vocabulary";
  if (key.startsWith("fallback-template/") || sourceFile.id === "fallback-templates") return "fallback-template";
  if (row.content_family) return String(row.content_family);
  if (key.startsWith("fallback-hook/sky.planetary-placement/")) return "planetary-placement-child-fallback";
  if (key.startsWith("fallback-hook/")) return "runtime-fallback-hook";

  return sourceKind;
}

function surfaceForKey(key, row, family) {
  const explicitSurface = String(row.surface ?? "").trim();

  if (["sky", "you", "natal", "synastry", "composite", "relationship", "modifier"].includes(explicitSurface)) {
    return explicitSurface;
  }

  if (key.startsWith("fallback-vocab/")) return "modifier";
  if (key.startsWith("fallback-template/")) return "modifier";
  if (key.includes("/friends.") || key.includes("synastry") || key.includes("composite")) return "relationship";
  if (key.includes("/you.") || family.includes("transit-to-natal") || family.includes("natal")) return "you";

  return "sky";
}

function blockTypeForKey(key, sourceKind, family) {
  if (key.startsWith("fallback-vocab/")) return "vocabulary";
  if (key.startsWith("fallback-template/") || family === "fallback-template") return "fallback_template";
  if (family.includes("aspect")) return "fallback_aspect";
  if (family.includes("placement")) return "fallback_placement";

  return sourceKind.replace(/-/g, "_");
}

function statusForKey(sourceFile) {
  void sourceFile;
  return "DRAFT";
}

function reviewStateForKey(sourceFile) {
  void sourceFile;
  return "legacy-dashboard-source-disabled";
}

function sourceContentTypeForKey(key, sourceFile) {
  if (key.startsWith("fallback-vocab/")) return "fallback-vocabulary";
  if (key.startsWith("fallback-template/") || sourceFile.id === "fallback-templates") return "template";
  if (sourceFile.id === "rich-synastry") return "synastry-kb-seed";

  return "fallback-hook";
}

function mapApprovedDignityLine(row, sourceFile, contentKey) {
  const requiredBodies = ["body_you", "body_they", "body_sky"];

  for (const field of requiredBodies) {
    if (typeof row[field] !== "string" || !row[field].trim()) {
      throw new Error(`${contentKey} is missing ${field}.`);
    }
  }

  if (row.content_role !== "fallback_hook") {
    throw new Error(`${contentKey} must keep content_role=fallback_hook.`);
  }

  if (row.review_status !== "approved") {
    throw new Error(`${contentKey} must keep review_status=approved.`);
  }

  if (!Array.isArray(row.source_keys) || row.source_keys.length === 0) {
    throw new Error(`${contentKey} must keep its cc/dignity source_keys.`);
  }

  const expectedSourceKey = contentKey.replace("fallback-hook/dignity-line/", "cc/dignity/");

  if (!row.source_keys.includes(expectedSourceKey)) {
    throw new Error(`${contentKey} must keep source key ${expectedSourceKey}.`);
  }

  const packageRecord = structuredClone(row);

  return {
    content_key: contentKey,
    surface: "modifier",
    mode: "feed",
    status: "DRAFT",
    event_type: "fallback-hook",
    target_date: null,
    headline: String(row.headline ?? titleFromKey(contentKey)).trim(),
    summary: String(row.summary ?? row.note ?? "").trim(),
    body: row.body_you.trim(),
    sections: {
      packageRecord,
      body_you: row.body_you.trim(),
      body_they: row.body_they.trim(),
      body_sky: row.body_sky.trim()
    },
    block_type: "fallback_hook",
    lane: "reference",
    review_state: "fallback-system-reference",
    evergreen: true,
    evergreen_at: new Date().toISOString(),
    evergreen_by: importBatchId,
    facts: {
      fallbackArchitectureV3: true,
      packageBucket: "fallback-system",
      content_role: "fallback_hook",
      review_status: "approved",
      readerServing: false
    },
    knowledge_ids: [],
    source_snapshot: {
      contentType: "fallback-system",
      content_role: "fallback_hook",
      review_status: "approved",
      approved_via: row.approved_via ?? null,
      source_keys: row.source_keys,
      importBatchId,
      sourcePackage: "tldrastro-fallback-architecture-v3",
      sourceFile: path.basename(sourceFile.path),
      note: "Approved dignity authoring master row mirrored for dashboard editing and package snapshot export."
    },
    reviewer_notes: String(row.note ?? "").trim(),
    prompt_version: importBatchId,
    provider: "tldrastro-fallback-architecture-v3",
    model: "manual",
    updated_at: new Date().toISOString()
  };
}

function mapRow(row, sourceFile, sourceIndex) {
  const contentKey = normalizeContentKey(row);

  if (!contentKey) {
    throw new Error(`${sourceFile.id} row ${sourceIndex + 1} is missing contentKey/canonical_key.`);
  }

  if (contentKey.startsWith("fallback-hook/dignity-line/")) {
    return mapApprovedDignityLine(row, sourceFile, contentKey);
  }

  const family = familyForKey(contentKey, row, sourceFile);
  const status = statusForKey(sourceFile);
  const reviewState = reviewStateForKey(sourceFile);
  const scope = row.scope && typeof row.scope === "object" ? row.scope : {};
  const body = String(row.body ?? row.text ?? "").trim();

  return {
    content_key: contentKey,
    surface: surfaceForKey(contentKey, row, family),
    mode: modeForRow(row),
    status,
    event_type: family,
    target_date: null,
    headline: String(row.headline ?? titleFromKey(contentKey)).trim(),
    summary: String(row.summary ?? "").trim(),
    body,
    sections: [],
    block_type: blockTypeForKey(contentKey, sourceFile.kind, family),
    lane: "serving",
    review_state: reviewState,
    evergreen: true,
    evergreen_at: new Date().toISOString(),
    evergreen_by: "dashboard-source-import",
    facts: {
      tldrDashboardSource: true,
      sourceFile: path.basename(sourceFile.path),
      sourceKind: sourceFile.kind,
      contentFamily: family,
      surfaceTier: row.surface_tier ?? null,
      scope,
      lane: "serving",
      review: reviewState,
      sourceStatus: reviewState ? "EDITORIAL_REVIEW_REQUIRED" : "LIVE_SERVING"
    },
    knowledge_ids: [],
    source_snapshot: {
      contentType: sourceContentTypeForKey(contentKey, sourceFile),
      importBatchId,
      sourceFile: path.basename(sourceFile.path),
      sourceKind: sourceFile.kind,
      incomingSource: row.incoming_source ?? row.source ?? null,
      canonicalKey: contentKey,
      existingCanonicalMatch: row.existing_canonical_match ?? null,
      mappingAction: row.mapping_action ?? null,
      provenance: row.provenance ?? null,
      scope,
      note: "Dashboard source import. Provenance and editorial metadata must not render to readers."
    },
    reviewer_notes: "",
    prompt_version: "dashboard-source-import-v1",
    provider: "dashboard-source",
    model: "manual",
    updated_at: new Date().toISOString()
  };
}

async function upsertRows(rows) {
  const upserted = [];

  for (let index = 0; index < rows.length; index += 100) {
    const batch = rows.slice(index, index + 100);
    const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?on_conflict=content_key`, {
      method: "POST",
      headers: adminHeaders({
        prefer: "resolution=merge-duplicates,return=representation"
      }),
      body: JSON.stringify(batch)
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(`Supabase dashboard-source upsert failed with ${response.status}: ${JSON.stringify(payload)}`);
    }

    upserted.push(...payload);
  }

  return upserted;
}

async function countByPrefix(prefix, extraParams = {}) {
  const params = new URLSearchParams({
    select: "id",
    content_key: `like.${prefix}%`,
    limit: "1",
    ...extraParams
  });
  const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?${params}`, {
    headers: adminHeaders({
      prefer: "count=exact"
    })
  });

  await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Supabase count failed with ${response.status}.`);
  }

  return Number(response.headers.get("content-range")?.match(/\/(\d+)$/)?.[1] ?? 0);
}

async function assertServingGuardSchema() {
  const params = new URLSearchParams({
    select: "id,lane,review_state,evergreen,evergreen_at,evergreen_by",
    limit: "1"
  });
  const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?${params}`, {
    headers: adminHeaders()
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = typeof payload?.message === "string" ? payload.message : "";
    const details = typeof payload?.details === "string" ? payload.details : "";

    if (payload?.code === "42703" && /\b(lane|review_state|evergreen)\b/i.test(`${message} ${details}`)) {
      throw new Error(
        "generated_interpretations is missing the serving-guard columns. Apply apps/web/supabase/migrations/20260711110000_generated_content_serving_lane.sql and apps/web/supabase/migrations/20260711153000_generated_content_evergreen_lock.sql before importing dashboard-source rows."
      );
    }

    throw new Error(`Supabase schema preflight failed with ${response.status}: ${JSON.stringify(payload)}`);
  }
}

loadLocalWebEnv();
await assertServingGuardSchema();

const mappedByFile = [];
const mappedRows = [];
let dignityMasterMerge = null;
const activeSourceFiles = requestedSourceId
  ? sourceFiles.filter((sourceFile) => sourceFile.id === requestedSourceId)
  : sourceFiles;

if (requestedSourceId && activeSourceFiles.length === 0) {
  throw new Error(`Unknown dashboard source id: ${requestedSourceId}`);
}

for (const sourceFile of activeSourceFiles) {
  let source = readJson(sourceFile.path);

  if (sourceFile.id === "authored-fallbacks") {
    dignityMasterMerge = mergeDignityLinesIntoAuthoredMaster(sourceFile, source);
    source = dignityMasterMerge.source;
  }

  const rows = rowsFromSource(source);
  const mapped = rows.map((row, index) => mapRow(row, sourceFile, index));

  mappedByFile.push({
    id: sourceFile.id,
    file: path.basename(sourceFile.path),
    rows: mapped.length,
    live: mapped.filter((row) => row.status === "LIVE").length,
    draft: mapped.filter((row) => row.status === "DRAFT").length
  });
  mappedRows.push(...mapped);
}

const duplicateKeys = mappedRows
  .map((row) => row.content_key)
  .filter((key, index, keys) => keys.indexOf(key) !== index);

const incomingOverrides = [];
const dedupedRowsByKey = new Map();

for (const row of mappedRows) {
  const previous = dedupedRowsByKey.get(row.content_key);

  if (previous) {
    incomingOverrides.push({
      contentKey: row.content_key,
      replacedSource: previous.source_snapshot.sourceFile,
      selectedSource: row.source_snapshot.sourceFile
    });
  }

  dedupedRowsByKey.set(row.content_key, row);
}

const rowsToUpsert = Array.from(dedupedRowsByKey.values());
const upserted = await upsertRows(rowsToUpsert);
const draftVocabCount = await countByPrefix("fallback-vocab/", {
  status: "eq.LIVE",
  lane: "eq.serving",
  review_state: "is.null"
});
const draftPlacementChildCount = await countByPrefix("fallback-hook/sky.planetary-placement/", {
  status: "eq.DRAFT",
  lane: "eq.serving",
  review_state: "eq.editorial-review-required"
});
const draftFallbackCount = await countByPrefix("fallback-hook/", {
  status: "eq.DRAFT",
  lane: "eq.serving",
  review_state: "eq.editorial-review-required"
});
const draftTemplateCount = await countByPrefix("fallback-template/", {
  status: "eq.LIVE",
  lane: "eq.serving",
  review_state: "is.null"
});
const liveHookTemplateCount = await countByPrefix("fallback-hook/", {
  status: "eq.LIVE",
  lane: "eq.serving",
  review_state: "is.null"
});

console.log(JSON.stringify({
  importBatchId,
  requestedSourceId: requestedSourceId ?? "all",
  dignityMasterMerge: dignityMasterMerge
    ? {
        inserted: dignityMasterMerge.inserted,
        updated: dignityMasterMerge.updated,
        totalDignityRows: dignityMasterMerge.totalDignityRows
      }
    : null,
  sourceFiles: mappedByFile,
  totalMappedRows: mappedRows.length,
  totalRowsAfterIncomingDedupe: rowsToUpsert.length,
  incomingOverrides,
  totalUpsertedRows: upserted.length,
  verification: {
    liveServingFallbackVocabRows: draftVocabCount,
    draftServingPlacementChildrenRows: draftPlacementChildCount,
    draftServingFallbackHookRows: draftFallbackCount,
    liveServingFallbackTemplateRows: draftTemplateCount,
    liveServingFallbackHookTemplateRows: liveHookTemplateCount
  }
}, null, 2));
