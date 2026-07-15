#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
  return env;
}

function requiredEnv(env, key) {
  const value = process.env[key] ?? env[key];
  if (!value) throw new Error(`${key} is required.`);
  return value;
}

function slug(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function titleize(value) {
  return String(value).replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function readRows() {
  const filePath = path.join(repoRoot, "tldr-astro-phrasebank/phrasebank/cc-planet-in-sign-reviewed.json");
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!Array.isArray(data.reviewed)) throw new Error("cc-planet-in-sign-reviewed.json must contain reviewed[].");
  return data.reviewed;
}

function skyRows(batchId) {
  const rows = readRows().map((row) => {
    const body = slug(row.body);
    const sign = slug(row.sign);
    const text = String(row.collective_shift ?? "").trim();
    if (!text) throw new Error(`${row.id} is missing collective_shift.`);

    return {
      content_key: `sky.placement.${body}.${sign}`,
      surface: "sky",
      mode: "in_depth",
      status: "LIVE",
      lane: "serving",
      review_state: null,
      event_type: "sky-placement",
      target_date: null,
      facts: {
        tldrStore: {
          originalKey: row.id,
          lane: "serving",
          sourceStatus: "REVIEWED",
          review: null,
          action: "PROMOTE_AUTHORED_SKY_PLACEMENT_FLOOR",
          targetContentFamily: "sky-placement",
          surfaceEligibility: ["sky"],
          importBatchId: batchId,
          flags: [],
          servingFloor: true,
          availableModes: ["in_depth"]
        }
      },
      knowledge_ids: Array.isArray(row.source_keys) ? [row.id, ...row.source_keys] : [row.id],
      source_snapshot: {
        source: "tldr-astro-phrasebank",
        file: "tldr-astro-phrasebank/phrasebank/cc-planet-in-sign-reviewed.json",
        sourceFile: "tldr-astro-phrasebank/phrasebank/cc-planet-in-sign-reviewed.json",
        contentType: "cc-planet-in-sign-reviewed",
        sourceField: "collective_shift",
        body,
        sign,
        tier: "REVIEWED",
        originalId: row.id,
        originalKey: row.id,
        sourceKeys: row.source_keys ?? [],
        importBatchId: batchId,
        servingFloor: true,
        adminEditable: true,
        servingRule: "Authored sky placement floor row serves collective_shift verbatim with LIVE + lane=serving + review_state IS NULL."
      },
      prompt_version: row.tone_version ?? "marie-calibrated-v1",
      provider: "manual",
      model: "compiled-phrasebank-authored-sky-placement-floor",
      headline: `${titleize(body)} in ${titleize(sign)}`,
      summary: text,
      body: text,
      sections: {
        collective_shift: text,
        natal_sign_story: row.natal_sign_story ?? null,
        surfaceField: "collective_shift",
        sourceSurfaces: row.surfaces ?? []
      },
      block_type: "sky_article",
      reviewer_notes: row.review_note ?? "",
      flags: [],
      evergreen: true
    };
  });

  if (rows.length !== 120) throw new Error(`Expected 120 sky placement rows, got ${rows.length}.`);
  return rows;
}

async function fetchExisting(supabase, keys) {
  const rows = [];
  for (let index = 0; index < keys.length; index += 100) {
    const { data, error } = await supabase
      .from("generated_interpretations")
      .select("id,content_key,status,lane,review_state,body,sections,source_snapshot,flags")
      .in("content_key", keys.slice(index, index + 100));
    if (error) throw error;
    rows.push(...(data ?? []));
  }
  return rows;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const env = {
    ...parseEnvFile(path.join(repoRoot, "apps/web/.env.local")),
    ...parseEnvFile(path.join(repoRoot, ".env.local"))
  };
  const supabase = createClient(requiredEnv(env, "VITE_SUPABASE_URL"), requiredEnv(env, "SUPABASE_SERVICE_ROLE_KEY"));
  const batchId = `authored-sky-placement-floor-${new Date().toISOString()}`;
  const desiredRows = skyRows(batchId);
  const existingRows = await fetchExisting(supabase, desiredRows.map((row) => row.content_key));
  const existingByKey = new Map();
  for (const row of existingRows) {
    const list = existingByKey.get(row.content_key) ?? [];
    list.push(row);
    existingByKey.set(row.content_key, list);
  }

  let inserted = 0;
  let updated = 0;
  let archivedDuplicates = 0;

  for (const desired of desiredRows) {
    const existing = existingByKey.get(desired.content_key) ?? [];
    const preferred = existing.find((row) => JSON.stringify(row.source_snapshot ?? {}).includes("cc-planet-in-sign-reviewed.json")) ?? existing[0];

    if (!preferred) {
      inserted += 1;
      if (!dryRun) {
        const { error } = await supabase.from("generated_interpretations").insert(desired);
        if (error) throw error;
      }
      continue;
    }

    updated += 1;
    if (!dryRun) {
      const { error } = await supabase.from("generated_interpretations").update(desired).eq("id", preferred.id);
      if (error) throw error;
    }

    for (const duplicate of existing.filter((row) => row.id !== preferred.id)) {
      archivedDuplicates += 1;
      if (!dryRun) {
        const { error } = await supabase.from("generated_interpretations").update({
          status: "ARCHIVED",
          lane: "archived",
          review_state: "replaced_by_authored_sky_placement_floor",
          flags: [...new Set([...(Array.isArray(duplicate.flags) ? duplicate.flags : []), "REPLACED_BY_AUTHORED_SKY_PLACEMENT_FLOOR"])]
        }).eq("id", duplicate.id);
        if (error) throw error;
      }
    }
  }

  const verificationRows = dryRun ? [] : await fetchExisting(supabase, desiredRows.map((row) => row.content_key));
  const liveRows = verificationRows.filter((row) => row.status === "LIVE" && row.lane === "serving" && row.review_state === null);
  const mismatched = dryRun ? [] : desiredRows.filter((desired) => {
    const live = liveRows.find((row) => row.content_key === desired.content_key);
    return !live || String(live.body ?? "").trim() !== desired.body;
  }).map((row) => row.content_key);

  console.log(JSON.stringify({
    mode: dryRun ? "DRY_RUN" : "IMPORT",
    desiredRows: desiredRows.length,
    inserted,
    updated,
    archivedDuplicates,
    verification: dryRun ? null : {
      liveRows: liveRows.length,
      mismatched
    }
  }, null, 2));

  if (!dryRun && (liveRows.length !== 120 || mismatched.length > 0)) {
    throw new Error("Authored sky placement floor verification failed.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
