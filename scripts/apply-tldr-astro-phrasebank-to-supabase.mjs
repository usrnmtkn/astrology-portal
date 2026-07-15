#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  generatedRowForMapping
} from "./prepare-tldr-astro-store-import.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

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

function argValue(name, fallback = null) {
  const arg = process.argv.find((item) => item.startsWith(`${name}=`));
  return arg ? arg.slice(name.length + 1) : fallback;
}

function requireEnv(name, env) {
  const value = process.env[name] ?? env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

async function supabaseFetch(pathname, options = {}, env) {
  const supabaseUrl = process.env.SUPABASE_URL ?? env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? env.VITE_SUPABASE_URL;
  if (!supabaseUrl) throw new Error("SUPABASE_URL or VITE_SUPABASE_URL is required.");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY", env);
  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/${pathname}`, {
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

function restoreRowShape(row) {
  return {
    content_key: row.content_key,
    surface: row.surface,
    mode: row.mode,
    status: row.status,
    lane: row.lane ?? "serving",
    review_state: row.review_state ?? null,
    event_type: row.event_type ?? null,
    target_date: row.target_date ?? null,
    facts: row.facts ?? {},
    knowledge_ids: row.knowledge_ids ?? [],
    source_snapshot: row.source_snapshot ?? {},
    prompt_version: row.prompt_version ?? "restored-backup",
    provider: row.provider ?? null,
    model: row.model ?? null,
    headline: row.headline ?? "",
    summary: row.summary ?? "",
    body: row.body ?? "",
    sections: row.sections ?? {},
    block_type: row.block_type ?? null,
    reviewer_notes: row.reviewer_notes ?? null,
    flags: row.flags ?? []
  };
}

function importRowShape(row) {
  return {
    content_key: row.content_key,
    surface: row.surface,
    mode: row.mode,
    status: row.status,
    lane: row.lane,
    review_state: row.review_state,
    event_type: row.event_type,
    target_date: row.target_date,
    facts: row.facts,
    knowledge_ids: row.knowledge_ids,
    source_snapshot: row.source_snapshot,
    prompt_version: row.prompt_version,
    provider: row.provider,
    model: row.model,
    headline: row.headline,
    summary: row.summary,
    body: row.body,
    sections: row.sections,
    block_type: row.block_type,
    reviewer_notes: row.reviewer_notes,
    flags: row.facts?.tldrStore?.flags ?? []
  };
}

const replaceAllowedBlockingFlags = new Set([
  "DUPLICATE_INCOMING_KEY",
  "KEY_CONFLICT",
  "LIVE_ROW_PROTECTED"
]);

const replaceAllowedConflictResults = new Set([
  "DUPLICATE_INCOMING_KEY_DIFFERENT_CONTENT",
  "DRAFT_CONFLICT_DIFFERENT_TEXT",
  "LIVE_ROW_PROTECTED"
]);

function isReplaceEligibleMapping(mapping) {
  if (!["MATCH_EXISTING", "NEW_CANONICAL_KEY", "CONFLICT"].includes(mapping.action)) return false;
  if (mapping.target_table !== "public.generated_interpretations") return false;
  if (!mapping.target_database_key) return false;
  if (mapping.action === "CONFLICT" && !replaceAllowedConflictResults.has(mapping.conflict_result)) return false;
  return !mapping.flags.some((item) => item.blocking && !replaceAllowedBlockingFlags.has(item.flag));
}

function targetKey(row) {
  return [
    row.content_key,
    row.target_date ?? "",
    row.mode ?? ""
  ].join("\u001f");
}

function modeSiblingSnapshot(row) {
  return {
    mode: row.mode,
    headline: row.headline,
    summary: row.summary,
    body: row.body,
    sections: row.sections ?? {},
    block_type: row.block_type,
    prompt_version: row.prompt_version,
    event_type: row.event_type,
    source_snapshot: row.source_snapshot ?? {}
  };
}

function mergeModeSiblings(rows) {
  const modeRank = new Map([
    ["in_depth", 0],
    ["article", 1],
    ["feed", 2]
  ]);
  const byKey = new Map();

  for (const row of rows) {
    const existing = byKey.get(row.content_key);
    if (!existing || (modeRank.get(row.mode) ?? 99) < (modeRank.get(existing.mode) ?? 99)) {
      byKey.set(row.content_key, { ...row });
    }
  }

  for (const row of rows) {
    const base = byKey.get(row.content_key);
    if (!base) continue;
    const existingSections = base.sections && typeof base.sections === "object" && !Array.isArray(base.sections)
      ? base.sections
      : {};
    base.sections = {
      ...existingSections,
      byMode: {
        ...(existingSections.byMode && typeof existingSections.byMode === "object" && !Array.isArray(existingSections.byMode)
          ? existingSections.byMode
          : {}),
        [row.mode]: modeSiblingSnapshot(row)
      }
    };
    base.facts = {
      ...(base.facts ?? {}),
      tldrStore: {
        ...(base.facts?.tldrStore ?? {}),
        availableModes: Array.from(new Set([
          ...((Array.isArray(base.facts?.tldrStore?.availableModes) ? base.facts.tldrStore.availableModes : []) ?? []),
          row.mode
        ])).sort()
      }
    };
  }

  return [...byKey.values()];
}

function dedupeForGeneratedInterpretationsUniqueIndex(rows, uniqueScope) {
  if (uniqueScope === "content-key") {
    return mergeModeSiblings(rows);
  }

  const byKey = new Map();

  for (const row of rows) {
    const key = targetKey(row);
    if (!byKey.has(key)) byKey.set(key, row);
  }

  return [...byKey.values()];
}

async function insertRows(rows, env) {
  let inserted = 0;
  for (let index = 0; index < rows.length; index += 100) {
    const batch = rows.slice(index, index + 100);
    const { payload } = await supabaseFetch(
      "generated_interpretations",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          prefer: "return=representation"
        },
        body: JSON.stringify(batch)
      },
      env
    );
    inserted += Array.isArray(payload) ? payload.length : batch.length;
  }
  return inserted;
}

async function main() {
  const apply = process.argv.includes("--replace-generated-interpretations");
  if (!apply) {
    throw new Error("Refusing to replace Supabase content without --replace-generated-interpretations.");
  }

  const env = {
    ...parseEnvFile(path.join(repoRoot, "apps/web/.env.local")),
    ...parseEnvFile(path.join(repoRoot, ".env.local"))
  };
  const mappingPath = path.resolve(
    repoRoot,
    argValue("--mapping", "scripts/generated/phrasebank-import-20260714/tldr-astro-store-import-mapping.json")
  );
  const uniqueScope = argValue("--unique-scope", "target");
  if (!["target", "content-key"].includes(uniqueScope)) {
    throw new Error("--unique-scope must be target or content-key.");
  }
  const backupDir = path.resolve(repoRoot, argValue("--backup-dir", "scripts/generated/phrasebank-import-20260714"));
  const backupPath = path.join(backupDir, `generated-interpretations-pre-phrasebank-replace-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  fs.mkdirSync(backupDir, { recursive: true });

  const mappings = JSON.parse(fs.readFileSync(mappingPath, "utf8"));
  const replaceEligibleMappings = mappings.filter(isReplaceEligibleMapping);
  const generatedRows = replaceEligibleMappings.map(generatedRowForMapping).map(importRowShape);
  const importRows = dedupeForGeneratedInterpretationsUniqueIndex(generatedRows, uniqueScope);
  const previousRows = await fetchAllGeneratedRows(env);
  fs.writeFileSync(backupPath, `${JSON.stringify(previousRows, null, 2)}\n`);

  await supabaseFetch(
    "generated_interpretations?id=not.is.null",
    {
      method: "DELETE",
      headers: {
        prefer: "return=minimal"
      }
    },
    env
  );

  try {
    const inserted = await insertRows(importRows, env);
    const afterRows = await fetchAllGeneratedRows(env);
    const liveRows = afterRows.filter((row) => row.status === "LIVE");

    console.log(`Backed up existing rows: ${previousRows.length}`);
    console.log(`Backup: ${backupPath}`);
    console.log(`Deleted existing generated_interpretations rows: ${previousRows.length}`);
    console.log(`Unique scope: ${uniqueScope}`);
    console.log(`Replace-eligible phrasebank mappings: ${replaceEligibleMappings.length}`);
    console.log(`Generated phrasebank rows before target de-dupe: ${generatedRows.length}`);
    console.log(`Phrasebank rows after ${uniqueScope === "content-key" ? "content_key merge" : "content_key/target_date/mode de-dupe"}: ${importRows.length}`);
    console.log(`Inserted phrasebank rows: ${inserted}`);
    console.log(`Verified generated_interpretations row count: ${afterRows.length}`);
    console.log(`LIVE rows after import: ${liveRows.length}`);
  } catch (error) {
    await supabaseFetch(
      "generated_interpretations?id=not.is.null",
      {
        method: "DELETE",
        headers: {
          prefer: "return=minimal"
        }
      },
      env
    );
    await insertRows(previousRows.map(restoreRowShape), env);
    throw error;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
