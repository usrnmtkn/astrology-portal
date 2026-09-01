#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const manifestPath = path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/authored-inputs/calendar-aspect-content-studio-batch-2a-v1.json"
);
const sourcePath = path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/source-rows/sky-aspect-phrasebook-v1.json"
);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const apply = process.argv.includes("--apply");

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function title(value) {
  return String(value)
    .trim()
    .replace(/[-_]+/gu, " ")
    .replace(/\b\w/gu, (match) => match.toUpperCase());
}

function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function unquoteEnvValue(value) {
  const trimmed = value.trim();
  const quote = trimmed[0];
  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) return trimmed.slice(1, -1);
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
    if (process.env[key] !== undefined) continue;
    process.env[key] = unquoteEnvValue(trimmed.slice(separatorIndex + 1));
  }
}

function validateManifest() {
  if (manifest.schema !== "tldr.calendar-aspect-content-studio-batch.v1") {
    throw new Error("Unexpected Calendar aspect Content Studio batch schema.");
  }
  if (manifest.review_status !== "approved" || manifest.owner_approved !== true) {
    throw new Error("Batch 2A must carry explicit owner approval before it can be staged in Content Studio.");
  }
  if (manifest.serving_enabled !== false) {
    throw new Error("Batch 2A Content Studio seed must remain non-serving.");
  }
  if (!Array.isArray(manifest.rows) || manifest.rows.length !== 24) {
    throw new Error("Batch 2A must contain exactly 24 Venus/Saturn square rewrites.");
  }

  const keys = new Set();
  for (const row of manifest.rows) {
    if (!/^fallback-hook\/sky-aspect-sign\/venus\/[a-z-]+\/square\/saturn\/[a-z-]+$/u.test(row.contentKey)) {
      throw new Error(`Unexpected Batch 2A content key: ${row.contentKey}`);
    }
    if (keys.has(row.contentKey)) throw new Error(`Duplicate Batch 2A content key: ${row.contentKey}`);
    keys.add(row.contentKey);
    if (!row.body?.trim()) throw new Error(`${row.contentKey} has no approved body.`);
    if (row.body.includes("—")) throw new Error(`${row.contentKey} contains an em dash.`);
    const hash = sha256(row.body);
    if (hash !== row.bodySha256) {
      throw new Error(`${row.contentKey} body hash drifted: expected ${row.bodySha256}, got ${hash}.`);
    }
  }
  return keys;
}

function sourceRowsByKey() {
  return new Map((source.hookRows ?? []).map((row) => [row.contentKey, row]));
}

function buildStudioBaseline(sourceRow) {
  const parts = String(sourceRow.contentKey).split("/");
  if (parts.length !== 7) throw new Error(`Cannot parse sign-specific aspect key ${sourceRow.contentKey}.`);
  const [, , bodyA, signA, aspectType, bodyB, signB] = parts;
  const headline = `${title(bodyA)} in ${title(signA)} ${aspectType} ${title(bodyB)} in ${title(signB)}`;
  const sourceBaseline = {
    ...structuredClone(sourceRow),
    Headline: headline,
    Body: sourceRow.body_you,
    BodyA: bodyA,
    SignA: signA,
    BodyB: bodyB,
    SignB: signB,
    AspectType: aspectType
  };
  return {
    ...structuredClone(sourceRow),
    Headline: headline,
    Body: sourceRow.body_you,
    BodyA: bodyA,
    SignA: signA,
    BodyB: bodyB,
    SignB: signB,
    AspectType: aspectType,
    contentKey: sourceRow.contentKey,
    headline,
    studio_content_type: "aspect",
    studio_editable_fields: [
      { path: "Headline", label: "Headline" },
      { path: "Body", label: "Body" }
    ],
    studio_read_only_fields: [
      "contentKey", "BodyA", "SignA", "BodyB", "SignB", "AspectType",
      "calculatedDate", "calculatedOrb", "review_status", "source_keys", "approved_via"
    ],
    studio_source_baseline: sourceBaseline,
    studio_governed_source_record: structuredClone(sourceRow),
    source_baseline_sha256: sha256(JSON.stringify(sourceBaseline)),
    studio_provenance: {
      reviewStatus: sourceRow.review_status,
      approvedVia: sourceRow.approved_via ?? null,
      sourceKeys: sourceRow.source_keys ?? []
    },
    studio_version_status: sourceRow.review_status === "approved" ? "approved-baseline" : "reviewed-baseline",
    owner_approved: sourceRow.review_status === "approved",
    serving_enabled: true,
    studio_preview_requires: ["calculatedDate", "calculatedOrb"],
    note: "Governed Calendar aspect baseline. Reader-copy edits are staged as separate non-serving Content Studio drafts."
  };
}

