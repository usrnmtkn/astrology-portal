import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const engine = require("../packages/astro-knowledge/engine/aspect-patterns/index.js");
const { fixtures } = require("../packages/astro-knowledge/engine/aspect-patterns/fixtures.js");

const runId = `codex-runtime-e2e-${Date.now()}`;
const calculatedFor = "2026-07-19T12:00:00.000Z";
const tempContentKeys = [
  `aspect-pattern/natal/t_square/${runId}`,
  `aspect-pattern/activation/t_square/apex/${runId}`
];
const tempRowIds = new Set();
const liveSupabase = process.env.TLDR_ASTRO_LIVE_SUPABASE_E2E === "true";
const originalFetch = globalThis.fetch;
const mockRows = new Map();
let mockSequence = 0;

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return payload;
    }
  };
}

function parseFilter(url, key) {
  const value = url.searchParams.get(key);
  if (!value) return null;
  const dot = value.indexOf(".");
  return dot >= 0 ? value.slice(dot + 1) : value;
}

function installMockSupabase() {
  process.env.SUPABASE_URL = "https://runtime-e2e.supabase.local";
  process.env.VITE_SUPABASE_URL = "https://runtime-e2e.supabase.local";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "runtime-e2e-service-role";
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(String(input));
    if (url.hostname !== "runtime-e2e.supabase.local" || !url.pathname.endsWith("/rest/v1/generated_interpretations")) {
      return originalFetch(input, options);
    }

    const method = String(options.method ?? "GET").toUpperCase();
    if (method === "GET") {
      const contentKeyFilter = url.searchParams.get("content_key");
      const idFilter = parseFilter(url, "id");
      const rows = [...mockRows.values()]
        .filter((row) => {
          if (idFilter && row.id !== idFilter) return false;
          if (!contentKeyFilter) return true;
          if (contentKeyFilter.startsWith("like.")) {
            const prefix = contentKeyFilter.slice("like.".length).replace(/%$/, "");
            return row.content_key.startsWith(prefix);
          }
          if (contentKeyFilter.startsWith("eq.")) return row.content_key === contentKeyFilter.slice("eq.".length);
          return true;
        })
        .sort((a, b) => String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")));
      return jsonResponse(rows);
    }

    if (method === "POST") {
      const row = JSON.parse(String(options.body ?? "{}"));
      const id = `runtime-e2e-row-${++mockSequence}`;
      const now = new Date(Date.now() + mockSequence).toISOString();
      const saved = { ...row, id, created_at: now, updated_at: row.updated_at ?? now };
      mockRows.set(id, saved);
      return jsonResponse([saved]);
    }

    if (method === "PATCH") {
      const id = parseFilter(url, "id");
      const existing = id ? mockRows.get(id) : null;
      if (!id || !existing) return jsonResponse([], 404);
      const patch = JSON.parse(String(options.body ?? "{}"));
      const now = new Date(Date.now() + ++mockSequence).toISOString();
      const saved = { ...existing, ...patch, id, updated_at: patch.updated_at ?? now };
      mockRows.set(id, saved);
      return jsonResponse([saved]);
    }

    if (method === "DELETE") {
      const contentKey = parseFilter(url, "content_key");
      for (const [id, row] of mockRows.entries()) {
        if (!contentKey || row.content_key === contentKey) mockRows.delete(id);
      }
      return jsonResponse([]);
    }

    return jsonResponse({ error: `Unsupported mock method ${method}` }, 405);
  };
}

function cloned(value) {
  return JSON.parse(JSON.stringify(value));
}

function invokeHandler(handler, method, url, body, headers = {}) {
  return new Promise((resolve) => {
    const chunks = [];
    const req = {
      method,
      url,
      headers,
      body,
      [Symbol.asyncIterator]: async function* iterator() {
        if (body) yield Buffer.from(JSON.stringify(body));
      }
    };
    const res = {
      statusCode: 200,
      headers: {},
      setHeader(key, value) {
        this.headers[key.toLowerCase()] = value;
      },
      end(chunk) {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
        resolve({
          statusCode: this.statusCode,
          headers: this.headers,
          body: Buffer.concat(chunks).toString("utf8")
        });
      }
    };
    handler(req, res);
  });
}

