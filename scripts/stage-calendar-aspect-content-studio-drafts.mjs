#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  CALENDAR_ASPECT_CONTENT_STUDIO_PACKAGE_VERSION,
  CALENDAR_ASPECT_DRAFT_PACKAGE_VERSION,
  calendarAspectStudioRecord
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/calendarAspectContentStudio.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stagePath = path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/authored-inputs/calendar-aspect-consequence-first-drafts-v1.json"
);
const composedPath = path.join(repoRoot, "packages/astro-knowledge/data/sky-calendar/composed-cards-v1.json");
const defaultOutPath = path.join(repoRoot, "scripts/generated/calendar-aspect-content-studio-drafts-v1.json");
const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const verifyRemote = args.has("--verify-remote");
const outPath = process.argv.find((arg) => arg.startsWith("--out="))?.slice("--out=".length) ?? defaultOutPath;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
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
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = unquoteEnvValue(trimmed.slice(separator + 1));
    if (/^[A-Za-z_][A-Za-z0-9_]*$/u.test(key) && process.env[key] === undefined) process.env[key] = value;
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

const stage = readJson(stagePath);
const composed = readJson(composedPath);

if (stage.schema !== "tldr.calendar-aspect-content-studio-drafts.v1") {
  throw new Error("Calendar aspect stage schema mismatch.");
}
if (stage.packageVersion !== CALENDAR_ASPECT_DRAFT_PACKAGE_VERSION) {
  throw new Error("Calendar aspect stage package version mismatch.");
}
if (stage.reviewStatus !== "needs_review" || stage.ownerApproved !== false || stage.servingEnabled !== false) {
  throw new Error("Calendar aspect stage must remain needs_review, ownerApproved=false, servingEnabled=false.");
}
if (!Array.isArray(stage.drafts) || stage.drafts.length !== 24) {
  throw new Error(`Expected 24 composed Calendar aspect drafts; found ${stage.drafts?.length ?? 0}.`);
}

const uniqueKeys = new Set(stage.drafts.map((draft) => draft.contentKey));
if (uniqueKeys.size !== stage.drafts.length) throw new Error("Calendar aspect stage contains duplicate content keys.");
const composedDrafts = stage.drafts.filter((draft) => draft.sourceKind === "composed-card");
const signSpecificDrafts = stage.drafts.filter((draft) => draft.sourceKind === "sign-specific-hook");
if (composedDrafts.length !== 24 || signSpecificDrafts.length !== 0) {
  throw new Error(`Expected 24 composed drafts and no Batch 2A duplicates; found ${composedDrafts.length} + ${signSpecificDrafts.length}.`);
}
if (stage.drafts.some((draft) => /—/u.test(String(draft.body ?? "")))) {
  throw new Error("Calendar aspect drafts may not contain em dashes.");
}

const composedById = new Map((composed.cards ?? []).map((row) => [row.id, row]));

function sourceForDraft(draft) {
  const source = composedById.get(draft.contentKey);
  if (!source) throw new Error(`Missing current source for ${draft.contentKey}.`);
  return source;
}

