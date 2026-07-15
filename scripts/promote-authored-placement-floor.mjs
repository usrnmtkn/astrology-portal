#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const BODY_SLUGS = new Map([
  ["north-node", "north_node"],
  ["north node", "north_node"],
  ["true-node", "north_node"],
  ["true node", "north_node"],
  ["south-node", "south_node"],
  ["south node", "south_node"]
]);

function hasArg(name) {
  return process.argv.includes(name);
}

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
  const raw = String(value ?? "").trim().toLowerCase().replace(/_/g, "-");
  return BODY_SLUGS.get(raw) ?? raw.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function titleize(value) {
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ordinalHouse(house) {
  const number = Number(String(house).replace(/\D/g, ""));
  const suffix = number % 10 === 1 && number !== 11
    ? "st"
    : number % 10 === 2 && number !== 12
      ? "nd"
      : number % 10 === 3 && number !== 13
        ? "rd"
        : "th";
  return `${number}${suffix}`;
}

function readReviewedRows(fileName) {
  const filePath = path.join(repoRoot, "tldr-astro-phrasebank/phrasebank", fileName);
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!Array.isArray(data.reviewed)) {
    throw new Error(`${fileName} does not contain a reviewed[] array.`);
  }
  return data.reviewed;
}

function authoredPlacementRows(batchId) {
  const signRows = readReviewedRows("cc-planet-in-sign-reviewed.json").map((row) => {
    const body = slug(row.body);
    const sign = slug(row.sign);
    const contentKey = `natal.sign.${body}.${sign}`;
    const text = String(row.natal_sign_story ?? "").trim();

    if (!text) throw new Error(`${row.id} is missing natal_sign_story.`);

    return {
      content_key: contentKey,
      surface: "natal",
      mode: "in_depth",
      status: "LIVE",
      lane: "serving",
      review_state: null,
      event_type: "natal-sign",
      target_date: null,
      facts: {
        tldrStore: {
          originalKey: row.id,
          lane: "serving",
          sourceStatus: "REVIEWED",
          review: null,
          action: "PROMOTE_AUTHORED_PLACEMENT_FLOOR",
          targetContentFamily: "natal-sign",
          surfaceEligibility: ["natal"],
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
        sourceField: "natal_sign_story",
        body,
        sign,
        tier: "REVIEWED",
        originalId: row.id,
        originalKey: row.id,
        sourceKeys: row.source_keys ?? [],
        importBatchId: batchId,
        servingFloor: true,
        adminEditable: true,
        servingRule: "Authored placement floor row serves verbatim with LIVE + lane=serving + review_state IS NULL."
      },
      prompt_version: row.tone_version ?? "marie-calibrated-v1",
      provider: "manual",
      model: "compiled-phrasebank-authored-placement-floor",
      headline: `${titleize(body)} in ${titleize(sign)}`,
      summary: text,
      body: text,
      sections: {
        natal_sign_story: text,
        collective_shift: row.collective_shift ?? null,
        surfaceField: "natal_sign_story",
        sourceSurfaces: row.surfaces ?? []
      },
      block_type: "sign",
      reviewer_notes: row.review_note ?? "",
      flags: [],
      evergreen: true
    };
  });

  const houseRows = readReviewedRows("cc-planet-in-house-reviewed.json").map((row) => {
    const body = slug(row.body);
    const house = Number(row.house);
    const contentKey = `natal.house.${body}.house_${house}`;
    const text = String(row.house_integration ?? "").trim();

    if (!text) throw new Error(`${row.id} is missing house_integration.`);

    return {
      content_key: contentKey,
      surface: "natal",
      mode: "in_depth",
      status: "LIVE",
      lane: "serving",
      review_state: null,
      event_type: "natal-house",
      target_date: null,
      facts: {
        tldrStore: {
          originalKey: row.id,
          lane: "serving",
          sourceStatus: "REVIEWED",
          review: null,
          action: "PROMOTE_AUTHORED_PLACEMENT_FLOOR",
          targetContentFamily: "natal-house",
          surfaceEligibility: ["natal"],
          importBatchId: batchId,
          flags: [],
          servingFloor: true,
          availableModes: ["in_depth"]
        }
      },
      knowledge_ids: Array.isArray(row.source_keys) ? [row.id, ...row.source_keys] : [row.id],
      source_snapshot: {
        source: "tldr-astro-phrasebank",
        file: "tldr-astro-phrasebank/phrasebank/cc-planet-in-house-reviewed.json",
        sourceFile: "tldr-astro-phrasebank/phrasebank/cc-planet-in-house-reviewed.json",
        contentType: "cc-planet-in-house-reviewed",
        sourceField: "house_integration",
        body,
        house,
        tier: "REVIEWED",
        originalId: row.id,
        originalKey: row.id,
        sourceKeys: row.source_keys ?? [],
        importBatchId: batchId,
        servingFloor: true,
        adminEditable: true,
        servingRule: "Authored placement floor row serves verbatim with LIVE + lane=serving + review_state IS NULL."
      },
      prompt_version: row.tone_version ?? "marie-calibrated-v1",
      provider: "manual",
      model: "compiled-phrasebank-authored-placement-floor",
      headline: `${titleize(body)} in the ${ordinalHouse(house)} house`,
      summary: text,
      body: text,
      sections: {
        house_domain: row.house_domain ?? null,
        house_integration: text,
        home_scene: row.home_scene ?? null,
        surfaceField: "house_integration",
        sourceSurfaces: row.surfaces ?? []
      },
      block_type: "house",
      reviewer_notes: row.review_note ?? "",
      flags: [],
      evergreen: true
    };
  });

  if (signRows.length !== 120 || houseRows.length !== 120) {
    throw new Error(`Expected 120 sign + 120 house rows, got ${signRows.length} + ${houseRows.length}.`);
  }

  return [...signRows, ...houseRows];
}

async function fetchRowsByKeys(supabase, keys) {
  const rows = [];
  for (let index = 0; index < keys.length; index += 100) {
    const batch = keys.slice(index, index + 100);
    const { data, error } = await supabase
      .from("generated_interpretations")
      .select("id,content_key,status,lane,review_state,body,summary,sections,source_snapshot,facts,flags,updated_at")
      .in("content_key", batch)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    rows.push(...(data ?? []));
  }
  return rows;
}

async function fetchLegacyScaffoldRows(supabase) {
  const rows = [];
  const pageSize = 1000;
  const legacyPattern = /through\s+[^.\n]*conditions|coloring the current sky|meets life through|becomes easier to notice|core ways of choosing|brings\s+[^.\n]*through|reviewed placement bank|Use the calculated|into\s+[^.\n]*expression/i;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("generated_interpretations")
      .select("id,content_key,status,lane,review_state,body,summary,sections,source_snapshot,facts,flags,updated_at")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page.filter((row) => legacyPattern.test([
      row.body,
      row.summary,
      JSON.stringify(row.sections ?? {})
    ].filter(Boolean).join("\n"))));
    if (page.length < pageSize) break;
  }

  return rows.filter((row) => row.status === "LIVE");
}

