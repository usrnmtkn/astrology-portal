#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const apply = process.argv.includes("--apply");
const deleteRows = process.argv.includes("--delete");

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

  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = unquoteEnvValue(trimmed.slice(separatorIndex + 1));

    if (/^[A-Za-z_][A-Za-z0-9_]*$/u.test(key) && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
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

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nestedValues(value) {
  if (!isObject(value)) return [];

  return Object.values(value).flatMap((entry) => {
    if (typeof entry === "string") return [entry];
    if (isObject(entry)) return nestedValues(entry);
    if (Array.isArray(entry)) return entry.flatMap((item) => (
      typeof item === "string" ? [item] : isObject(item) ? nestedValues(item) : []
    ));
    return [];
  });
}

function isLegacyNatalAspectRow(row) {
  const contentKey = String(row.content_key ?? "");
  if (!contentKey.startsWith("natal.aspect.")) return false;

  const snapshot = isObject(row.source_snapshot) ? row.source_snapshot : {};
  const facts = isObject(row.facts) ? row.facts : {};
  const search = [
    row.provider,
    row.model,
    row.prompt_version,
    row.reviewer_notes,
    snapshot.package,
    snapshot.sourceFile,
    snapshot.source_file,
    snapshot.sourceType,
    snapshot.source_type,
    snapshot.importBatchId,
    facts.package,
    facts.source,
    ...nestedValues(snapshot),
    ...nestedValues(facts)
  ].join(" ");

  return /cc-natal-source-grounded-bundle|source-grounded natal aspect|phrasebank-import|phrasebank\/cc-natal-source-grounded-bundle/iu.test(search);
}

function countBy(rows, getValue) {
  return rows.reduce((counts, row) => {
    const value = String(getValue(row) ?? "none");
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

async function fetchAllNatalAspectRows() {
  const rows = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const params = new URLSearchParams({
      select: "id,content_key,status,lane,review_state,provider,model,prompt_version,reviewer_notes,facts,source_snapshot",
      content_key: "like.natal.aspect.%",
      order: "content_key.asc",
      limit: String(limit),
      offset: String(offset)
    });

    const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?${params}`, {
      headers: adminHeaders()
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(`Supabase legacy natal aspect query failed with ${response.status}: ${JSON.stringify(payload)}`);
    }

    rows.push(...payload);
    if (!Array.isArray(payload) || payload.length < limit) break;
    offset += limit;
  }

  return rows;
}

async function patchRows(rows) {
  const archivedAt = new Date().toISOString();
  const updated = [];

  for (let index = 0; index < rows.length; index += 100) {
    const batch = rows.slice(index, index + 100);
    const ids = batch.map((row) => row.id).join(",");
    const body = {
      status: "ARCHIVED",
      lane: "reference",
      review_state: "legacy-natal-aspect-decommissioned",
      reviewer_notes: "Legacy source-grounded natal aspect phrasebank row decommissioned. Use authored dashboard rows or fallbackArchitectureV3 fallback hooks instead.",
      updated_at: archivedAt
    };
    const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?id=in.(${ids})`, {
      method: "PATCH",
      headers: adminHeaders({ prefer: "return=representation" }),
      body: JSON.stringify(body)
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(`Supabase legacy natal aspect archive failed with ${response.status}: ${JSON.stringify(payload)}`);
    }

    updated.push(...payload);
  }

  return updated;
}

async function deleteLegacyRows(rows) {
  const deleted = [];

  for (let index = 0; index < rows.length; index += 100) {
    const batch = rows.slice(index, index + 100);
    const ids = batch.map((row) => row.id).join(",");
    const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?id=in.(${ids})`, {
      method: "DELETE",
      headers: adminHeaders({ prefer: "return=representation" })
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(`Supabase legacy natal aspect delete failed with ${response.status}: ${JSON.stringify(payload)}`);
    }

    deleted.push(...payload);
  }

  return deleted;
}

loadLocalWebEnv();

const allNatalAspectRows = await fetchAllNatalAspectRows();
const legacyRows = allNatalAspectRows.filter(isLegacyNatalAspectRow);
const action = deleteRows ? "delete" : "archive";

if (!apply) {
  console.log(JSON.stringify({
    mode: "dry-run",
    action,
    natalAspectRowsScanned: allNatalAspectRows.length,
    legacyRowsMatched: legacyRows.length,
    legacyStatusCounts: countBy(legacyRows, (row) => row.status),
    legacyReviewStateCounts: countBy(legacyRows, (row) => row.review_state),
    sampleKeys: legacyRows.slice(0, 12).map((row) => row.content_key),
    next: `Run node scripts/decommission-legacy-natal-aspect-rows.mjs --apply${deleteRows ? " --delete" : ""} to ${action} matched rows.`
  }, null, 2));
  process.exit(0);
}

const changedRows = deleteRows
  ? await deleteLegacyRows(legacyRows)
  : await patchRows(legacyRows);

console.log(JSON.stringify({
  mode: "apply",
  action,
  natalAspectRowsScanned: allNatalAspectRows.length,
  legacyRowsMatched: legacyRows.length,
  changedRows: changedRows.length,
  changedStatusCounts: countBy(changedRows, (row) => row.status),
  changedReviewStateCounts: countBy(changedRows, (row) => row.review_state),
  sampleKeys: changedRows.slice(0, 12).map((row) => row.content_key)
}, null, 2));
