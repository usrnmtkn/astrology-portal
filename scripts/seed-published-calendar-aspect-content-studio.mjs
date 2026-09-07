#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const transitRoot = path.join(repoRoot, "packages/astro-knowledge/data/transits");
const apply = process.argv.includes("--apply");
const verifyRemote = process.argv.includes("--verify-remote");
const packageVersion = "EXACT-SKY-ASPECT-CONTENT-STUDIO-2026-09-01";
const defaultSupabaseUrl = "https://hdmdufozrgrajkfhydit.supabase.co";
const defaultSupabasePublishableKey = "sb_publishable_iX90KdzcQzw8a8OydBHHXA_COnEMcns";

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function title(value) {
  return text(value).replace(/[-_]+/gu, " ").replace(/\b\w/gu, (match) => match.toUpperCase());
}

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function unquoteEnvValue(value) {
  const trimmed = value.trim();
  const quote = trimmed[0];
  return (quote === "\"" || quote === "'") && trimmed.endsWith(quote) ? trimmed.slice(1, -1) : trimmed;
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
    if (process.env[key] === undefined) process.env[key] = unquoteEnvValue(trimmed.slice(separator + 1));
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function supabaseUrl() {
  return String(process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? defaultSupabaseUrl).replace(/\/$/u, "");
}

function adminHeaders(extra = {}) {
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json", ...extra };
}

function verificationKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY
    ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    ?? process.env.SUPABASE_PUBLISHABLE_KEY
    ?? process.env.VITE_SUPABASE_ANON_KEY
    ?? process.env.SUPABASE_ANON_KEY
    ?? defaultSupabasePublishableKey;
}

function verificationHeaders(extra = {}) {
  const key = verificationKey();
  const headers = { apikey: key, "content-type": "application/json", ...extra };
  if (!key.startsWith("sb_publishable_")) headers.authorization = `Bearer ${key}`;
  return headers;
}

function verificationAuthMode() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return "service-role";
  if (process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY) return "publishable-env";
  if (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY) return "anon-env";
  return "publishable-default";
}

function canonicalBodies(first, second) {
  const order = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "lilith", "nodes"];
  return order.indexOf(first) <= order.indexOf(second) ? [first, second] : [second, first];
}

function nodeAxisPoleFor(a, b) {
  if (a === "south-node" || b === "south-node") return "south-node";
  if (a === "north-node" || b === "north-node") return "north-node";
  return null;
}

function buildRows() {
  const files = fs.readdirSync(transitRoot).filter((file) => file.endsWith(".json")).sort();
  const rows = [];
  for (const file of files) {
    const transit = readJson(path.join(transitRoot, file));
    const body = text(transit.readerCopy?.body);
    if (transit.status !== "LIVE" || !body) continue;
    const first = text(transit.transiting).toLowerCase();
    const second = text(transit.other).toLowerCase();
    const aspect = text(transit.aspect).toLowerCase();
    if (!first || !second || !aspect) throw new Error(`${file} is missing exact-aspect identity.`);
    const [a, b] = canonicalBodies(first, second);
    const nodeAxisPole = nodeAxisPoleFor(a, b);
    const contentKey = `sky.aspect.${a}.${aspect}.${b}`;
    const headline = `${title(a)} ${title(aspect)} ${title(b)}`;
    const summary = text(transit.readerCopy?.summary);
    const sourcePath = `packages/astro-knowledge/data/transits/${file}`;
    const baselineHash = sha256(JSON.stringify({ body, summary, transitId: transit.id }));
    const packageRecord = {
      contentKey,
      Headline: headline,
      Summary: summary,
      Body: body,
      BodyA: a,
      AspectType: aspect,
      BodyB: b,
      nodeAxisPole,
      content_role: "full_copy",
      review_status: "approved",
      surface: "sky",
      render_policy: "content-studio-exact-sky-aspect-v1",
      source_package: packageVersion,
      source_baseline_sha256: baselineHash,
      studio_content_type: "aspect",
      studio_review_category: "reader-copy",
      studio_editable_fields: [
        { path: "Summary", label: "Summary" },
        { path: "Body", label: "Body" }
      ],
      studio_read_only_fields: [
        "contentKey", "Headline", "BodyA", "AspectType", "BodyB", "nodeAxisPole", "review_status",
        "source_package", "source_baseline_sha256"
      ],
      studio_source_baseline: { Summary: summary, Body: body },
      studio_provenance: {
        reviewStatus: "approved",
        sourcePath,
        approvedVia: text(transit.readerCopy?.approvedVia) || null,
        transitId: transit.id,
        nodeAxisPole
      },
      studio_version_status: "approved-serving-baseline",
      owner_approved: true,
      serving_enabled: true,
      note: "Published exact current-sky aspect baseline. Content Studio edits fork a non-serving draft until explicit Sign Off."
    };
    rows.push({
      content_key: contentKey,
      surface: "sky",
      mode: "in_depth",
      status: "LIVE",
      event_type: "sky-aspect-owner-approved-exact",
      target_date: null,
      headline,
      summary,
      body,
      sections: {
        packageRecord,
        packageOriginalRecord: structuredClone(packageRecord),
        body_you: body,
        body_they: body
      },
      block_type: "fallback_hook",
      lane: "serving",
      review_state: null,
      evergreen: true,
      evergreen_at: new Date().toISOString(),
      evergreen_by: packageVersion,
      facts: {
        fallbackArchitectureV3: true,
        review_status: "approved",
        readerServing: true,
        exactSkyAspect: true,
        nodeAxisPole
      },
      knowledge_ids: [],
      source_snapshot: {
        sourcePackage: "tldrastro-fallback-architecture-v3",
        sourceSchemaVersion: packageVersion,
        sourceFile: sourcePath,
        review_status: "approved",
        content_role: "full_copy",
        contentStudioExactAspect: true,
        exactSkyAspectIdentity: { a, b, aspect },
        nodeAxisPole,
        sourceBaselineSha256: baselineHash
      },
      reviewer_notes: "Canonical owner-approved exact aspect copy imported for governed Content Studio editing.",
      prompt_version: "exact-sky-aspect-content-studio-v1",
      provider: "tldrastro-fallback-architecture-v3",
      model: "manual",
      published_at: new Date().toISOString()
    });
  }
  const keys = new Set(rows.map((row) => row.content_key));
  if (keys.size !== rows.length) throw new Error("Published exact aspect catalog contains duplicate canonical keys.");

  const northNodeRows = rows.filter((row) => row.source_snapshot.nodeAxisPole === "north-node");
  const southNodeRows = rows.filter((row) => row.source_snapshot.nodeAxisPole === "south-node");
  if (southNodeRows.length > 0) {
    if (southNodeRows.length !== 60) throw new Error(`Expected 60 South Node Content Studio rows; found ${southNodeRows.length}.`);
    if (northNodeRows.length !== 60) throw new Error(`Expected 60 North Node Content Studio rows beside South Node; found ${northNodeRows.length}.`);
    const southKeys = new Set(southNodeRows.map((row) => row.content_key));
    if (northNodeRows.some((row) => southKeys.has(row.content_key))) {
      throw new Error("North Node and South Node Content Studio rows must remain independently editable identities.");
    }
  }
  return rows;
}

