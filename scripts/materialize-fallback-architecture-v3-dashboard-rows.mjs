#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const packageDir = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");
const defaultOutPath = path.join(repoRoot, "scripts/generated/fallback-architecture-v3-dashboard-rows.json");
const importBatchId = "fallback-architecture-v3-2026-07-21";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const verify = args.has("--verify");
const outPath = process.argv.find((arg) => arg.startsWith("--out="))?.slice("--out=".length) ?? defaultOutPath;

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

function readJson(fileName) {
  return JSON.parse(fs.readFileSync(path.join(packageDir, fileName), "utf8"));
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

function titleFromKey(key) {
  const leaf = key.split("/").filter(Boolean).pop() ?? key;

  return leaf
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function statusForReview(role, reviewStatus, contentKey) {
  if (contentKey.startsWith("authored/profection-year/")) {
    return { status: "DRAFT", lane: "reference", reviewState: "needs-review" };
  }

  if (role === "full_copy" && ["approved", "approved_reuse", "reviewed"].includes(reviewStatus)) {
    return { status: "LIVE", lane: "serving", reviewState: null };
  }

  return { status: "DRAFT", lane: "reference", reviewState: "fallback-system-reference" };
}

function surfaceForKey(key, explicitSurface) {
  if (explicitSurface === "friends") {
    return "relationship";
  }

  if (["sky", "you", "natal", "synastry", "composite", "relationship", "modifier"].includes(explicitSurface ?? "")) {
    return explicitSurface;
  }

  if (key.includes("/compat-") || key.startsWith("fallback-hook/compat")) return "relationship";
  if (key.includes("synastry")) return "synastry";
  if (key.includes("/transit-") || key.startsWith("fallback-hook/transit") || key.includes("/empty-house")) return "you";
  if (key.startsWith("fallback-vocab/") || key.startsWith("fallback-template/")) return "modifier";
  if (key.startsWith("fallback-source/")) return "modifier";

  return "sky";
}

function modeForKey(key) {
  if (key.includes("/sky-season/") || key.includes("/sky-newmoon/") || key.includes("/sky-fullmoon/")) return "article";
  if (key.includes("/compat-deep/") || key.includes("/empty-house/") || key.includes("/profection-year/")) return "in_depth";
  return "feed";
}

function eventTypeForKey(key, role) {
  if (role === "template") return "fallback-template";
  if (role === "vocabulary") return "vocab";
  if (role === "fallback_source") return "fallback-source";
  if (key.includes("/compat-")) return "friends.compatibility";
  if (key.includes("/transit-aspect/")) return "transit-to-natal-aspect";
  if (key.includes("/sky-newmoon/")) return "sky-newmoon";
  if (key.includes("/sky-fullmoon/")) return "sky-fullmoon";
  if (key.includes("/sky-season/")) return "planetary-ingress";
  if (key.startsWith("fallback-hook/")) return "fallback-hook";
  return "fallback-architecture-v3";
}

function rowBody(record) {
  return String(record.body_you ?? record.body ?? record.text ?? "").trim();
}

function rowSummary(record) {
  return String(record.summary ?? record.intention ?? record.energy ?? record.note ?? record.notes ?? "").trim();
}

function mapPackageRecord(record, bucket) {
  const contentKey = String(record.contentKey ?? record.content_key ?? "").trim();

  if (!contentKey) {
    throw new Error(`V3 ${bucket} row is missing contentKey.`);
  }

  const contentRole = String(record.content_role ?? bucket).trim();
  const reviewStatus = String(record.review_status ?? "").trim();
  const serving = statusForReview(contentRole, reviewStatus, contentKey);
  const surface = surfaceForKey(contentKey, record.surface);
  const body = rowBody(record);

  return {
    content_key: contentKey,
    surface,
    mode: modeForKey(contentKey),
    status: serving.status,
    event_type: eventTypeForKey(contentKey, contentRole),
    target_date: null,
    headline: String(record.headline ?? titleFromKey(contentKey)).trim(),
    summary: rowSummary(record),
    body,
    sections: {
      packageRecord: record,
      body_you: record.body_you ?? null,
      body_they: record.body_they ?? null,
      intention: record.intention ?? null,
      ritual: record.ritual ?? null,
      energy: record.energy ?? null
    },
    block_type: contentRole === "template" ? "fallback_template" : null,
    lane: serving.lane,
    review_state: serving.reviewState,
    evergreen: true,
    evergreen_at: new Date().toISOString(),
    evergreen_by: importBatchId,
    facts: {
      fallbackArchitectureV3: true,
      packageBucket: bucket,
      content_role: contentRole,
      review_status: reviewStatus,
      readerServing: serving.status === "LIVE" && serving.lane === "serving" && !serving.reviewState
    },
    knowledge_ids: [],
    source_snapshot: {
      contentType: bucket,
      content_role: contentRole,
      review_status: reviewStatus,
      approved_via: record.approved_via ?? null,
      source_keys: record.source_keys ?? [],
      importBatchId,
      sourcePackage: "tldrastro-fallback-architecture-v3",
      sourceFile: bucket,
      note: "V3 package mirror for dashboard editing. fallback_source rows are source material and must never render directly."
    },
    reviewer_notes: String(record.note ?? record.notes ?? "").trim(),
    prompt_version: importBatchId,
    provider: "tldrastro-fallback-architecture-v3",
    model: "manual",
    updated_at: new Date().toISOString()
  };
}

function materializeRows() {
  const sourceRows = readJson("source-rows/fallback-source-rows-v3.json");
  const authoredRows = readJson("source-rows/transit-synastry-rows-v1.json");
  const templateRows = readJson("templates/fallback-templates-v3.json");

  return [
    ...authoredRows.authoredCards.map((row) => mapPackageRecord(row, "authored-content")),
    ...sourceRows.hookRows.map((row) => mapPackageRecord(row, "fallback-system")),
    ...sourceRows.vocabularyRows.map((row) => mapPackageRecord(row, "fallback-system")),
    ...templateRows.templates.map((row) => mapPackageRecord(row, "fallback-system")),
    ...sourceRows.fallbackSourceRows.map((row) => mapPackageRecord(row, "source-material"))
  ];
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
      throw new Error(`Fallback architecture V3 upsert failed with ${response.status}: ${JSON.stringify(payload)}`);
    }

    upserted.push(...payload);
  }

  return upserted;
}