const rows = stage.drafts.map((draft) => {
  const source = sourceForDraft(draft);
  const studio = calendarAspectStudioRecord(source, draft);
  const packageRecord = {
    ...studio,
    Body: studio.CurrentServingBody,
    studio_version_status: "approved-serving-baseline-reference",
    note: "Current serving copy retained as the immutable comparison baseline. The proposed consequence-first copy lives only in sections.packageDraft until separately approved and released."
  };
  const packageDraft = { Body: studio.Body };
  return {
    content_key: studio.contentKey,
    surface: "sky",
    mode: "studio-draft",
    status: "DRAFT",
    event_type: "calendar-aspect-content-studio-draft",
    target_date: null,
    headline: studio.Headline,
    summary: "",
    body: studio.Body,
    sections: {
      packageRecord,
      packageOriginalRecord: structuredClone(packageRecord),
      packageDraft,
      body_you: studio.Body,
      body_they: studio.Body
    },
    block_type: "fallback_hook",
    lane: "reference",
    review_state: "owner-review-required",
    evergreen: true,
    evergreen_at: stage.createdAt,
    evergreen_by: CALENDAR_ASPECT_DRAFT_PACKAGE_VERSION,
    facts: {
      fallbackArchitectureV3: true,
      readerServing: false,
      stageOnly: true,
      sourceSchemaVersion: CALENDAR_ASPECT_CONTENT_STUDIO_PACKAGE_VERSION,
      calendarAspectDraftPackage: CALENDAR_ASPECT_DRAFT_PACKAGE_VERSION,
      calendarAspectSourceKind: draft.sourceKind
    },
    knowledge_ids: [],
    source_snapshot: {
      sourcePackage: CALENDAR_ASPECT_CONTENT_STUDIO_PACKAGE_VERSION,
      sourceDraftPackage: CALENDAR_ASPECT_DRAFT_PACKAGE_VERSION,
      sourceFile: stagePath.replace(`${repoRoot}${path.sep}`, "").split(path.sep).join("/"),
      sourceBaselinePath: draft.sourcePath,
      reviewPath: draft.reviewPath,
      review_status: "needs_review",
      owner_approved: false,
      serving_enabled: false,
      sourceBaselineSha256: studio.source_baseline_sha256,
      note: "Content Studio draft only. No reader-serving change is authorized by this row."
    },
    reviewer_notes: "Consequence-first Calendar aspect draft. Review exact wording in Content Studio; serving baseline is unchanged.",
    prompt_version: "calendar-aspect-consequence-first-draft-v1",
    provider: "owner-content-studio",
    model: "manual"
  };
});

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify({
  schema: "tldr.calendar-aspect-content-studio-materialization.v1",
  packageVersion: CALENDAR_ASPECT_DRAFT_PACKAGE_VERSION,
  generatedAt: new Date().toISOString(),
  rowCount: rows.length,
  servingChange: false,
  rows
}, null, 2)}\n`);

async function upsertRows() {
  loadLocalWebEnv();
  const saved = [];
  for (let index = 0; index < rows.length; index += 100) {
    const batch = rows.slice(index, index + 100);
    const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?on_conflict=content_key,target_date,mode`, {
      method: "POST",
      headers: adminHeaders({ prefer: "resolution=merge-duplicates,return=representation" }),
      body: JSON.stringify(batch)
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(`Calendar aspect Content Studio upsert failed with ${response.status}: ${JSON.stringify(payload)}`);
    }
    saved.push(...payload);
  }
  return saved;
}

async function verifyRows() {
  loadLocalWebEnv();
  const params = new URLSearchParams();
  params.set("select", "content_key,mode,status,lane,review_state,body,sections,facts,source_snapshot,prompt_version,provider");
  params.set("mode", "eq.studio-draft");
  params.set("prompt_version", "eq.calendar-aspect-consequence-first-draft-v1");
  params.set("limit", "100");
  const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?${params.toString()}`, {
    headers: adminHeaders()
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Calendar aspect Content Studio verification failed with ${response.status}: ${JSON.stringify(payload)}`);
  if (!Array.isArray(payload) || payload.length !== 24) {
    throw new Error(`Expected 24 staged composed-card rows; found ${Array.isArray(payload) ? payload.length : 0}.`);
  }
  const remoteByKey = new Map(payload.map((row) => [row.content_key, row]));
  for (const expected of rows) {
    const remote = remoteByKey.get(expected.content_key);
    if (!remote) throw new Error(`Missing staged Content Studio row ${expected.content_key}.`);
    if (remote.mode !== "studio-draft" || remote.status !== "DRAFT" || remote.lane !== "reference" || remote.review_state !== "owner-review-required") {
      throw new Error(`${expected.content_key} is not safely staged.`);
    }
    if (remote.body !== expected.body) throw new Error(`${expected.content_key} staged body drifted.`);
    if (remote.facts?.readerServing !== false || remote.facts?.stageOnly !== true) {
      throw new Error(`${expected.content_key} lost its non-serving governance markers.`);
    }
  }
  return payload;
}

let applied = [];
if (apply) applied = await upsertRows();
let verified = [];
if (verifyRemote) verified = await verifyRows();

console.log(JSON.stringify({
  ok: true,
  output: path.relative(repoRoot, outPath),
  rows: rows.length,
  composed: composedDrafts.length,
  signSpecific: signSpecificDrafts.length,
  apply,
  appliedRows: applied.length,
  verifyRemote,
  verifiedRows: verified.length,
  servingChange: false
}, null, 2));
