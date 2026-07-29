#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  createPackageManifest,
  PACKAGE_VERSION
} from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const packageDir = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");
const defaultOutPath = path.join(repoRoot, "scripts/generated/fallback-architecture-v3-dashboard-rows.json");
const importBatchId = `fallback-architecture-${PACKAGE_VERSION}`;
const placementSentencePositiveTest = "passed-jul29-criteria";
let packageManifest;

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

  if (reviewStatus === "needs_review") {
    return { status: "DRAFT", lane: "reference", reviewState: "needs-review" };
  }

  return { status: "DRAFT", lane: "reference", reviewState: "fallback-system-reference" };
}

function surfaceForKey(key, explicitSurface) {
  if (explicitSurface === "friends") {
    return "relationship";
  }
  if (explicitSurface === "weekly-station" || explicitSurface === "weekly-opener") {
    return "you";
  }

  if (["sky", "you", "natal", "synastry", "composite", "relationship", "modifier"].includes(explicitSurface ?? "")) {
    return explicitSurface;
  }

  if (key.includes("/compat-") || key.startsWith("fallback-hook/compat")) return "relationship";
  if (key.startsWith("fallback-hook/lunation-")) return "you";
  if (key.includes("synastry")) return "synastry";
  if (key.includes("/transit-") || key.startsWith("fallback-hook/transit") || key.includes("/empty-house")) return "you";
  if (key.startsWith("fallback-vocab/") || key.startsWith("fallback-template/")) return "modifier";
  if (key.startsWith("fallback-source/")) return "modifier";

  return "sky";
}

function modeForKey(key) {
  if (key.includes("/sky-season/") || key.includes("/sky-newmoon/") || key.includes("/sky-fullmoon/") || key.includes("/sky-lunation-macro/")) return "article";
  if (key.includes("/compat-deep/") || key.includes("/empty-house/") || key.includes("/profection-year/")) return "in_depth";
  return "feed";
}

function eventTypeForKey(key, role) {
  if (role === "template") return "fallback-template";
  if (role === "vocabulary") return "vocab";
  if (role === "fallback_source") return "fallback-source";
  if (key.startsWith("fallback-hook/")) return "fallback-hook";
  if (key.includes("/compat-")) return "friends.compatibility";
  if (key.includes("/transit-aspect/")) return "transit-to-natal-aspect";
  if (key.includes("/sky-newmoon/")) return "sky-newmoon";
  if (key.includes("/sky-fullmoon/")) return "sky-fullmoon";
  if (key.includes("/sky-lunation-macro/")) return "sky-lunation-macro";
  if (key.includes("/sky-season/")) return "planetary-ingress";
  if (key.startsWith("authored/station/")) return "planetary-station";
  if (key.startsWith("authored/week-opener/")) return "weekly-horoscope-opener";
  return "fallback-architecture-v3";
}

function rowBody(record) {
  return String(record.body_you ?? record.body ?? record.text ?? "").trim();
}

function rowSummary(record) {
  return String(record.summary ?? record.intention ?? record.energy ?? record.note ?? record.notes ?? "").trim();
}

function requiresPlacementPositiveTest(record, contentKey, reviewStatus) {
  return contentKey.startsWith("fallback-hook/placement-sentence/")
    && (
      reviewStatus === "needs_review"
      || record.positive_test != null
      || String(record.note ?? record.notes ?? "").includes("TLDR-Placement-Copy-Audit-Batch1.md")
    );
}

function blockTypeForPackageRecord(contentRole, contentKey) {
  if (contentRole === "template") return "fallback_template";
  if (contentRole === "fallback_hook" || contentKey.startsWith("fallback-hook/")) return "fallback_hook";
  return null;
}