async function upsertPlacementRows(supabase, desiredRows, dryRun) {
  const existingRows = await fetchRowsByKeys(supabase, desiredRows.map((row) => row.content_key));
  const existingByKey = new Map();
  for (const row of existingRows) {
    const list = existingByKey.get(row.content_key) ?? [];
    list.push(row);
    existingByKey.set(row.content_key, list);
  }

  const inserted = [];
  const updated = [];
  const archivedDuplicates = [];

  for (const desired of desiredRows) {
    const existing = existingByKey.get(desired.content_key) ?? [];
    const preferred = existing.find((row) => {
      const source = JSON.stringify(row.source_snapshot ?? {});
      return source.includes(desired.source_snapshot.file);
    }) ?? existing[0];

    if (!preferred) {
      inserted.push(desired.content_key);
      if (!dryRun) {
        const { error } = await supabase.from("generated_interpretations").insert(desired);
        if (error) throw error;
      }
      continue;
    }

    updated.push(desired.content_key);
    if (!dryRun) {
      const { error } = await supabase
        .from("generated_interpretations")
        .update(desired)
        .eq("id", preferred.id);
      if (error) throw error;
    }

    const duplicates = existing.filter((row) => row.id !== preferred.id);
    for (const duplicate of duplicates) {
      archivedDuplicates.push(duplicate.content_key);
      if (!dryRun) {
        const { error } = await supabase
          .from("generated_interpretations")
          .update({
            status: "ARCHIVED",
            lane: "archived",
            review_state: "replaced_by_authored_placement_floor",
            flags: [...new Set([...(Array.isArray(duplicate.flags) ? duplicate.flags : []), "REPLACED_BY_AUTHORED_PLACEMENT_FLOOR"])]
          })
          .eq("id", duplicate.id);
        if (error) throw error;
      }
    }
  }

  return { archivedDuplicates, inserted, updated };
}