async function upsertRows(rows) {
  loadLocalWebEnv();
  const saved = [];
  for (let index = 0; index < rows.length; index += 100) {
    const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?on_conflict=content_key,target_date,mode`, {
      method: "POST",
      headers: adminHeaders({ prefer: "resolution=merge-duplicates,return=representation" }),
      body: JSON.stringify(rows.slice(index, index + 100))
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`Published Calendar aspect upsert failed with ${response.status}: ${JSON.stringify(payload)}`);
    saved.push(...payload);
  }
  return saved;
}

async function verifyRows(rows) {
  loadLocalWebEnv();
  const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?select=content_key,status,lane,review_state,body,source_snapshot&prompt_version=eq.exact-sky-aspect-content-studio-v1&limit=500`, { headers: verificationHeaders() });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Published Calendar aspect verification failed with ${response.status}: ${JSON.stringify(payload)}`);
  if (!Array.isArray(payload) || payload.length !== rows.length) throw new Error(`Expected ${rows.length} published exact aspects; found ${Array.isArray(payload) ? payload.length : 0}.`);
  const remote = new Map(payload.map((row) => [row.content_key, row]));
  for (const expected of rows) {
    const actual = remote.get(expected.content_key);
    if (!actual || actual.status !== "LIVE" || actual.lane !== "serving" || actual.review_state !== null) throw new Error(`${expected.content_key} is not published safely.`);
    if (actual.body !== expected.body || actual.source_snapshot?.contentStudioExactAspect !== true) throw new Error(`${expected.content_key} drifted after seed.`);
    if (actual.source_snapshot?.nodeAxisPole !== expected.source_snapshot.nodeAxisPole) throw new Error(`${expected.content_key} node-axis pole metadata drifted after seed.`);
  }
  return payload;
}

const rows = buildRows();
let applied = [];
if (apply) applied = await upsertRows(rows);
let verified = [];
if (verifyRemote) verified = await verifyRows(rows);

console.log(JSON.stringify({
  ok: true,
  rows: rows.length,
  northNodeRows: rows.filter((row) => row.source_snapshot.nodeAxisPole === "north-node").length,
  southNodeRows: rows.filter((row) => row.source_snapshot.nodeAxisPole === "south-node").length,
  apply,
  appliedRows: applied.length,
  verifyRemote,
  verifiedRows: verified.length,
  verificationAuth: verifyRemote ? verificationAuthMode() : "none",
  servingCopyChanged: false
}, null, 2));