function mapPackageRecord(record, bucket) {
  const contentKey = String(record.contentKey ?? record.content_key ?? "").trim();

  if (!contentKey) {
    throw new Error(`V3 ${bucket} row is missing contentKey.`);
  }

  const contentRole = String(record.content_role ?? bucket).trim();
  const sourceReviewStatus = String(record.review_status ?? "").trim();
  // Package templates without an explicit editorial status are already
  // reader-eligible in the bundled resolver. Normalize only the mirror
  // metadata so Supabase RLS exposes the same complete package.
  const reviewStatus = contentRole === "template" && !sourceReviewStatus
    ? "approved_reuse"
    : sourceReviewStatus;
  const serving = statusForReview(contentRole, reviewStatus, contentKey);
  const surface = surfaceForKey(contentKey, record.surface);
  const body = rowBody(record);

  if (
    requiresPlacementPositiveTest(record, contentKey, reviewStatus)
    && record.positive_test !== placementSentencePositiveTest
  ) {
    throw new Error(`${contentKey} must carry positive_test="${placementSentencePositiveTest}" before dashboard import.`);
  }

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
      positive_test: record.positive_test ?? null,
      intention: record.intention ?? null,
      ritual: record.ritual ?? null,
      energy: record.energy ?? null
    },
    block_type: blockTypeForPackageRecord(contentRole, contentKey),
    lane: serving.lane,
    review_state: serving.reviewState,
    evergreen: true,
    evergreen_at: new Date().toISOString(),
    evergreen_by: importBatchId,
    facts: {
      fallbackArchitectureV3: true,
      packageVersion: packageManifest.packageVersion,
      packageContentHash: packageManifest.contentHash,
      packageKeyManifestHash: packageManifest.keyManifestHash,
      packageKeyCount: packageManifest.keyCount,
      packageBucket: bucket,
      content_role: contentRole,
      review_status: reviewStatus,
      positive_test: record.positive_test ?? null,
      readerServing: serving.status === "LIVE" && serving.lane === "serving" && !serving.reviewState
    },
    knowledge_ids: [],
    source_snapshot: {
      contentType: bucket,
      content_role: contentRole,
      review_status: reviewStatus,
      positive_test: record.positive_test ?? null,
      approved_via: record.approved_via ?? null,
      source_keys: record.source_keys ?? [],
      importBatchId,
      sourcePackage: "tldrastro-fallback-architecture-v3",
      sourceFile: bucket,
      packageVersion: packageManifest.packageVersion,
      packageContentHash: packageManifest.contentHash,
      packageKeyManifestHash: packageManifest.keyManifestHash,
      packageKeyCount: packageManifest.keyCount,
      note: "V3 package mirror for dashboard editing. fallback_source rows are source material and must never render directly."
    },
    reviewer_notes: String(record.note ?? record.notes ?? "").trim(),
    prompt_version: importBatchId,
    provider: "tldrastro-fallback-architecture-v3",
    model: "manual",
    updated_at: new Date().toISOString()
  };
}

function readPackageSources() {
  const sourceRows = readJson("source-rows/fallback-source-rows-v3.json");
  const authoredRows = readJson("source-rows/transit-synastry-rows-v1.json");
  const bondLanguagePass2 = readJson("source-rows/bond-language-pass-2.json");
  const lunationBlendRows = readJson("source-rows/lunation-blend-units-v1.json");
  const placementInterimRows = readJson("source-rows/placement-interim-fixes-v1.json");
  const weeklyRows = readJson("source-rows/station-cards-week-openers-v1.json");
  const templateRows = readJson("templates/fallback-templates-v3.json");

  return {
    sourceRows,
    authoredRows,
    bondLanguagePass2,
    lunationBlendRows,
    placementInterimRows,
    weeklyRows,
    templateRows
  };
}

function readerEligibleReviewStatus(row, allowBlank = false) {
  const reviewStatus = String(row.review_status ?? "").trim().toLowerCase();

  return ["approved", "approved_reuse", "reviewed"].includes(reviewStatus)
    || (allowBlank && !reviewStatus);
}

function packageRowsWithLatestEligibleOverride(rows, allowBlank = false) {
  const candidates = new Map();
  for (const row of rows) {
    const keyed = candidates.get(row.contentKey) ?? [];
    keyed.push(row);
    candidates.set(row.contentKey, keyed);
  }

  return [...candidates.values()]
    .map((keyed) => [...keyed]
      .reverse()
      .find((row) => readerEligibleReviewStatus(row, allowBlank)))
    .filter(Boolean);
}

