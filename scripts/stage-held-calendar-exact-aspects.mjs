#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const heldAspectDirectory = path.join(
  repoRoot,
  "packages/astro-knowledge/data/points/aspects/sky/four-body-unverified"
);
const transitDirectory = path.join(repoRoot, "packages/astro-knowledge/data/transits");

export const HELD_CALENDAR_EXACT_STUDIO_PACKAGE = "HELD-CALENDAR-EXACT-ASPECT-CONTENT-STUDIO-2026-09-04";
export const HELD_CALENDAR_EXACT_STUDIO_PROMPT_PREFIX = "held-calendar-exact-aspect-content-studio-v1";

const pointOrder = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
  "chiron",
  "lilith",
  "nodes"
];

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function title(value) {
  return text(value)
    .replace(/[-_]+/gu, " ")
    .replace(/\b\w/gu, (match) => match.toUpperCase());
}

function sha256(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizePoint(value) {
  const point = text(value).toLowerCase().replaceAll("_", "-");
  if (["north-node", "south-node", "true-node", "node", "lunar-nodes"].includes(point)) return "nodes";
  if (point === "black-moon-lilith") return "lilith";
  return point;
}

function canonicalBodies(first, second) {
  const a = normalizePoint(first);
  const b = normalizePoint(second);
  const firstIndex = pointOrder.indexOf(a);
  const secondIndex = pointOrder.indexOf(b);
  if (firstIndex < 0 || secondIndex < 0 || firstIndex === secondIndex) {
    throw new Error(`HELD_CALENDAR_EXACT_STAGE: unsupported point pair ${first}/${second}.`);
  }
  return firstIndex <= secondIndex ? [a, b] : [b, a];
}

function parseSourceIdentity(source) {
  const sourceKey = text(source?.provenance?.sourceKey) || text(source?.id);
  const parts = sourceKey.split(".");
  if (parts.length !== 4 || parts[0] !== "sky") {
    throw new Error(`HELD_CALENDAR_EXACT_STAGE: invalid source key ${sourceKey || "missing"}.`);
  }
  const [, first, aspect, second] = parts;
  const normalizedAspect = text(aspect).toLowerCase();
  const [a, b] = canonicalBodies(first, second);
  return { a, b, aspect: normalizedAspect, sourceKey };
}

function publishedExactKeys() {
  const keys = new Set();
  for (const name of fs.readdirSync(transitDirectory).filter((file) => file.endsWith(".json"))) {
    const source = readJson(path.join(transitDirectory, name));
    const body = text(source.readerCopy?.body);
    if (!["APPROVED", "LIVE"].includes(source.status) || !body) continue;
    const [a, b] = canonicalBodies(source.transiting, source.other);
    keys.add(`sky.aspect.${a}.${text(source.aspect).toLowerCase()}.${b}`);
  }
  return keys;
}

function sourceFiles() {
  return fs.readdirSync(heldAspectDirectory)
    .filter((name) => name.endsWith(".json"))
    .sort();
}

export function buildHeldCalendarExactAspectRows({ aspect = "trine" } = {}) {
  const requestedAspect = text(aspect).toLowerCase();
  if (!requestedAspect) throw new Error("HELD_CALENDAR_EXACT_STAGE: aspect is required.");
  const servingKeys = publishedExactKeys();
  const skippedServing = [];
  const rows = [];

  for (const name of sourceFiles()) {
    const sourcePath = `packages/astro-knowledge/data/points/aspects/sky/four-body-unverified/${name}`;
    const source = readJson(path.join(heldAspectDirectory, name));
    if (
      source.kind !== "sky-aspect"
      || source.authorityClass !== "unverified"
      || source.governanceState !== "needs-owner-decision"
      || source.status !== "NEEDS_OWNER_DECISION"
      || text(source.aspect).toLowerCase() !== requestedAspect
    ) {
      continue;
    }

    const identity = parseSourceIdentity(source);
    if (identity.aspect !== requestedAspect) {
      throw new Error(`HELD_CALENDAR_EXACT_STAGE: aspect identity drift for ${sourcePath}.`);
    }
    const body = text(source.body);
    if (!body) throw new Error(`HELD_CALENDAR_EXACT_STAGE: ${sourcePath} has no body.`);
    if (!Array.isArray(source.surfacePermission) || !source.surfacePermission.includes("doctrine-only")) {
      throw new Error(`HELD_CALENDAR_EXACT_STAGE: ${sourcePath} lost its doctrine-only boundary.`);
    }

    const contentKey = `sky.aspect.${identity.a}.${identity.aspect}.${identity.b}`;
    if (servingKeys.has(contentKey)) {
      skippedServing.push({ contentKey, sourcePath });
      continue;
    }

    const baselineSha256 = sha256(JSON.stringify(source));
    const headline = `${title(identity.a)} ${title(identity.aspect)} ${title(identity.b)}`;
    const promptVersion = `${HELD_CALENDAR_EXACT_STUDIO_PROMPT_PREFIX}-${requestedAspect}`;
    const packageRecord = {
      contentKey,
      Headline: headline,
      Body: body,
      BodyA: identity.a,
      AspectType: identity.aspect,
      BodyB: identity.b,
      CurrentServingBody: null,
      content_role: "full_copy",
      review_status: "needs_review",
      surface: "sky",
      render_policy: "content-studio-held-exact-sky-aspect-review-v1",
      source_package: HELD_CALENDAR_EXACT_STUDIO_PACKAGE,
      source_baseline_sha256: baselineSha256,
      studio_content_type: "aspect",
      studio_review_category: "reader-copy",
      studio_editable_fields: [
        { path: "Body", label: "Exact aspect passage" }
      ],
      studio_read_only_fields: [
        "contentKey",
        "Headline",
        "BodyA",
        "AspectType",
        "BodyB",
        "CurrentServingBody",
        "review_status",
        "source_package",
        "source_baseline_sha256"
      ],
      studio_source_baseline: { Body: body },
      studio_provenance: {
        reviewStatus: "needs-owner-decision",
        authorityClass: source.authorityClass,
        governanceState: source.governanceState,
        surfacePermission: structuredClone(source.surfacePermission),
        sourcePath,
        sourceKey: identity.sourceKey,
        canonicalId: text(source.canonicalId),
        sourceSet: text(source.provenance?.sourceSet) || null,
        sourceSha256: text(source.provenance?.sourceSha256) || null
      },
      studio_version_status: "draft",
      owner_approved: false,
      serving_enabled: false,
      note: "Existing exact Sky aspect source passage surfaced for owner review only. It remains non-serving until a separate exact wording approval and controlled release."
    };

    rows.push({
      content_key: contentKey,
      surface: "sky",
      mode: "in_depth",
      status: "DRAFT",
      event_type: "sky-aspect-held-owner-review",
      target_date: null,
      headline,
      summary: null,
      body,
      sections: {
        packageRecord,
        packageOriginalRecord: structuredClone(packageRecord),
        body_you: body,
        body_they: body
      },
      block_type: "fallback_hook",
      lane: "reference",
      review_state: "needs-owner-decision",
      evergreen: false,
      facts: {
        fallbackArchitectureV3: true,
        readerServing: false,
        exactSkyAspectHeldDraft: true,
        authorityClass: source.authorityClass,
        governanceState: source.governanceState
      },
      knowledge_ids: [],
      source_snapshot: {
        sourcePackage: "tldrastro-fallback-architecture-v3",
        sourceSchemaVersion: HELD_CALENDAR_EXACT_STUDIO_PACKAGE,
        sourceFile: sourcePath,
        sourceBaselineSha256: baselineSha256,
        contentStudioHeldExactAspect: true,
        heldExactAspectIdentity: {
          a: identity.a,
          b: identity.b,
          aspect: identity.aspect
        },
        authorityClass: source.authorityClass,
        governanceState: source.governanceState,
        surfacePermission: structuredClone(source.surfacePermission),
        sourceKey: identity.sourceKey,
        canonicalId: text(source.canonicalId)
      },
      reviewer_notes: "Held exact Sky aspect source copy. Owner decision required before any reader-serving release.",
      prompt_version: promptVersion,
      provider: "owner-source-review",
      model: "manual"
    });
  }

  const keys = new Set(rows.map((row) => row.content_key));
  if (keys.size !== rows.length) {
    throw new Error("HELD_CALENDAR_EXACT_STAGE: canonical content keys collide inside the held review batch.");
  }

  return {
    aspect: requestedAspect,
    rows,
    skippedServing,
    servingExactCount: servingKeys.size
  };
}

function unquoteEnvValue(value) {
  const trimmed = value.trim();
  const quote = trimmed[0];
  return (quote === "\"" || quote === "'") && trimmed.endsWith(quote)
    ? trimmed.slice(1, -1)
    : trimmed;
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
    if (process.env[key] === undefined) {
      process.env[key] = unquoteEnvValue(trimmed.slice(separator + 1));
    }
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
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

async function upsertRows(rows) {
  loadLocalWebEnv();
  const saved = [];
  for (let index = 0; index < rows.length; index += 100) {
    const response = await fetch(
      `${supabaseUrl()}/rest/v1/generated_interpretations?on_conflict=content_key,target_date,mode`,
      {
        method: "POST",
        headers: adminHeaders({ prefer: "resolution=merge-duplicates,return=representation" }),
        body: JSON.stringify(rows.slice(index, index + 100))
      }
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(`Held Calendar exact aspect upsert failed with ${response.status}: ${JSON.stringify(payload)}`);
    }
    saved.push(...payload);
  }
  return saved;
}

async function verifyRows(rows, aspect) {
  loadLocalWebEnv();
  const promptVersion = `${HELD_CALENDAR_EXACT_STUDIO_PROMPT_PREFIX}-${aspect}`;
  const response = await fetch(
    `${supabaseUrl()}/rest/v1/generated_interpretations?select=content_key,status,lane,review_state,body,source_snapshot,sections&prompt_version=eq.${encodeURIComponent(promptVersion)}&limit=500`,
    { headers: adminHeaders() }
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Held Calendar exact aspect verification failed with ${response.status}: ${JSON.stringify(payload)}`);
  }
  if (!Array.isArray(payload) || payload.length !== rows.length) {
    throw new Error(`Expected ${rows.length} held ${aspect} review rows; found ${Array.isArray(payload) ? payload.length : 0}.`);
  }
  const remote = new Map(payload.map((row) => [row.content_key, row]));
  for (const expected of rows) {
    const actual = remote.get(expected.content_key);
    if (
      !actual
      || actual.status !== "DRAFT"
      || actual.lane !== "reference"
      || actual.review_state !== "needs-owner-decision"
    ) {
      throw new Error(`${expected.content_key} crossed the held review boundary.`);
    }
    if (
      actual.body !== expected.body
      || actual.source_snapshot?.contentStudioHeldExactAspect !== true
      || actual.sections?.packageRecord?.owner_approved !== false
      || actual.sections?.packageRecord?.serving_enabled !== false
    ) {
      throw new Error(`${expected.content_key} drifted after held-review staging.`);
    }
  }
  return payload;
}

function argumentValue(name) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length) ?? "";
}

async function main() {
  const aspect = argumentValue("aspect") || "trine";
  const outPath = argumentValue("out");
  const apply = process.argv.includes("--apply");
  const verifyRemote = process.argv.includes("--verify-remote");
  const staged = buildHeldCalendarExactAspectRows({ aspect });
  if (!staged.rows.length) {
    throw new Error(`HELD_CALENDAR_EXACT_STAGE: no non-serving held ${staged.aspect} rows were found.`);
  }
  if (outPath) {
    fs.writeFileSync(
      path.resolve(repoRoot, outPath),
      `${JSON.stringify({
        schema: "tldr.calendar-held-exact-aspect-review.v1",
        generatedAt: new Date().toISOString(),
        ...staged
      }, null, 2)}\n`
    );
  }
  const applied = apply ? await upsertRows(staged.rows) : [];
  const verified = verifyRemote ? await verifyRows(staged.rows, staged.aspect) : [];
  console.log(JSON.stringify({
    ok: true,
    aspect: staged.aspect,
    heldRows: staged.rows.length,
    skippedAlreadyServing: staged.skippedServing.length,
    servingExactCount: staged.servingExactCount,
    apply,
    appliedRows: applied.length,
    verifyRemote,
    verifiedRows: verified.length,
    readerServingChanged: false
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
