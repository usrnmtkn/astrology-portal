from pathlib import Path
import re


def replace_once(path: str, old: str, new: str) -> None:
    file_path = Path(path)
    text = file_path.read_text()
    if old not in text:
        raise SystemExit(f"expected source block not found in {path}")
    file_path.write_text(text.replace(old, new, 1))


api_path = "api/admin/generated-content.ts"

replace_once(
    api_path,
    '''async function patchGeneratedContentRow(id: string, patch: Record<string, unknown>) {
  const response = await adminStorageFetch(`${supabaseUrl()}/rest/v1/generated_interpretations?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      ...adminHeaders(),
      prefer: "return=representation"
    },
    body: JSON.stringify(patch)
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Supabase review update failed with ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload as ExistingGeneratedContentRow[];
}
''',
    '''async function patchGeneratedContentRow(
  id: string,
  patch: Record<string, unknown>,
  expectedUpdatedAt?: string | null
) {
  const params = new URLSearchParams();
  params.set("id", `eq.${id}`);
  if (expectedUpdatedAt) params.set("updated_at", `eq.${expectedUpdatedAt}`);
  const response = await adminStorageFetch(`${supabaseUrl()}/rest/v1/generated_interpretations?${params.toString()}`, {
    method: "PATCH",
    headers: {
      ...adminHeaders(),
      prefer: "return=representation"
    },
    body: JSON.stringify(patch)
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Supabase review update failed with ${response.status}: ${JSON.stringify(payload)}`);
  }
  const rows = Array.isArray(payload) ? payload as ExistingGeneratedContentRow[] : [];
  if (rows.length === 0) {
    if (expectedUpdatedAt) {
      throw new GeneratedContentRequestError("This content changed before the update completed. Reload the row before saving so a newer edit is not overwritten.", 409);
    }
    throw new GeneratedContentRequestError("Content row was not found.", 404);
  }
  return rows;
}
'''
)

replace_once(
    api_path,
    '''    const published = await patchGeneratedContentRow(target.id, promotionPatch);
    if (target.id !== existing.id) {
      await patchGeneratedContentRow(existing.id, {
        status: "ARCHIVED",
        lane: "reference",
        review_state: "published-revision",
        updated_at: now
      });
    }
''',
    '''    let revisionExpectedUpdatedAt = body.expectedUpdatedAt ?? existing.updated_at ?? null;
    if (target.id !== existing.id && body.expectedUpdatedAt) {
      const claimedAt = new Date().toISOString();
      await patchGeneratedContentRow(existing.id, { updated_at: claimedAt }, body.expectedUpdatedAt);
      revisionExpectedUpdatedAt = claimedAt;
    }
    const published = await patchGeneratedContentRow(target.id, promotionPatch, target.updated_at);
    if (target.id !== existing.id) {
      await patchGeneratedContentRow(existing.id, {
        status: "ARCHIVED",
        lane: "reference",
        review_state: "published-revision",
        updated_at: now
      }, revisionExpectedUpdatedAt);
    }
'''
)

replace_once(
    api_path,
    '''    if (existing.status !== "LIVE") {
      return patchGeneratedContentRow(existing.id, revisionPatch);
    }
''',
    '''    if (existing.status !== "LIVE") {
      return patchGeneratedContentRow(existing.id, revisionPatch, body.expectedUpdatedAt);
    }
'''
)

replace_once(
    api_path,
    '''    const target = await fetchExistingRowById(targetRowId);
    if (!target || target.event_type !== "sky-article-edition") {
''',
    '''    let revisionExpectedUpdatedAt = body.expectedUpdatedAt ?? existing.updated_at ?? null;
    if (body.expectedUpdatedAt) {
      const claimedAt = new Date().toISOString();
      await patchGeneratedContentRow(existing.id, { updated_at: claimedAt }, body.expectedUpdatedAt);
      revisionExpectedUpdatedAt = claimedAt;
    }
    const target = await fetchExistingRowById(targetRowId);
    if (!target || target.event_type !== "sky-article-edition") {
'''
)

replace_once(
    api_path,
    '''    const published = await patchGeneratedContentRow(target.id, {
      headline: revised.headline,
      summary: revised.tldr,
      body: revised.body,
      sections: { skyArticleEdition: revised },
      source_snapshot: approvedSnapshot,
      status: "LIVE",
      lane: "serving",
      review_state: null,
      reviewed_at: now,
      published_at: now,
      updated_at: now
    });
    await patchGeneratedContentRow(existing.id, {
      status: "ARCHIVED",
      lane: "reference",
      review_state: "published-revision",
      updated_at: now
    });
''',
    '''    const published = await patchGeneratedContentRow(target.id, {
      headline: revised.headline,
      summary: revised.tldr,
      body: revised.body,
      sections: { skyArticleEdition: revised },
      source_snapshot: approvedSnapshot,
      status: "LIVE",
      lane: "serving",
      review_state: null,
      reviewed_at: now,
      published_at: now,
      updated_at: now
    }, target.updated_at);
    await patchGeneratedContentRow(existing.id, {
      status: "ARCHIVED",
      lane: "reference",
      review_state: "published-revision",
      updated_at: now
    }, revisionExpectedUpdatedAt);
'''
)