function readerPackageBundle(sources) {
  return {
    transitLib: {
      authoredCards: packageRowsWithLatestEligibleOverride([
        ...sources.authoredRows.authoredCards,
        ...sources.lunationBlendRows.authoredCards,
        ...sources.weeklyRows
      ])
    },
    rowsFile: {
      hookRows: packageRowsWithLatestEligibleOverride([
        ...sources.sourceRows.hookRows,
        ...sources.lunationBlendRows.hookRows,
        ...sources.bondLanguagePass2.rows
      ]),
      vocabularyRows: packageRowsWithLatestEligibleOverride([
        ...sources.sourceRows.vocabularyRows,
        ...sources.placementInterimRows.vocabularyRows
      ])
    },
    templatesFile: {
      templates: packageRowsWithLatestEligibleOverride([
        ...sources.templateRows.templates,
        ...sources.placementInterimRows.templates
      ], true)
    }
  };
}

function materializeRows(sources) {
  const rows = [
    ...sources.authoredRows.authoredCards.map((row) => mapPackageRecord(row, "authored-content")),
    ...sources.lunationBlendRows.authoredCards.map((row) => mapPackageRecord(row, "authored-content")),
    ...sources.weeklyRows.map((row) => mapPackageRecord(row, "authored-content")),
    ...sources.sourceRows.hookRows.map((row) => mapPackageRecord(row, "fallback-system")),
    ...sources.lunationBlendRows.hookRows.map((row) => mapPackageRecord(row, "fallback-system")),
    ...sources.bondLanguagePass2.rows.map((row) => mapPackageRecord(row, "fallback-system")),
    ...sources.sourceRows.vocabularyRows.map((row) => mapPackageRecord(row, "fallback-system")),
    ...sources.placementInterimRows.vocabularyRows.map((row) => mapPackageRecord(row, "fallback-system")),
    ...sources.templateRows.templates.map((row) => mapPackageRecord(row, "fallback-system")),
    ...sources.placementInterimRows.templates.map((row) => mapPackageRecord(row, "fallback-system")),
    ...sources.sourceRows.fallbackSourceRows.map((row) => mapPackageRecord(row, "source-material"))
  ];

  // Runtime maps use later rows as intentional overrides. Mirror that exact
  // precedence while emitting one deterministic dashboard row per content key.
  return [...new Map(rows.map((row) => [row.content_key, row])).values()];
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

function restString(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}"`;
}

function restInFilter(values) {
  return `in.(${values.map(restString).join(",")})`;
}

async function deleteStaleRows(currentRows) {
  const currentKeys = new Set(currentRows.map((row) => row.content_key));
  const staleKeys = [];

  for (let offset = 0; ; offset += 1000) {
    const response = await fetch(
      `${supabaseUrl()}/rest/v1/generated_interpretations?select=id,content_key&provider=eq.tldrastro-fallback-architecture-v3&order=content_key.asc,id.asc&limit=1000&offset=${offset}`,
      {
        method: "GET",
        headers: adminHeaders()
      }
    );
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(`Fallback architecture V3 stale-row scan failed with ${response.status}: ${JSON.stringify(payload)}`);
    }

    for (const row of payload ?? []) {
      if (row?.content_key && !currentKeys.has(row.content_key)) {
        staleKeys.push(row.content_key);
      }
    }

    if (!Array.isArray(payload) || payload.length < 1000) {
      break;
    }
  }

  for (let index = 0; index < staleKeys.length; index += 100) {
    const batch = staleKeys.slice(index, index + 100);
    const response = await fetch(
      `${supabaseUrl()}/rest/v1/generated_interpretations?provider=eq.tldrastro-fallback-architecture-v3&content_key=${encodeURIComponent(restInFilter(batch))}`,
      {
        method: "DELETE",
        headers: adminHeaders({ prefer: "return=minimal" })
      }
    );
    const payload = await response.text().catch(() => "");

    if (!response.ok) {
      throw new Error(`Fallback architecture V3 stale-row delete failed with ${response.status}: ${payload}`);
    }
  }

  return staleKeys.length;
}

