#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const defaultPackagePath = path.join(repoRoot, "tldr-astro-phrasebank/final/tldr-astro-authored-library-COMPLETE.json");

function argValue(name, fallback = null) {
  const arg = process.argv.find((item) => item.startsWith(`${name}=`));
  return arg ? arg.slice(name.length + 1) : fallback;
}

function hasArg(name) {
  return process.argv.includes(name);
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const env = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
  return env;
}

function requireEnv(name, env) {
  const value = process.env[name] ?? env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function supabaseUrl(env) {
  const value = process.env.SUPABASE_URL ?? env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? env.VITE_SUPABASE_URL;
  if (!value) throw new Error("SUPABASE_URL or VITE_SUPABASE_URL is required.");
  return value.replace(/\/$/, "");
}

async function supabaseFetch(pathname, options = {}, env) {
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY", env);
  const response = await fetch(`${supabaseUrl(env)}/rest/v1/${pathname}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      ...(options.headers ?? {})
    }
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`Supabase ${options.method ?? "GET"} ${pathname} failed with ${response.status}: ${JSON.stringify(payload)}`);
  }

  return { response, payload };
}

async function fetchAllGeneratedRows(env) {
  const rows = [];
  const pageSize = 1000;

  for (let offset = 0; ; offset += pageSize) {
    const { payload } = await supabaseFetch(
      `generated_interpretations?select=*&order=created_at.asc&offset=${offset}&limit=${pageSize}`,
      {},
      env
    );
    const page = Array.isArray(payload) ? payload : [];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows;
}

function normalizeKey(value) {
  return String(value ?? "").trim();
}

function isAuthoredLibraryKey(contentKey) {
  return contentKey.startsWith("cc/")
    || contentKey.startsWith("slot-template/")
    || contentKey.startsWith("slot-resolution/");
}

function isProtectedMarieRow(row) {
  const sourceSnapshot = row.source_snapshot && typeof row.source_snapshot === "object" ? row.source_snapshot : {};
  const sourceText = JSON.stringify(sourceSnapshot).toLowerCase();
  const factsText = JSON.stringify(row.facts ?? {}).toLowerCase();
  return row.status === "LIVE" && (
    sourceText.includes("ms-")
    || sourceText.includes("marie-confirmed")
    || sourceText.includes("\"tier\":\"confirmed\"")
    || factsText.includes("\"sourcestatus\":\"confirmed\"")
  );
}

function slotResolutionRows(bundle) {
  const map = bundle.slot_resolution_map ?? {};
  const templatesBySlot = new Map();
  const templates = map.templates && typeof map.templates === "object" && !Array.isArray(map.templates)
    ? map.templates
    : {};

  for (const [templateId, slots] of Object.entries(templates)) {
    if (!Array.isArray(slots)) continue;
    for (const slot of slots) {
      const list = templatesBySlot.get(slot) ?? [];
      list.push(templateId);
      templatesBySlot.set(slot, list);
    }
  }

  return Object.entries(map.resolution ?? {}).map(([slot, entry]) => {
    const kind = entry?.kind ?? "unknown";
    const source = entry?.source && typeof entry.source === "object"
      ? [entry.source.type, entry.source.category].filter(Boolean).join("/")
      : typeof entry?.source === "string"
        ? entry.source
        : null;
    const templateIds = templatesBySlot.get(slot) ?? [];
    const sourceLabel = source ? ` from ${source}` : "";
    const selectLabel = entry?.select ? ` using ${entry.select}` : "";
    const hintLabel = entry?.hint ? ` (${entry.hint})` : "";
    const fallbackLabel = entry?.fallback ? `; fallback ${entry.fallback}` : "";
    const ultimateFallbackLabel = entry?.ultimate_fallback ? `; ultimate fallback ${entry.ultimate_fallback}` : "";

    return {
      content_key: `slot-resolution/${slot}`,
      surface: "modifier",
      mode: "feed",
      status: "DRAFT",
      event_type: "slot-resolution",
      headline: `Slot resolution / ${slot}`,
      summary: `${kind}${sourceLabel}`,
      body: `${slot} resolves as ${kind}${sourceLabel}${selectLabel}${hintLabel}${fallbackLabel}${ultimateFallbackLabel}.`,
      sections: {
        slot,
        kind,
        source: entry?.source ?? null,
        scope_from: entry?.scope_from ?? null,
        select: entry?.select ?? null,
        hint: entry?.hint ?? null,
        fallback: entry?.fallback ?? null,
        ultimate_fallback: entry?.ultimate_fallback ?? null,
        templates: templateIds
      },
      facts: {
        slot,
        kind,
        templates: templateIds
      },
      knowledge_ids: [`slot-resolution/${slot}`],
      source_snapshot: {
        contentType: "slot-resolution",
        category: kind,
        slot,
        templateIds,
        version: map.version,
        sourceFile: "tldr-astro-authored-library-COMPLETE.json"
      },
      prompt_version: map.version ?? "slot-resolution-v1",
      block_type: null,
      reviewer_notes: "",
      tier: "REVIEWED",
      _bucket: "slot-resolution"
    };
  });
}

function titleFromKey(key) {
  return String(key)
    .replace(/^cc\//, "")
    .replace(/^slot-template\//, "slot template / ")
    .replace(/^slot-resolution\//, "slot resolution / ")
    .split(/[/.]/)
    .filter(Boolean)
    .map((part) => part.replace(/-/g, " "))
    .map((part) => part ? part[0].toUpperCase() + part.slice(1) : part)
    .join(" / ");
}

function reviewStateForTier(tier) {
  return tier === "CONFIRMED" ? null : "marie_signoff_required";
}

function flagsForTier(tier) {
  return tier === "CONFIRMED" ? [] : ["EDITORIAL_REVIEW_REQUIRED", "MARIE_SIGNOFF_REQUIRED"];
}

const FLOOR_VOCAB_CATEGORIES = new Set([
  "planet-vocab",
  "planet-lived",
  "lived-behaviors",
  "aspect-vocab",
  "midheaven",
  "phrase-function",
  "guide-phrase"
]);

const FLOOR_AUTHORED_CONTENT_CATEGORIES = new Set([
  "house-lived",
  "daily-action",
  "daily-closing"
]);

function isServingFloorRow(row) {
  if (row.retired === true) return false;
  if (row.serving_floor === true) return true;

  const bucket = row._bucket;
  const category = row.source_snapshot?.category ?? row.event_type ?? "";
  return bucket === "fallback"
    || bucket === "slot-template"
    || bucket === "moon-phase"
    || (bucket === "vocab" && FLOOR_VOCAB_CATEGORIES.has(category))
    || (bucket === "authored-content" && FLOOR_AUTHORED_CONTENT_CATEGORIES.has(category));
}

function statusForPackageRow(row, tier) {
  if (row.retired === true) return "ARCHIVED";
  if (tier === "CONFIRMED") return "DRAFT";
  return isServingFloorRow(row) ? "LIVE" : "DRAFT";
}

function laneForPackageRow(row, status) {
  return status === "ARCHIVED" ? "reference" : "serving";
}

function reviewStateForRow(status, tier) {
  if (status === "ARCHIVED") return "retired-unused-template";
  if (status === "LIVE" || tier === "CONFIRMED") return null;
  return reviewStateForTier(tier);
}

function flagsForRow(status, tier) {
  if (status === "ARCHIVED") return [];
  if (status === "LIVE" || tier === "CONFIRMED") return [];
  return flagsForTier(tier);
}

function rowForPackageRow(row, bundle, batchId) {
  const tier = row.tier ?? "REVIEWED";
  const contentKey = normalizeKey(row.content_key);
  const sourceSnapshot = row.source_snapshot && typeof row.source_snapshot === "object" ? row.source_snapshot : {};
  const status = statusForPackageRow(row, tier);
  const lane = laneForPackageRow(row, status);
  const reviewState = reviewStateForRow(status, tier);
  const flags = flagsForRow(status, tier);
  const servingFloor = status === "LIVE" && isServingFloorRow(row);

  return {
    content_key: contentKey,
    surface: row.surface,
    mode: row.mode ?? "feed",
    status,
    lane,
    review_state: reviewState,
    event_type: row.event_type ?? row._bucket ?? "authored-library",
    target_date: null,
    facts: {
      ...(row.facts && typeof row.facts === "object" ? row.facts : {}),
        tldrStore: {
          originalKey: contentKey,
        lane,
        sourceStatus: tier,
        review: reviewState,
        action: "FINAL_AUTHORED_LIBRARY_IMPORT",
        targetContentFamily: row._bucket ?? row.event_type ?? "authored-library",
        surfaceEligibility: [row.surface],
        importBatchId: batchId,
        sourceManifestVersion: bundle.meta?.version ?? "authored-library-complete-v1",
        flags,
        servingFloor,
        availableModes: [row.mode ?? "feed"]
      }
    },
    knowledge_ids: Array.isArray(row.knowledge_ids) && row.knowledge_ids.length ? row.knowledge_ids : [contentKey],
    source_snapshot: {
      ...sourceSnapshot,
      ...(row.retired === true ? {
        retirement: {
          disposition: "historical-source-material",
          reason: row.retirement_reason ?? "Retired legacy authored-library row."
        }
      } : {}),
      source: bundle.meta?.version ?? "authored-library-complete-v1",
      sourceFile: "tldr-astro-authored-library-COMPLETE.json",
      bucket: row._bucket ?? null,
      tier,
      originalKey: contentKey,
      importBatchId: batchId,
      coverageLedger: bundle.coverage_ledger ?? null,
      servingFloor,
      adminEditable: row.admin_editable ?? true,
      servingRule: servingFloor
        ? "Emergency-floor authored-library row serves with LIVE + lane=serving + review_state IS NULL."
        : status === "ARCHIVED"
          ? "Retired authored-library row remains historical source material and never serves."
          : "Editorial authored-library row stays DRAFT until human promotion."
    },
    prompt_version: row.prompt_version ?? bundle.meta?.version ?? "authored-library-complete-v1",
    provider: "manual",
    model: "compiled-authored-library-complete",
    headline: typeof row.headline === "string" && row.headline.trim() ? row.headline : titleFromKey(contentKey),
    summary: typeof row.summary === "string" && row.summary.trim()
      ? row.summary
      : [tier, row._bucket, row.event_type, sourceSnapshot.category].filter(Boolean).join(" · "),
    body: row.body ?? "",
    sections: row.sections && typeof row.sections === "object" ? row.sections : {},
    block_type: row.block_type ?? null,
    reviewer_notes: row.reviewer_notes ?? "",
    flags,
    evergreen: true
  };
}

function rowForSlotResolution(row, bundle, batchId) {
  return rowForPackageRow(row, bundle, batchId);
}

function dedupeRows(rows) {
  const seen = new Map();
  for (const row of rows) {
    const key = row.content_key;
    if (seen.has(key)) throw new Error(`Duplicate final import content_key: ${key}`);
    seen.set(key, row);
  }
  return [...seen.values()];
}

function buildFinalRows(bundle, batchId) {
  const contentRows = (bundle.rows ?? []).map((row) => rowForPackageRow(row, bundle, batchId));
  const slotRows = slotResolutionRows(bundle).map((row) => rowForSlotResolution(row, bundle, batchId));
  return dedupeRows([...contentRows, ...slotRows]);
}

async function insertRows(rows, env) {
  const batchSize = 250;
  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize);
    await supabaseFetch("generated_interpretations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify(batch)
    }, env);
  }
}

async function deleteRowsByKeys(keys, env) {
  const batchSize = 100;
  for (let index = 0; index < keys.length; index += batchSize) {
    const batch = keys.slice(index, index + batchSize).map(encodeURIComponent).join(",");
    await supabaseFetch(`generated_interpretations?content_key=in.(${batch})`, {
      method: "DELETE",
      headers: {
        Prefer: "return=minimal"
      }
    }, env);
  }
}

async function main() {
  const env = {
    ...parseEnvFile(path.join(repoRoot, "apps/web/.env.local")),
    ...parseEnvFile(path.join(repoRoot, ".env.local"))
  };
  const packagePath = path.resolve(argValue("--package", defaultPackagePath));
  const backupDir = path.resolve(argValue("--backup-dir", path.join(repoRoot, "scripts/generated/final-authored-library-import")));
  const batchId = argValue("--batch-id", `authored-library-complete-${new Date().toISOString()}`);
  const dryRun = hasArg("--dry-run");

  const bundle = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  const finalRows = buildFinalRows(bundle, batchId);
  const finalKeys = new Set(finalRows.map((row) => row.content_key));
  const existingRows = await fetchAllGeneratedRows(env);
  const staleRows = existingRows.filter((row) => isAuthoredLibraryKey(row.content_key));
  const keysToDelete = [...new Set([
    ...staleRows.map((row) => row.content_key),
    ...finalKeys
  ])].sort();
  const protectedRows = existingRows.filter((row) => keysToDelete.includes(row.content_key) && isProtectedMarieRow(row));

  const bucketCounts = finalRows.reduce((counts, row) => {
    const bucket = row.source_snapshot?.bucket ?? row.event_type ?? "unknown";
    counts[bucket] = (counts[bucket] ?? 0) + 1;
    return counts;
  }, {});
  const statusCounts = finalRows.reduce((counts, row) => {
    const key = `${row.status}/${row.lane ?? "none"}/${row.review_state ?? "no-review"}`;
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
  const servingFloorCounts = finalRows.reduce((counts, row) => {
    if (!row.source_snapshot?.servingFloor) return counts;
    const bucket = row.source_snapshot?.bucket ?? row.event_type ?? "unknown";
    counts[bucket] = (counts[bucket] ?? 0) + 1;
    return counts;
  }, {});
  const slotKinds = finalRows
    .filter((row) => row.event_type === "slot-resolution")
    .reduce((counts, row) => {
      const kind = row.sections?.kind ?? "unknown";
      counts[kind] = (counts[kind] ?? 0) + 1;
      return counts;
    }, {});

  console.log(JSON.stringify({
    mode: dryRun ? "DRY_RUN" : "IMPORT",
    packagePath,
    existingRows: existingRows.length,
    staleAuthoredRows: staleRows.length,
    keysToDelete: keysToDelete.length,
    finalRows: finalRows.length,
    contentRows: bundle.rows?.length ?? 0,
    slotResolutionRows: finalRows.filter((row) => row.event_type === "slot-resolution").length,
    bucketCounts,
    statusCounts,
    servingFloorCounts,
    slotKinds,
    protectedRows: protectedRows.map((row) => ({ id: row.id, content_key: row.content_key, status: row.status }))
  }, null, 2));

  if (protectedRows.length) {
    throw new Error("Safety assert failed: protected LIVE Marie/CONFIRMED rows would be replaced.");
  }

  if (dryRun) return;

  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `generated-interpretations-pre-final-authored-library-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(existingRows, null, 2));
  console.log(`Backup: ${backupPath}`);

  await deleteRowsByKeys(keysToDelete, env);
  console.log(`Deleted/replaced authored-library keys: ${keysToDelete.length}`);

  await insertRows(finalRows, env);
  console.log(`Inserted final authored-library rows: ${finalRows.length}`);

  const allRowsAfter = await fetchAllGeneratedRows(env);
  const liveRows = allRowsAfter.filter((row) => row.status === "LIVE");
  const finalRowsAfter = allRowsAfter.filter((row) => finalKeys.has(row.content_key));
  console.log(`Verified generated_interpretations row count: ${allRowsAfter.length}`);
  console.log(`Verified final package key count: ${finalRowsAfter.length}`);
  console.log(`LIVE rows after import: ${liveRows.length}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