replace_once(
    api_path,
    '''  const response = await adminStorageFetch(`${supabaseUrl()}/rest/v1/generated_interpretations?id=eq.${encodeURIComponent(body.id)}`, {
    method: "PATCH",
    headers: {
      ...adminHeaders(),
      prefer: "return=representation"
    },
    body: JSON.stringify(patch)
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Supabase review update failed with ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload;
''',
    '''  const updateParams = new URLSearchParams();
  updateParams.set("id", `eq.${body.id}`);
  if (body.expectedUpdatedAt) updateParams.set("updated_at", `eq.${body.expectedUpdatedAt}`);
  const response = await adminStorageFetch(`${supabaseUrl()}/rest/v1/generated_interpretations?${updateParams.toString()}`, {
    method: "PATCH",
    headers: {
      ...adminHeaders(),
      prefer: "return=representation"
    },
    body: JSON.stringify(patch)
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Supabase review update failed with ${response.status}: ${JSON.stringify(payload)}`);
  }
  const updatedRows = Array.isArray(payload) ? payload : [];
  if (updatedRows.length === 0) {
    if (body.expectedUpdatedAt) {
      throw new GeneratedContentRequestError("This content changed before the update completed. Reload the row before saving so a newer edit is not overwritten.", 409);
    }
    throw new GeneratedContentRequestError("Content row was not found.", 404);
  }

  return updatedRows;
'''
)

replace_once(
    api_path,
    '''  const response = await adminStorageFetch(`${supabaseUrl()}/rest/v1/generated_interpretations?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      ...adminHeaders(),
      prefer: "return=representation"
    }
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Supabase delete failed with ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload;
''',
    '''  const deleteParams = new URLSearchParams();
  deleteParams.set("id", `eq.${id}`);
  deleteParams.set("status", "neq.LIVE");
  if (expectedUpdatedAt) deleteParams.set("updated_at", `eq.${expectedUpdatedAt}`);
  const response = await adminStorageFetch(`${supabaseUrl()}/rest/v1/generated_interpretations?${deleteParams.toString()}`, {
    method: "DELETE",
    headers: {
      ...adminHeaders(),
      prefer: "return=representation"
    }
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Supabase delete failed with ${response.status}: ${JSON.stringify(payload)}`);
  }
  const deletedRows = Array.isArray(payload) ? payload : [];
  if (deletedRows.length === 0) {
    throw new GeneratedContentRequestError("This content changed, was already deleted, or became published before deletion completed. Reload before trying again.", 409);
  }

  return deletedRows;
'''
)

prepopulate_path = Path("api/admin/prepopulate-content.ts")
prepopulate = prepopulate_path.read_text()
pattern = re.compile(r'''\nfunction queueTargetKey\(row: Pick<QueueRow, "content_key" \| "target_date" \| "mode">\) \{.*?\nasync function saveRows\(rows: QueueRow\[\]\) \{.*?\n\}\n\nexport default async function handler''', re.S)
replacement = r'''
function queueTargetParams(row: QueueRow) {
  const params = new URLSearchParams();
  params.set("content_key", `eq.${row.content_key}`);
  params.set("target_date", row.target_date === null ? "is.null" : `eq.${row.target_date}`);
  params.set("mode", `eq.${row.mode}`);
  return params;
}

async function saveQueueRow(row: QueueRow) {
  const createResponse = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations`, {
    method: "POST",
    headers: {
      ...adminHeaders(),
      prefer: "return=representation"
    },
    body: JSON.stringify(row)
  });
  const createPayload = await createResponse.json().catch(() => null);
  if (createResponse.ok) {
    return { row: Array.isArray(createPayload) ? createPayload[0] ?? null : null, skippedLive: false };
  }
  if (createResponse.status !== 409) {
    throw new Error(`Supabase queue create failed with ${createResponse.status}: ${JSON.stringify(createPayload)}`);
  }

  // A duplicate may be a reusable draft or protected LIVE content. Patch only
  // while the persisted row is still non-LIVE so a publish racing this request
  // cannot be overwritten by queue prepopulation.
  const params = queueTargetParams(row);
  params.set("status", "neq.LIVE");
  const patchResponse = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?${params.toString()}`, {
    method: "PATCH",
    headers: {
      ...adminHeaders(),
      prefer: "return=representation"
    },
    body: JSON.stringify(row)
  });
  const patchPayload = await patchResponse.json().catch(() => null);
  if (!patchResponse.ok) {
    throw new Error(`Supabase queue refresh failed with ${patchResponse.status}: ${JSON.stringify(patchPayload)}`);
  }
  const updated = Array.isArray(patchPayload) ? patchPayload[0] ?? null : null;
  return { row: updated, skippedLive: !updated };
}

async function saveRows(rows: QueueRow[]) {
  const savedRows: unknown[] = [];
  const skippedLiveRows: string[] = [];
  for (const row of rows) {
    const saved = await saveQueueRow(row);
    if (saved.row) savedRows.push(saved.row);
    if (saved.skippedLive) skippedLiveRows.push(row.content_key);
  }
  return { rows: savedRows, skippedLiveRows };
}

export default async function handler'''
prepopulate, count = pattern.subn(replacement, prepopulate, count=1)
if count != 1:
    raise SystemExit("expected prepopulate save block not found")