async function readImportedRows() {
  const imported = [];

  for (let offset = 0; ; offset += 1000) {
    const response = await fetch(
      `${supabaseUrl()}/rest/v1/generated_interpretations?select=id,content_key,surface,mode,status,lane,review_state,event_type,target_date,headline,summary,body,sections,block_type,facts,source_snapshot,prompt_version,provider,model&provider=eq.tldrastro-fallback-architecture-v3&order=content_key.asc,id.asc&limit=1000&offset=${offset}`,
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

function stableValue(value) {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stableValue(value[key])])
  );
}

function mirrorComparable(row) {
  return stableValue({
    content_key: row.content_key,
    surface: row.surface,
    mode: row.mode,
    status: row.status,
    lane: row.lane,
    review_state: row.review_state,
    event_type: row.event_type,
    target_date: row.target_date,
    headline: row.headline,
    summary: row.summary,
    body: row.body,
    sections: row.sections,
    block_type: row.block_type,
    facts: row.facts,
    source_snapshot: row.source_snapshot,
    prompt_version: row.prompt_version,
    provider: row.provider,
    model: row.model
  });
}

function verifyImportedMirror(expectedRows, expectedCounts, importedRows) {
  const liveCounts = importedCounts(importedRows);
  const expectedKeys = new Set(expectedRows.map((row) => row.content_key));
  const importedKeys = new Set(importedRows.map((row) => row.content_key));
  const missingKeys = [...expectedKeys].filter((key) => !importedKeys.has(key));
  const staleKeys = [...importedKeys].filter((key) => !expectedKeys.has(key));
  const expectedByKey = new Map(expectedRows.map((row) => [row.content_key, row]));
  const importedByKey = new Map(importedRows.map((row) => [row.content_key, row]));
  const changedKeys = [...expectedKeys].filter((key) => (
    importedByKey.has(key)
    && JSON.stringify(mirrorComparable(expectedByKey.get(key))) !== JSON.stringify(mirrorComparable(importedByKey.get(key)))
  ));

  for (const [bucket, expected] of Object.entries(expectedCounts)) {
    const actual = liveCounts[bucket];

    if (actual !== expected) {
      throw new Error(`Dashboard mirror count mismatch for ${bucket}: expected ${expected}, received ${actual}.`);
    }
  }

  if (missingKeys.length || staleKeys.length) {
    throw new Error(
      `Dashboard mirror key mismatch: ${missingKeys.length} missing, ${staleKeys.length} stale.`
    );
  }

  if (importedRows.length !== expectedRows.length) {
    throw new Error(
      `Dashboard mirror row mismatch: expected ${expectedRows.length}, received ${importedRows.length}.`
    );
  }

  if (changedKeys.length) {
    throw new Error(
      `Dashboard mirror content mismatch: ${changedKeys.length} rows differ (${changedKeys.slice(0, 10).join(", ")}).`
    );
  }

  return liveCounts;
}

loadLocalWebEnv();

const packageSources = readPackageSources();
packageManifest = createPackageManifest(readerPackageBundle(packageSources), PACKAGE_VERSION);
const rows = materializeRows(packageSources);
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
  packageManifest,
  counts,
  rows
}, null, 2)}\n`);

console.log(`materialized ${rows.length} V3 dashboard rows -> ${path.relative(repoRoot, outPath)}`);
console.log(JSON.stringify({ packageManifest }, null, 2));
console.log(JSON.stringify(counts, null, 2));

if (apply) {
  const upserted = await upsertRows(rows);
  console.log(`upserted ${upserted.length} V3 dashboard rows into generated_interpretations`);
  const deleted = await deleteStaleRows(rows);
  console.log(`deleted ${deleted} stale V3 dashboard rows from generated_interpretations`);
}

if (verify) {
  const importedRows = await readImportedRows();
  const liveCounts = verifyImportedMirror(rows, counts, importedRows);
  console.log(`verified ${importedRows.length} imported V3 dashboard rows in generated_interpretations`);
  console.log(JSON.stringify(liveCounts, null, 2));
}