async function archiveLegacyScaffoldRows(supabase, rows, dryRun) {
  if (dryRun || rows.length === 0) return;

  for (const row of rows) {
    const { error } = await supabase
      .from("generated_interpretations")
      .update({
        status: "ARCHIVED",
        lane: "archived",
        review_state: "legacy_scaffold_archived",
        flags: [...new Set([...(Array.isArray(row.flags) ? row.flags : []), "LEGACY_SCAFFOLD_ARCHIVED"])]
      })
      .eq("id", row.id);
    if (error) throw error;
  }
}

async function verifyLiveCoverage(supabase, desiredRows) {
  const rows = await fetchRowsByKeys(supabase, desiredRows.map((row) => row.content_key));
  const liveByKey = new Map();
  for (const row of rows) {
    if (row.status === "LIVE" && row.lane === "serving" && row.review_state === null) {
      const list = liveByKey.get(row.content_key) ?? [];
      list.push(row);
      liveByKey.set(row.content_key, list);
    }
  }

  const missing = [];
  const duplicates = [];
  const mismatched = [];

  for (const desired of desiredRows) {
    const live = liveByKey.get(desired.content_key) ?? [];
    if (live.length === 0) missing.push(desired.content_key);
    if (live.length > 1) duplicates.push(desired.content_key);
    if (live[0] && String(live[0].body ?? "").trim() !== desired.body) {
      mismatched.push(desired.content_key);
    }
  }

  return { duplicates, liveRows: [...liveByKey.values()].flat().length, mismatched, missing };
}

async function main() {
  const env = {
    ...parseEnvFile(path.join(repoRoot, "apps/web/.env.local")),
    ...parseEnvFile(path.join(repoRoot, ".env.local"))
  };
  const supabaseUrl = requiredEnv(env, "VITE_SUPABASE_URL");
  const serviceRoleKey = requiredEnv(env, "SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const dryRun = hasArg("--dry-run");
  const batchId = `authored-placement-floor-${new Date().toISOString()}`;
  const desiredRows = authoredPlacementRows(batchId);
  const legacyScaffoldRows = await fetchLegacyScaffoldRows(supabase);
  const result = await upsertPlacementRows(supabase, desiredRows, dryRun);

  await archiveLegacyScaffoldRows(supabase, legacyScaffoldRows, dryRun);

  const verification = dryRun
    ? { duplicates: [], liveRows: null, mismatched: [], missing: [] }
    : await verifyLiveCoverage(supabase, desiredRows);

  console.log(JSON.stringify({
    mode: dryRun ? "DRY_RUN" : "IMPORT",
    desiredRows: desiredRows.length,
    desiredSignRows: desiredRows.filter((row) => row.event_type === "natal-sign").length,
    desiredHouseRows: desiredRows.filter((row) => row.event_type === "natal-house").length,
    inserted: result.inserted.length,
    updated: result.updated.length,
    archivedDuplicateRows: result.archivedDuplicates.length,
    archivedLegacyScaffoldRows: legacyScaffoldRows.length,
    legacyScaffoldSamples: legacyScaffoldRows.slice(0, 12).map((row) => ({
      id: row.id,
      content_key: row.content_key,
      status: row.status,
      body: String(row.body ?? "").slice(0, 120)
    })),
    verification
  }, null, 2));

  if (!dryRun && (verification.missing.length || verification.duplicates.length || verification.mismatched.length)) {
    throw new Error("Authored placement floor verification failed.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