async function readImportedRows() {
  const imported = [];

  for (let offset = 0; ; offset += 1000) {
    const response = await fetch(
      `${supabaseUrl()}/rest/v1/generated_interpretations?select=content_key,status,lane,review_state,facts,source_snapshot&provider=eq.tldrastro-fallback-architecture-v3&limit=1000&offset=${offset}`,
      {
        method: "GET",
        headers: adminHeaders()
      }
    );
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(`Fallback architecture V3 verify failed with ${response.status}: ${JSON.stringify(payload)}`);
    }

    imported.push(...payload);

    if (!Array.isArray(payload) || payload.length < 1000) {
      break;
    }
  }

  return imported;
}

function packageRole(row) {
  return row?.source_snapshot?.content_role ?? row?.facts?.content_role ?? "";
}

function packageBucket(row) {
  return row?.source_snapshot?.contentType ?? row?.facts?.packageBucket ?? "";
}

function importedCounts(rows) {
  return {
    authoredCards: countBy(rows, (row) => packageBucket(row) === "authored-content"),
    fallbackHooks: countBy(rows, (row) => packageBucket(row) === "fallback-system" && packageRole(row) === "fallback_hook"),
    vocabulary: countBy(rows, (row) => packageBucket(row) === "fallback-system" && packageRole(row) === "vocabulary"),
    templates: countBy(rows, (row) => packageBucket(row) === "fallback-system" && packageRole(row) === "template"),
    sourceMaterial: countBy(rows, (row) => packageBucket(row) === "source-material"),
    liveServing: countBy(rows, (row) => row.status === "LIVE" && row.lane === "serving" && row.review_state === null)
  };
}

function countBy(rows, predicate) {
  return rows.filter(predicate).length;
}

loadLocalWebEnv();

const rows = materializeRows();
const counts = {
  authoredCards: countBy(rows, (row) => row.source_snapshot.contentType === "authored-content"),
  fallbackHooks: countBy(rows, (row) => row.source_snapshot.contentType === "fallback-system" && row.source_snapshot.content_role === "fallback_hook"),
  vocabulary: countBy(rows, (row) => row.source_snapshot.contentType === "fallback-system" && row.source_snapshot.content_role === "vocabulary"),
  templates: countBy(rows, (row) => row.source_snapshot.contentType === "fallback-system" && row.source_snapshot.content_role === "template"),
  sourceMaterial: countBy(rows, (row) => row.source_snapshot.contentType === "source-material"),
  liveServing: countBy(rows, (row) => row.status === "LIVE" && row.lane === "serving" && row.review_state === null)
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify({
  schema: "tldrastro-fallback-architecture-v3-dashboard-rows",
  generatedAt: new Date().toISOString(),
  counts,
  rows
}, null, 2)}\n`);

console.log(`materialized ${rows.length} V3 dashboard rows -> ${path.relative(repoRoot, outPath)}`);
console.log(JSON.stringify(counts, null, 2));

if (apply) {
  const upserted = await upsertRows(rows);
  console.log(`upserted ${upserted.length} V3 dashboard rows into generated_interpretations`);
}

if (verify) {
  const importedRows = await readImportedRows();
  const liveCounts = importedCounts(importedRows);
  console.log(`verified ${importedRows.length} imported V3 dashboard rows in generated_interpretations`);
  console.log(JSON.stringify(liveCounts, null, 2));
}