prepopulate_path.write_text(prepopulate)

Path("scripts/test-content-studio-atomic-concurrency.mjs").write_text(r'''#!/usr/bin/env node
import assert from "node:assert/strict";
import { Readable } from "node:stream";

process.env.NODE_ENV = "test";
process.env.CONTENT_GENERATION_SECRET = "atomic-concurrency-secret";
process.env.SUPABASE_URL = "https://atomic-concurrency.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "atomic-concurrency-role";

const { default: handler } = await import("../api/admin/generated-content.ts");
process.env.CONTENT_GENERATION_SECRET = "atomic-concurrency-secret";
process.env.SUPABASE_URL = "https://atomic-concurrency.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "atomic-concurrency-role";

const base = {
  surface: "sky", mode: "feed", event_type: "manual", target_date: null,
  status: "DRAFT", lane: "serving", review_state: null,
  headline: "", summary: "", body: "", sections: {}, facts: {}, source_snapshot: {},
  provider: "manual-admin", prompt_version: "manual-admin", block_type: "essay",
  updated_at: "2026-09-02T14:00:00.000Z"
};
const rows = new Map([
  ["edit-id", { ...base, id: "edit-id", content_key: "atomic/edit", body: "old" }],
  ["delete-id", { ...base, id: "delete-id", content_key: "atomic/delete", updated_at: "2026-09-02T14:01:00.000Z" }]
]);
let raceEdit = true;
let raceDelete = true;

function matches(row, url) {
  const expectedUpdatedAt = url.searchParams.get("updated_at");
  if (expectedUpdatedAt?.startsWith("eq.") && row.updated_at !== expectedUpdatedAt.slice(3)) return false;
  if (url.searchParams.get("status") === "neq.LIVE" && row.status === "LIVE") return false;
  return true;
}

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  const method = init.method ?? "GET";
  assert.equal(url.origin, "https://atomic-concurrency.invalid");
  assert.equal(url.pathname, "/rest/v1/generated_interpretations");
  const id = (url.searchParams.get("id") ?? "").replace(/^eq\./u, "");

  if (method === "GET") {
    const row = rows.get(id);
    return Response.json(row ? [row] : []);
  }
  if (method === "PATCH") {
    let row = rows.get(id);
    if (!row) return Response.json([]);
    if (id === "edit-id" && raceEdit) {
      raceEdit = false;
      row = { ...row, body: "concurrent edit", updated_at: "2026-09-02T14:02:00.000Z" };
      rows.set(id, row);
    }
    if (!matches(row, url)) return Response.json([]);
    const patch = JSON.parse(String(init.body));
    const next = { ...row, ...patch };
    rows.set(id, next);
    return Response.json([next]);
  }
  if (method === "DELETE") {
    let row = rows.get(id);
    if (!row) return Response.json([]);
    if (id === "delete-id" && raceDelete) {
      raceDelete = false;
      row = { ...row, status: "LIVE", updated_at: "2026-09-02T14:03:00.000Z" };
      rows.set(id, row);
    }
    if (!matches(row, url)) return Response.json([]);
    rows.delete(id);
    return Response.json([row]);
  }
  throw new Error(`Unexpected ${method} ${url}`);
};

function request(method, url, body) {
  const stream = body === undefined ? Readable.from([]) : Readable.from([JSON.stringify(body)]);
  stream.method = method;
  stream.url = url;
  stream.headers = { authorization: "Bearer atomic-concurrency-secret" };
  return stream;
}
function responseHarness() {
  let resolve;
  const done = new Promise((r) => { resolve = r; });
  const response = {
    statusCode: 0,
    setHeader() {},
    end(value) { resolve({ status: this.statusCode, payload: value ? JSON.parse(value) : null }); }
  };
  return { done, response };
}
async function invoke(method, url, body) {
  const { done, response } = responseHarness();
  await handler(request(method, url, body), response);
  return done;
}

let result = await invoke("PATCH", "/api/admin/generated-content", {
  id: "edit-id",
  expectedUpdatedAt: "2026-09-02T14:00:00.000Z",
  body: "stale writer"
});
assert.equal(result.status, 409, "A writer that loses the race after the initial read must conflict.");
assert.equal(rows.get("edit-id").body, "concurrent edit");

result = await invoke(
  "DELETE",
  `/api/admin/generated-content?id=delete-id&expectedUpdatedAt=${encodeURIComponent("2026-09-02T14:01:00.000Z")}`
);
assert.equal(result.status, 409, "Delete must fail if the row becomes LIVE after the initial read.");
assert.equal(rows.get("delete-id").status, "LIVE");

console.log("Content Studio atomic concurrency guards passed.");
''')