function buildDraftRows() {
  const approvedKeys = validateManifest();
  const sourceByKey = sourceRowsByKey();
  const now = new Date().toISOString();
  const rows = [];

  for (const approved of manifest.rows) {
    const sourceRow = sourceByKey.get(approved.contentKey);
    if (!sourceRow) throw new Error(`Batch 2A source row is missing: ${approved.contentKey}`);
    if (!["reviewed", "approved"].includes(String(sourceRow.review_status))) {
      throw new Error(`${approved.contentKey} has unsupported source review status ${sourceRow.review_status}.`);
    }

    const baseline = buildStudioBaseline(sourceRow);
    const draft = {
      ...structuredClone(baseline),
      Body: approved.body,
      review_status: "approved",
      studio_version_status: "owner-approved-draft",
      owner_approved: true,
      serving_enabled: false,
      approved_via: manifest.approval_record,
      owner_approval_id: manifest.batch_id,
      owner_approved_fields: ["Body"],
      studio_owner_approval: {
        batchId: manifest.batch_id,
        approvedAt: manifest.approved_at,
        approvalRecord: manifest.approval_record,
        bodySha256: approved.bodySha256
      },
      note: "Owner-approved Calendar aspect rewrite. Content Studio draft only; serving baseline remains unchanged until a separate promotion."
    };

    rows.push({
      content_key: approved.contentKey,
      surface: "sky",
      mode: "studio-draft",
      status: "DRAFT",
      event_type: "sky-v4-governed-aspect-draft",
      target_date: null,
      facts: {
        content_role: sourceRow.content_role,
        review_status: "approved",
        readerServing: false,
        calendarAspectBatch: manifest.batch_id,
        bodySha256: approved.bodySha256
      },
      knowledge_ids: [],
      source_snapshot: {
        contentType: "fallback-system",
        content_role: sourceRow.content_role,
        review_status: "approved",
        sourceFile: manifest.source_family,
        sourcePackage: "tldrastro-fallback-architecture-v3",
        ownerApproval: {
          approved: true,
          approvedAt: manifest.approved_at,
          source: "owner-approval-record",
          approvalRecord: manifest.approval_record,
          batchId: manifest.batch_id,
          contentKey: approved.contentKey,
          bodySha256: approved.bodySha256
        },
        servingEnabled: false
      },
      lane: "reference",
      review_state: "serving-disabled",
      evergreen: true,
      evergreen_at: now,
      evergreen_by: manifest.batch_id,
      block_type: "fallback_hook",
      prompt_version: "calendar-aspect-owner-approved-studio-draft-v1",
      provider: "owner-content-studio",
      model: "manual",
      headline: draft.Headline,
      summary: "",
      body: approved.body,
      sections: {
        packageRecord: baseline,
        packageOriginalRecord: baseline,
        packageDraft: draft,
        body_you: null,
        body_they: null,
        contentStudioOwnerApproval: draft.studio_owner_approval
      },
      reviewer_notes: "Batch 2A exact wording is owner-approved. This row is a non-serving Content Studio draft; do not replace reader-serving copy without a separate promotion.",
      updated_at: now,
      published_at: null
    });
  }

  if (new Set(rows.map((row) => row.content_key)).size !== approvedKeys.size) {
    throw new Error("Batch 2A draft row count changed after source validation.");
  }
  return rows;
}

function supabaseUrl() {
  return String(process.env.SUPABASE_URL ?? requireEnv("VITE_SUPABASE_URL")).replace(/\/$/u, "");
}

function adminHeaders(extra = {}) {
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return {
    apikey: key,
    authorization: `Bearer ${key}`,
    "content-type": "application/json",
    ...extra
  };
}

async function applyDraftRows(rows) {
  loadLocalWebEnv();
  const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?on_conflict=content_key,target_date,mode`, {
    method: "POST",
    headers: adminHeaders({ prefer: "resolution=merge-duplicates,return=representation" }),
    body: JSON.stringify(rows)
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Batch 2A Content Studio seed failed with ${response.status}: ${JSON.stringify(payload)}`);
  }
  if (!Array.isArray(payload) || payload.length !== rows.length) {
    throw new Error(`Batch 2A Content Studio seed returned ${Array.isArray(payload) ? payload.length : 0} rows; expected ${rows.length}.`);
  }
  for (const row of payload) {
    if (row.status !== "DRAFT" || row.mode !== "studio-draft" || row.review_state !== "serving-disabled") {
      throw new Error(`Unsafe Content Studio state returned for ${row.content_key}.`);
    }
  }
  return payload;
}

const rows = buildDraftRows();
if (!apply) {
  console.log(JSON.stringify({
    mode: "dry-run",
    batchId: manifest.batch_id,
    rowCount: rows.length,
    servingEnabled: false,
    firstKey: rows[0]?.content_key,
    lastKey: rows.at(-1)?.content_key
  }, null, 2));
} else {
  const applied = await applyDraftRows(rows);
  console.log(JSON.stringify({
    mode: "applied",
    batchId: manifest.batch_id,
    rowCount: applied.length,
    servingEnabled: false
  }, null, 2));
}