function rankedDetection(fixture) {
  const detection = engine.detectPatterns(fixture);
  const rankingContext = {
    planets: fixture.planets,
    ascendantSign: "aries",
    ascendantLongitude: 0,
    midheavenLongitude: 270
  };
  const ranked = {
    ...detection,
    ranking: engine.rankAspectPatterns(detection, rankingContext)
  };
  return {
    ranked,
    rankingContext,
    interpretationContexts: engine.buildAspectPatternInterpretationContexts(ranked, rankingContext)
  };
}

function natalContext() {
  const { interpretationContexts } = rankedDetection(fixtures.t_square);
  const context = interpretationContexts.find((item) => item.patternType === "t_square");
  assert.ok(context, "Missing T-square natal context.");
  return context;
}

function activationContext() {
  const { ranked, interpretationContexts } = rankedDetection(fixtures.t_square);
  const activation = engine.buildPatternActivations(
    { ...ranked, interpretationContexts },
    [{ id: `${runId}:transit.mars.square.mars`, movingBody: "mars", targetNatalPlanet: "mars", aspectType: "square", orb: 0.2, applying: true }],
    { calculatedFor }
  );
  const contexts = engine.buildAspectPatternActivationInterpretationContexts(
    { ...ranked, interpretationContexts, activation },
    { activation, natalContexts: interpretationContexts }
  );
  const context = contexts.find((item) => item.patternType === "t_square");
  assert.ok(context, "Missing T-square activation context.");
  return context;
}

function copyBytes(copy) {
  return JSON.stringify(copy);
}

function generatedStatus(status) {
  if (status === "approved") return "LIVE";
  if (status === "reviewed") return "REVIEWED";
  if (status === "deprecated") return "ARCHIVED";
  return "DRAFT";
}

function buildGeneratedRow(kind, contentKey, record, reviewer) {
  const status = generatedStatus(record.status);
  return {
    content_key: contentKey,
    surface: "natal",
    mode: "article",
    status,
    event_type: kind === "activation" ? "aspect_pattern_activation_writeup" : "aspect_pattern_natal_writeup",
    target_date: null,
    headline: record.content.headline,
    summary: record.content.overview,
    body: JSON.stringify(record.content, null, 2),
    sections: record.content.sections.map((section) => ({
      heading: section.id,
      body: section.template,
      id: section.id,
      required: section.required,
      conditions: section.conditions ?? []
    })),
    block_type: "synthesis",
    lane: "serving",
    review_state: status === "LIVE" || status === "REVIEWED" ? null : "editorial",
    facts: { kind, patternType: record.patternType, recordId: record.id, testRunId: runId },
    knowledge_ids: record.provenance.sourceIds ?? [],
    source_snapshot: {
      sourceType: "aspect-pattern-authored-record",
      kind,
      testRunId: runId,
      record
    },
    reviewer_notes: `Temporary runtime E2E row ${runId}.`,
    prompt_version: "aspect-pattern-writeups-runtime-e2e",
    provider: "aspect-pattern-admin",
    model: "manual",
    evergreen: true,
    evergreen_at: new Date().toISOString(),
    evergreen_by: reviewer,
    updated_at: new Date().toISOString()
  };
}