Path("scripts/test-content-studio-prepopulate-live-race.mjs").write_text(r'''#!/usr/bin/env node
import assert from "node:assert/strict";
import { Readable } from "node:stream";

process.env.NODE_ENV = "test";
process.env.CONTENT_GENERATION_SECRET = "prepopulate-race-secret";
process.env.SUPABASE_URL = "https://prepopulate-race.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "prepopulate-race-role";

const { default: handler } = await import("../api/admin/prepopulate-content.ts");
process.env.CONTENT_GENERATION_SECRET = "prepopulate-race-secret";
process.env.SUPABASE_URL = "https://prepopulate-race.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "prepopulate-race-role";

const requests = [];
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  const method = init.method ?? "GET";
  requests.push({ method, url, headers: init.headers, body: init.body ? JSON.parse(String(init.body)) : null });
  assert.equal(url.origin, "https://prepopulate-race.invalid");
  assert.equal(url.pathname, "/rest/v1/generated_interpretations");
  if (method === "POST") {
    assert.equal(url.searchParams.has("on_conflict"), false, "Queue prepopulation must not use merge-upsert semantics.");
    return Response.json({ code: "23505", message: "duplicate key" }, { status: 409 });
  }
  if (method === "PATCH") {
    assert.equal(url.searchParams.get("status"), "neq.LIVE", "Queue refresh must atomically exclude LIVE rows.");
    return Response.json([]);
  }
  throw new Error(`Unexpected ${method} ${url}`);
};

function request(body) {
  const stream = Readable.from([JSON.stringify(body)]);
  stream.method = "POST";
  stream.url = "/api/admin/prepopulate-content";
  stream.headers = { authorization: "Bearer prepopulate-race-secret" };
  return stream;
}
function responseHarness() {
  let resolve;
  const done = new Promise((r) => { resolve = r; });
  const response = {
    statusCode: 0,
    setHeader() {},
    end(value) { resolve({ status: this.statusCode, payload: value ? JSON.parse(value) : null }); }
  };
  return { done, response };
}

const { done, response } = responseHarness();
await handler(request({ surface: "modifier", targetDate: "2026-09-02" }), response);
const result = await done;
assert.equal(result.status, 200);
assert.equal(result.payload.inserted, 0);
assert.ok(result.payload.skippedLiveRows.length > 0, "Protected duplicate rows should be reported as skipped.");
assert.ok(requests.some((item) => item.method === "PATCH"));
assert.equal(requests.filter((item) => item.method === "POST").length, requests.filter((item) => item.method === "PATCH").length);

console.log("Content Studio prepopulation LIVE race guard passed.");
''')

special_test = Path("scripts/test-content-studio-special-mutation-concurrency.mjs")
special = special_test.read_text()
special = special.replace(
    'const migration = fs.readFileSync("apps/web/supabase/migrations/20260902060000_content_studio_hydration_crud_reliability.sql", "utf8");',
    'const migration = fs.readFileSync("apps/web/supabase/migrations/20260902060000_content_studio_hydration_crud_reliability.sql", "utf8");\nconst api = fs.readFileSync("api/admin/generated-content.ts", "utf8");'
)
special += r'''

assert.match(api, /updateParams\.set\("updated_at", `eq\.\$\{body\.expectedUpdatedAt\}`\)/u, "Ordinary saves must put the expected version in the database mutation filter.");
assert.match(api, /deleteParams\.set\("status", "neq\.LIVE"\)/u, "Hard delete must atomically exclude rows that become LIVE.");
assert.match(api, /deleteParams\.set\("updated_at", `eq\.\$\{expectedUpdatedAt\}`\)/u, "Hard delete must put the expected version in the database mutation filter.");
'''
special_test.write_text(special)
