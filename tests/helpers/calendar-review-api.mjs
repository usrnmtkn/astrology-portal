// Real API handler with a strict, isolated PostgREST store. Never contacts a service.
import { publicationRpcFixture } from "./studio-publication-rpc.mjs";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { readerRouteResponse, fixturePublications } from './content-reader-route.mjs';
import { readFileSync } from "node:fs";
import { calendarAspectStudioRecord } from "../../apps/web/src/content/fallbackArchitectureV3/resolver/calendarAspectContentStudio.mjs";
const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const catalog = read("../../apps/web/src/content/fallbackArchitectureV3/authored-inputs/calendar-aspect-consequence-first-drafts-v1.json");
const composed = read("../../packages/astro-knowledge/data/sky-calendar/composed-cards-v1.json");
export const fixtures = process.env.CALENDAR_REVIEW_FIXTURE
  ? JSON.parse(readFileSync(process.env.CALENDAR_REVIEW_FIXTURE, "utf8"))
  : catalog.drafts.map((draft, index) => {
  const studio = calendarAspectStudioRecord(composed.cards.find(card => card.id === draft.contentKey), draft);
  const record = { ...studio, Body: studio.CurrentServingBody };
  return {
    id: `calendar-fixture-${index}`, content_key: studio.contentKey, surface: "sky", mode: "studio-draft",
    status: "DRAFT", lane: "reference", review_state: "owner-review-required", target_date: null,
    provider: "owner-content-studio", event_type: "calendar-aspect-content-studio-draft", block_type: "fallback_hook",
    headline: studio.Headline, summary: "", body: studio.Body,
    sections: { packageRecord: record, packageOriginalRecord: structuredClone(record), packageDraft: { Body: studio.Body }, body_you: studio.Body, body_they: studio.Body },
    source_snapshot: { sourcePackage: studio.source_package, review_status: "needs_review", owner_approved: false, serving_enabled: false },
    facts: { fallbackArchitectureV3: true, readerServing: false, stageOnly: true },
    updated_at: "2026-09-02T02:13:00.543535+00:00", flags: [], created_at: "2026-09-01T00:00:00.000Z"
  };
});

export async function createApiStore(initial = fixtures) {
  const env = { NODE_ENV: "test", CONTENT_GENERATION_SECRET: "calendar-api-fixture", SUPABASE_URL: "https://calendar-api.invalid", SUPABASE_SERVICE_ROLE_KEY: "calendar-api-fixture-key" };
  Object.assign(process.env, env);
  const { default: handler } = await import(process.env.CALENDAR_TEST_HANDLER ?? "../../api/admin/generated-content.ts");
  Object.assign(process.env, env);
  const rows = new Map(initial.map(row => [row.id, structuredClone(row)]));
  const publication = publicationRpcFixture(() => [...rows.values()], saved => { for (const row of saved) rows.set(row.id, row); });
  let sequence = 0;
  let versionSequence = 0;
  const nextVersion = () => new Date(Date.now() + ++versionSequence).toISOString();
  const matches = (row, params) => [...params].every(([field, value]) => {
    if (["select", "order", "limit", "offset", "on_conflict"].includes(field)) return true;
    if (field === "and") {
      const prefix = /^\(content_key\.gte\."([^"]+)",content_key\.lt\."([^"]+)"\)$/.exec(value);
      if (!prefix) throw new Error(`Unmodeled prefix ${value}`);
      return row.content_key >= prefix[1] && row.content_key < prefix[2];
    }
    if (value === "is.null") return row[field] == null;
    if (value.startsWith("eq.")) return String(row[field] ?? "") === value.slice(3);
    if (value.startsWith("in.(")) return value.slice(4, -1).split(",").map(v => v.replaceAll('"', '')).includes(String(row[field]));
    throw new Error(`Unmodeled storage filter ${field}=${value}`);
  });
  globalThis.fetch = async (input, options = {}) => {
    const operation = await publication(input, options);
    if (operation) return operation;
    const reader = await readerRouteResponse(input, options);
    if (reader) return reader;
    const url = new URL(String(input));
    if (url.origin === env.SUPABASE_URL && url.pathname === "/rest/v1/content_publications" && (!options.method || options.method === "GET")) return Response.json(fixturePublications([...rows.values()]));
    if (url.origin !== env.SUPABASE_URL || url.pathname !== "/rest/v1/generated_interpretations") throw new Error(`Unexpected test storage request ${url.origin}${url.pathname}`);
    const found = [...rows.values()].filter(row => matches(row, url.searchParams));
    const method = options.method ?? "GET";
    if (method === "GET") return Response.json(found);
    const patch = JSON.parse(String(options.body));
    if (method === "POST") {
      const created = { ...patch, id: `revision-${++sequence}`, updated_at: nextVersion(), created_at: new Date().toISOString() };
      rows.set(created.id, created);
      return Response.json([created]);
    }
    if (method === "PATCH") {
      const updated = found.map(row => ({ ...row, ...patch, updated_at: nextVersion() }));
      for (const row of updated) rows.set(row.id, row);
      return Response.json(updated);
    }
    throw new Error(`Unmodeled storage method ${method}`);
  };
  const invoke = async (method, body, url = "/api/admin/generated-content", secret = env.CONTENT_GENERATION_SECRET) => {
    // By default this fixture represents an editor opened at the current row.
    // Explicit versions are retained for stale/concurrent request tests.
    if (method === 'PATCH' && body && !Object.hasOwn(body, 'expectedUpdatedAt')) body = { ...body, expectedUpdatedAt: rows.get(body.id)?.updated_at };
    const request = Readable.from(body === undefined ? [] : [JSON.stringify(body)]);
    Object.assign(request, { method, url, headers: { authorization: `Bearer ${secret}` } });
    return new Promise(async (resolve, reject) => {
      const response = { statusCode: 200, setHeader() {}, end(text) { resolve({ status: this.statusCode, payload: JSON.parse(text) }); } };
      try { const selectedHandler = url.startsWith("/api/admin/generated-content-inventory") ? (await import("../../api/admin/generated-content-inventory.ts")).default : handler; await selectedHandler(request, response); } catch (error) { reject(error); }
    });
  };
  return { rows, invoke, publication, close: publication.close };
}

if (process.argv.includes("--ipc") && process.argv[1] === fileURLToPath(import.meta.url)) {
  const store = await createApiStore();
  const { contentLiveStatuses } = await import("../../api/_lib/content-live-status.ts");
  process.on("message", async ({ id, method, body, url, key }) => {
    try {
      const result = method === "fixture" ? fixtures.find(row => row.content_key === key)
        : method === "rows" ? [...store.rows.values()]
        : method === "statuses" ? contentLiveStatuses([...store.rows.values()].filter(row => body.ids.includes(row.id)), [...store.rows.values()]) : await store.invoke(method, body, url);
      process.send({ id, result });
    } catch (error) { process.send({ id, error: String(error) }); }
  });
  process.send({ ready: true });
}
