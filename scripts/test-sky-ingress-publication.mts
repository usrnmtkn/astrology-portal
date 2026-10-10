import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Readable } from "node:stream";
import { PGlite } from "@electric-sql/pglite";
import { compileSkyArticleEdition } from "../apps/web/src/content/skyArticleTemplateCompiler.ts";
import { skyIngressEssayFields, SKY_INGRESS_ESSAY_FORMAT } from "../apps/web/src/content/skyIngressEssay.mjs";
import { skyIngressEssayPublicationKeys, skyIngressEssayReaderSection } from "../apps/web/src/content/skyIngressEssayReader.ts";
import { projectReaderRow } from "../apps/web/src/content/readerRowProjection.mjs";
import { isGeneratedContentReaderBoundaryAllowed } from "../apps/web/src/content/generatedContentEligibility.ts";

const env = { NODE_ENV: "test", CONTENT_GENERATION_SECRET: "synthetic-ingress-publication",
  SUPABASE_URL: "https://ingress-publication.invalid", SUPABASE_SERVICE_ROLE_KEY: "synthetic",
  STUDIO_MEMORY_FEEDBACK_ENABLED: "false", STUDIO_WRITING_FEEDBACK_ENABLED: "false" };
Object.assign(process.env, env);
const { default: handler } = await import("../api/admin/generated-content.ts");
Object.assign(process.env, env);
const db = new PGlite();
const originalFetch = globalThis.fetch;
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create table generated_interpretations(id uuid primary key, content_key text, status text, lane text,
      review_state text, updated_at timestamptz, target_date date, sections jsonb, source_snapshot jsonb,
      headline text, summary text, body text, surface text, mode text, event_type text, block_type text,
      reviewed_at timestamptz, published_at timestamptz);`);
  await db.exec(readFileSync(new URL("../apps/web/supabase/migrations/20260907180000_content_publications.sql", import.meta.url), "utf8"));
  const edition = await compileSkyArticleEdition({ format: SKY_INGRESS_ESSAY_FORMAT,
    templateKey: "sky/article-template/sun/libra", templateBody: "Synthetic template.",
    planet: "sun", sign: "libra", entryYear: 2026, validFrom: "2026-09-22", validTo: "2026-10-23",
    transitStartInstant: "2026-09-23T00:05:14Z", transitEndInstant: "2026-10-23T09:37:57Z",
    slotValues: Object.fromEntries(skyIngressEssayFields.map(({ name }) => [name, `Synthetic complete ${name}.`])),
    tldr: "Synthetic separate complete summary.", housePassages: [] });
  const id = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
  const initial = { id, content_key: edition.contentKey, status: "DRAFT", lane: "reference",
    review_state: "owner-review-required", updated_at: "2026-10-09T00:00:00.000Z", target_date: null,
    surface: "sky", mode: "article", event_type: "sky-article-edition", block_type: "sky_article",
    headline: edition.headline, summary: edition.tldr, body: edition.body,
    sections: { skyArticleEdition: edition }, source_snapshot: { review_status: "needs_review" } };
  await db.query("insert into generated_interpretations select * from jsonb_populate_record(null::generated_interpretations,$1)", [JSON.stringify(initial)]);
  let currentId = id;
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    assert.equal(url.origin, env.SUPABASE_URL, "No real network or paid generation");
    assert.equal(url.pathname, "/rest/v1/generated_interpretations");
    if (!init.method || init.method === "GET") return Response.json((await db.query("select * from generated_interpretations where id=$1", [currentId])).rows);
    assert.equal(init.method, "PATCH");
    assert.equal(url.searchParams.get("id"), `eq.${currentId}`);
    const version = url.searchParams.get("updated_at")?.slice(3);
    assert(version, "Publication requires the opened row version");
    const patch = JSON.parse(String(init.body));
    const headers = Object.fromEntries(new Headers(init.headers));
    await db.query("select set_config('request.headers',$1,false),set_config('request.jwt.claims',$2,false)",
      [JSON.stringify(headers), JSON.stringify({ role: "service_role" })]);
    const result = await db.query(`update generated_interpretations set
      (status,lane,review_state,reviewed_at,published_at,source_snapshot,updated_at) =
      (select status,lane,review_state,reviewed_at,published_at,source_snapshot,clock_timestamp()
       from jsonb_populate_record(null::generated_interpretations,$1))
      where id=$2 and updated_at=$3 returning *`, [JSON.stringify(patch), currentId, version]);
    await db.exec("reset request.headers; reset request.jwt.claims");
    return Response.json(result.rows);
  };
  async function approve(version: string, authorized = true) {
    const req = Object.assign(Readable.from([JSON.stringify({ id, expectedUpdatedAt: version, ownerAction: "approve-sky-article-edition" })]),
      { method: "PATCH", url: "/api/admin/generated-content", headers: authorized ? { "x-content-generation-secret": env.CONTENT_GENERATION_SECRET } : {} });
    const res = { statusCode: 0, result: {} as any, setHeader() {}, end(text: string) { this.result = JSON.parse(text); } };
    await handler(req as any, res as any); return { status: res.statusCode, ...res.result };
  }
  assert.equal((await approve(initial.updated_at, false)).status, 401);
  assert.equal((await approve("2026-10-08T00:00:00Z")).status, 409);
  assert.equal((await db.query("select * from content_publications")).rows.length, 0);
  const approved = await approve(initial.updated_at);
  assert.equal(approved.status, 200, JSON.stringify(approved));
  const row = approved.rows[0];
  assert.equal(row.body, edition.body);
  assert.equal(row.summary, edition.tldr);
  assert.equal(row.source_snapshot.ownerApproval.compiledHash, edition.compiledHash);
  const publications = (await db.query("select * from content_publications")).rows as any[];
  const context = { planet: "sun", sign: "libra", activeInstant: "2026-10-09T12:00:00Z" };
  assert.deepEqual(skyIngressEssayPublicationKeys(publications, context), [edition.contentKey],
    "Approve & publish must register the exact dated edition for reader discovery");
  assert.equal(publications[0].row_id, id);
  const projected = projectReaderRow(row);
  assert.equal(isGeneratedContentReaderBoundaryAllowed(projected), true);
  const reading = skyIngressEssayReaderSection([{ ...projected, contentKey: projected.content_key, sourceSnapshot: projected.source_snapshot }], context);
  assert.equal(reading?.body, edition.body);
  assert.equal(reading?.tldr, edition.tldr);
  // A previously approved row without a ledger record must be repairable through
  // the same version-checked owner action, without altering approved wording.
  await db.exec("delete from content_publications");
  const recovered = await approve(row.updated_at);
  assert.equal(recovered.status, 200, JSON.stringify(recovered));
  assert.equal(recovered.rows[0].body, edition.body);
  assert.equal((await db.query("select * from content_publications")).rows.length, 1);
  currentId = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
  const fallbackKey = "sky-season-fallback/libra-2026/moon/aquarius/2026-09-21";
  const fallback = { ...initial, id: currentId, content_key: fallbackKey, event_type: "sky-season-fallback",
    headline: "Synthetic Moon visit", summary: "Exact synthetic summary.", body: "Exact synthetic complete fallback.",
    sections: { seasonFallback: {schema:"libra-season-2026-placement-fallback/v1",body:"Moon",sign:"Aquarius",
      entry:"2026-09-21T17:14:22.999Z",exit:"2026-09-24T03:23:38.000Z",seasonStart:"2026-09-23T00:05:13.999Z",seasonEnd:"2026-09-24T03:23:38.000Z"} } };
  await db.query("insert into generated_interpretations select * from jsonb_populate_record(null::generated_interpretations,$1)", [JSON.stringify(fallback)]);
  const request = Object.assign(Readable.from([JSON.stringify({id:currentId,expectedUpdatedAt:initial.updated_at,status:"LIVE",lane:"serving"})]),
    {method:"PATCH",url:"/api/admin/generated-content",headers:{"x-content-generation-secret":env.CONTENT_GENERATION_SECRET}});
  const response = {statusCode:0,result:{} as any,setHeader(){},end(text:string){this.result=JSON.parse(text)}};
  await handler(request as any,response as any);
  assert.equal(response.statusCode,200,JSON.stringify(response.result));
  const publishedFallback=response.result.rows[0];
  assert.equal(publishedFallback.body,fallback.body);
  assert.equal(publishedFallback.source_snapshot.ownerApproval.action,"approve-sky-season-fallback");
  const fallbackPublications=(await db.query("select * from content_publications where content_key=$1",[fallbackKey])).rows;
  assert.equal(fallbackPublications.length,1);
  assert.equal(fallbackPublications[0].row_id,currentId);
  console.log("PASS ingress publication: actual owner action, SQL lifecycle trigger, exact reader discovery, unchanged wording, missing-ledger recovery, stale version and anonymous denial.");
} finally { globalThis.fetch = originalFetch; await db.close(); }