async function restJson(pathAndQuery, options = {}) {
  const response = await fetch(`${globalThis.runtimeSupabaseUrl}/rest/v1/${pathAndQuery}`, {
    ...options,
    headers: {
      ...globalThis.runtimeHeaders,
      ...(options.headers ?? {})
    }
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Supabase REST ${options.method ?? "GET"} ${pathAndQuery} failed with ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function insertRow(kind, contentKey, record) {
  const payload = await restJson("generated_interpretations", {
    method: "POST",
    headers: { prefer: "return=representation" },
    body: JSON.stringify(buildGeneratedRow(kind, contentKey, record, "runtime-e2e"))
  });
  assert.ok(Array.isArray(payload) && payload[0]?.id, `Insert did not return a generated_interpretations id for ${contentKey}.`);
  tempRowIds.add(payload[0].id);
  return payload[0];
}

async function updateRow(id, kind, contentKey, record) {
  const payload = await restJson(`generated_interpretations?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { prefer: "return=representation" },
    body: JSON.stringify(buildGeneratedRow(kind, contentKey, record, "runtime-e2e"))
  });
  assert.ok(Array.isArray(payload) && payload[0]?.id === id, `Update did not return ${id}.`);
  return payload[0];
}

async function saveViaAdmin(handler, kind, generatedContentId, record) {
  const response = await invokeHandler(handler, "POST", "/api/admin/aspect-pattern-writeups", {
    kind,
    action: "save",
    generatedContentId,
    record,
    reviewer: "runtime-e2e"
  }, process.env.CONTENT_GENERATION_SECRET ? { authorization: `Bearer ${process.env.CONTENT_GENERATION_SECRET}` } : {});
  const body = JSON.parse(response.body);
  assert.equal(response.statusCode, 200, body.error || `Admin save failed for ${generatedContentId}.`);
  assert.equal(body.ok, true);
  assert.equal(body.row.id, generatedContentId);
  return body.row;
}

async function deleteTempRows() {
  for (const id of tempRowIds) {
    await fetch(`${globalThis.runtimeSupabaseUrl}/rest/v1/generated_interpretations?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: globalThis.runtimeHeaders
    });
  }
  for (const contentKey of tempContentKeys) {
    await fetch(`${globalThis.runtimeSupabaseUrl}/rest/v1/generated_interpretations?content_key=eq.${encodeURIComponent(contentKey)}`, {
      method: "DELETE",
      headers: globalThis.runtimeHeaders
    });
  }
}

async function assertTempNamespaceIsEmpty() {
  for (const contentKey of tempContentKeys) {
    const rows = await restJson(`generated_interpretations?select=id,content_key&content_key=eq.${encodeURIComponent(contentKey)}`);
    assert.equal(rows.length, 0, `Temporary E2E namespace is not empty before test: ${contentKey}`);
  }
}

async function loadProductionRecords(kind, vite) {
  const repository = await vite.ssrLoadModule("/api/_lib/aspect-pattern-writeup-records.ts");
  return repository.loadAspectPatternProductionAuthoredRecords(kind);
}

async function resolveNatal(vite, context) {
  const records = await loadProductionRecords("natal", vite);
  return engine.resolveAspectPatternCopy(context, { authoredRecords: records, useLegacyResolver: true });
}

async function resolveActivation(vite, context) {
  const records = await loadProductionRecords("activation", vite);
  return engine.resolveAspectPatternActivationCopy(context, { authoredRecords: records });
}

async function main() {
  if (!liveSupabase) {
    installMockSupabase();
  }

  let vite = await createServer({
    root: repoRoot,
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
    logLevel: "error"
  });

  try {
    const repository = await vite.ssrLoadModule("/api/_lib/aspect-pattern-writeup-records.ts");
    if (!repository.hasAspectPatternWriteupPersistenceEnv()) {
      throw new Error("Aspect-pattern runtime E2E test requires VITE_SUPABASE_URL/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    }
    globalThis.runtimeHeaders = repository.aspectPatternWriteupAdminHeaders();
    globalThis.runtimeSupabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;

    await assertTempNamespaceIsEmpty();
    await deleteTempRows();

    const { default: adminHandler } = await vite.ssrLoadModule("/api/admin/aspect-pattern-writeups.ts");
    const natalDashboard = JSON.parse((await invokeHandler(adminHandler, "GET", "/api/admin/aspect-pattern-writeups?kind=natal")).body);
    const activationDashboard = JSON.parse((await invokeHandler(adminHandler, "GET", "/api/admin/aspect-pattern-writeups?kind=activation")).body);
    const natalBase = cloned(natalDashboard.rows.find((row) => row.patternType === "t_square").record);
    const activationBase = cloned(activationDashboard.rows.find((row) => row.patternType === "t_square" && row.targetRole === "apex").record);
    assert.ok(natalBase && activationBase, "Dashboard did not expose the target Natal and Active Now records.");
    assert.notEqual(natalBase.id, activationBase.id, "Natal and activation authored records must use distinct namespaces.");

    const natal = natalContext();
    const activation = activationContext();
    const originalNatal = await resolveNatal(vite, natal);
    const originalActivation = await resolveActivation(vite, activation);
    const originalNatalBytes = copyBytes(originalNatal);
    const originalActivationBytes = copyBytes(originalActivation);

    const natalDraft = {
      ...natalBase,
      status: "draft",
      content: {
        ...natalBase.content,
        headline: `Runtime draft ${runId} {{pattern_name}}`,
        overview: `Runtime draft overview ${runId} for {{member_planets}}.`
      },
      provenance: { ...natalBase.provenance, reviewedBy: "runtime-e2e", reviewedAt: calculatedFor }
    };
    const activationDraft = {
      ...activationBase,
      status: "draft",
      content: {
        ...activationBase.content,
        headline: `Runtime active draft ${runId} {{primary_moving_body}}`,
        overview: `Runtime active draft overview ${runId} for {{primary_target_planet}}.`
      },
      provenance: { ...activationBase.provenance, reviewedBy: "runtime-e2e", reviewedAt: calculatedFor }
    };

    const natalRow = await insertRow("natal", tempContentKeys[0], natalDraft);
    const activationRow = await insertRow("activation", tempContentKeys[1], activationDraft);
    await saveViaAdmin(adminHandler, "natal", natalRow.id, natalDraft);
    await saveViaAdmin(adminHandler, "activation", activationRow.id, activationDraft);

    assert.equal(copyBytes(await resolveNatal(vite, natal)), originalNatalBytes, "Draft Natal row must not change production copy.");
    assert.equal(copyBytes(await resolveActivation(vite, activation)), originalActivationBytes, "Draft activation row must not change production copy.");

    const natalPreview = JSON.parse((await invokeHandler(adminHandler, "POST", "/api/admin/aspect-pattern-writeups", {
      kind: "natal",
      action: "preview",
      record: natalDraft
    })).body);
    assert.equal(natalPreview.ok, true);
    assert.match(natalPreview.previews[0].authored.content.headline, new RegExp(runId), "Admin preview must render draft Natal edits explicitly.");

    const activationPreview = JSON.parse((await invokeHandler(adminHandler, "POST", "/api/admin/aspect-pattern-writeups", {
      kind: "activation",
      action: "preview",
      record: activationDraft
    })).body);
    assert.equal(activationPreview.ok, true);
    assert.match(activationPreview.previews[0].authored.content.headline, new RegExp(runId), "Admin preview must render draft activation edits explicitly.");

    const natalReviewed = { ...natalDraft, status: "reviewed" };
    const activationReviewed = { ...activationDraft, status: "reviewed" };
    await saveViaAdmin(adminHandler, "natal", natalRow.id, natalReviewed);
    await saveViaAdmin(adminHandler, "activation", activationRow.id, activationReviewed);
    assert.equal(copyBytes(await resolveNatal(vite, natal)), originalNatalBytes, "Reviewed Natal row must not change production copy.");
    assert.equal(copyBytes(await resolveActivation(vite, activation)), originalActivationBytes, "Reviewed activation row must not change production copy.");

    const natalApproved = { ...natalDraft, status: "approved" };
    const activationApproved = { ...activationDraft, status: "approved" };
    await saveViaAdmin(adminHandler, "natal", natalRow.id, natalApproved);
    await saveViaAdmin(adminHandler, "activation", activationRow.id, activationApproved);

    const approvedNatal = await resolveNatal(vite, natal);
    const approvedActivation = await resolveActivation(vite, activation);
    assert.equal(approvedNatal.source.persistedRecordId, natalRow.id);
    assert.equal(approvedNatal.source.persistedContentKey, tempContentKeys[0]);
    assert.match(approvedNatal.content.headline, new RegExp(runId));
    assert.equal(approvedActivation.source.persistedRecordId, activationRow.id);
    assert.equal(approvedActivation.source.persistedContentKey, tempContentKeys[1]);
    assert.match(approvedActivation.content.headline, new RegExp(runId));

    const reloadedNatalDashboard = JSON.parse((await invokeHandler(adminHandler, "GET", "/api/admin/aspect-pattern-writeups?kind=natal")).body);
    const reloadedNatal = reloadedNatalDashboard.rows.find((row) => row.generatedContentId === natalRow.id);
    assert.equal(reloadedNatal.record.content.headline, natalApproved.content.headline);
    assert.equal(reloadedNatal.record.version, natalApproved.version);
    assert.equal(reloadedNatal.status, "approved");
    assert.equal(reloadedNatal.record.provenance.reviewedBy, "runtime-e2e");

    await vite.close();
    vite = await createServer({
      root: repoRoot,
      server: { middlewareMode: true, hmr: false },
      appType: "custom",
      logLevel: "error"
    });
    assert.equal((await resolveNatal(vite, natal)).source.persistedRecordId, natalRow.id, "Cold Natal runtime lookup must keep the persisted approved row.");
    assert.equal((await resolveActivation(vite, activation)).source.persistedRecordId, activationRow.id, "Cold activation runtime lookup must keep the persisted approved row.");

    const natalDeprecated = { ...natalDraft, status: "deprecated" };
    const activationDeprecated = { ...activationDraft, status: "deprecated" };
    await saveViaAdmin(adminHandler, "natal", natalRow.id, natalDeprecated);
    await saveViaAdmin(adminHandler, "activation", activationRow.id, activationDeprecated);
    assert.equal(copyBytes(await resolveNatal(vite, natal)), originalNatalBytes, "Deprecated Natal row must restore previous production copy.");
    assert.equal(copyBytes(await resolveActivation(vite, activation)), originalActivationBytes, "Deprecated activation row must restore previous production copy.");

    const invalid = cloned(natalBase);
    invalid.status = "approved";
    invalid.content.headline = `Invalid {{unknown_slot}} ${runId}`;
    const invalidResponse = await invokeHandler(adminHandler, "POST", "/api/admin/aspect-pattern-writeups", {
      kind: "natal",
      action: "save",
      generatedContentId: natalRow.id,
      record: invalid,
      reviewer: "runtime-e2e"
    }, process.env.CONTENT_GENERATION_SECRET ? { authorization: `Bearer ${process.env.CONTENT_GENERATION_SECRET}` } : {});
    assert.equal(invalidResponse.statusCode, 500);
    assert.match(JSON.parse(invalidResponse.body).error, /Cannot approve|unknown_required_slot|unknown_slot/i);

    await deleteTempRows();
    assert.equal(copyBytes(await resolveNatal(vite, natal)), originalNatalBytes, "Deleting temp Natal row must restore original byte-for-byte.");
    assert.equal(copyBytes(await resolveActivation(vite, activation)), originalActivationBytes, "Deleting temp activation row must restore original byte-for-byte.");

    const natalFallback = engine.resolveAspectPatternCopy(natal, { authoredRecords: [], useLegacyResolver: true });
    const activationFallback = engine.resolveAspectPatternActivationCopy(activation, { authoredRecords: [] });
    assert.equal(natalFallback.source.contentLevel, "source_grounded_template");
    assert.equal(activationFallback.source.contentLevel, "source_grounded_template");
    assert.equal(copyBytes(engine.resolveAspectPatternCopy(natal, { authoredRecords: [], useLegacyResolver: true })), copyBytes(natalFallback), "Natal fallback must remain byte-stable.");
    assert.equal(copyBytes(engine.resolveAspectPatternActivationCopy(activation, { authoredRecords: [] })), copyBytes(activationFallback), "Activation fallback must remain byte-stable.");
  } finally {
    await deleteTempRows().catch(() => {});
    await vite.close().catch(() => {});
    if (!liveSupabase) {
      globalThis.fetch = originalFetch;
    }
  }
}

await main();
console.log("Aspect-pattern write-up runtime persistence tests passed.");
