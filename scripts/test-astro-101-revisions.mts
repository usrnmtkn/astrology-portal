import assert from "node:assert/strict";
import { createApiStore } from "../tests/helpers/calendar-review-api.mjs";
import { astro101RevisionFixture } from "../tests/helpers/astro101-revision-fixture.ts";
import { articleLibraryKind, articlePublishAt, articleRevisionTarget } from "../src/shared/articleLibrary.ts";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { publicationMigrations, publicationTestSchema, seedPublicationRow, callPublicationRpc } from "../tests/helpers/studio-publication-db.mjs";
import { retainPendingPublicationCopy } from "../apps/admin/src/studioRevisionPublication.ts";

for (const kind of ["chapter", "article", "house"] as const) for (const mode of ["article", "all"]) {
  const initial = astro101RevisionFixture(kind, mode);
  const unrelated = { ...astro101RevisionFixture(kind === "chapter" ? "article" : "chapter"), status: "LIVE" };
  const store = await createApiStore([initial, unrelated], { uuidIds: true, projectSelect: true, sqlArticleLifecycle: true });
  const invoke = (row: any, patch: object) => store.invoke("PATCH", { id: row.id, expectedUpdatedAt: row.updated_at, ...patch });
  const read = async () => (await store.invoke("POST", { keys: [initial.content_key] }, "/api/content-reader")).payload.rows;
  try {
    assert(articleRevisionTarget(initial));
    assert.equal(articleLibraryKind(initial), null, "Learn pages do not become library articles");
    assert.equal(articlePublishAt(initial), null, "Learn pages do not acquire article scheduling");
    let result = await invoke(initial, { ownerAction: "publish-owner-content" });
    assert.equal(result.status, 200, JSON.stringify(result));
    const live = structuredClone(result.payload.rows[0]);
    assert.equal(live.mode, mode);
    assert.equal((await read())[0]?.body, initial.body);
    for (const unsafe of [{ status: "LIVE", body: "Unsafe live replacement." }, { body: "Implicit live replacement." },
      { ownerAction: "save-and-publish-owner-content", body: "Direct live replacement." },
      { status: "DRAFT", sourceLifecycleAction: "restore" },
      { status: "LIVE", sourceLifecycleAction: "archive", body: "Lifecycle bypass attempt." }]) {
      assert.equal((await invoke(live, unsafe)).status, 409, "Live Learn copy cannot be overwritten directly");
      assert.deepEqual(store.rows.get(live.id), live);
    }
    const copy = { headline: "Synthetic revised title", summary: "Synthetic revised card description.",
      body: "Synthetic private opening.\n\nSynthetic private final sentence.",
      sections: { ...live.sections, intro: "Synthetic private opening.", blocks: [
        { heading: "Synthetic revised section", level: 2, body: "Synthetic private final sentence.", style: "p",
          list: [{ ordered: false, items: ["Synthetic retained list item."] }] }
      ] }, facts: { ...live.facts, order: 3, related: [{ label: "Synthetic link", content_key: unrelated.content_key, slug: unrelated.facts.slug }] } };
    result = await invoke(live, { status: "DRAFT", ...copy });
    assert.equal(result.status, 200, JSON.stringify(result));
    let revision = result.payload.rows[0];
    assert.notEqual(revision.id, live.id);
    assert.equal(revision.mode, "studio-draft");
    assert.equal(revision.lane, "reference");
    assert.deepEqual(store.rows.get(live.id), live, "Draft B leaves every public A field unchanged");
    assert.equal((await read())[0]?.body, initial.body);
    const reload = await store.invoke("GET", undefined, `/api/admin/generated-content?id=${revision.id}`);
    assert.equal(reload.payload.rows[0]?.body, copy.body);
    for (const patch of [{ contentKey: unrelated.content_key }, { surface: "sky" }, { mode: "article" },
      { eventType: "sky_article" }, { sourceSnapshot: { targetRowId: unrelated.id } },
      { sourceSnapshot: { targetRowUpdatedAt: "2099-01-01T00:00:00.000Z" } },
      { sourceSnapshot: { targetContentKey: unrelated.content_key } }]) {
      const rejected = await invoke(revision, { status: "DRAFT", ...patch });
      assert.equal(rejected.status, 409, `Proposal identity and target metadata are immutable: ${JSON.stringify({patch,rejected})}`);
    }
    assert.equal((await invoke(revision, { ownerAction: "publish-owner-content" })).status, 409);
    assert.equal((await invoke(revision, { ownerAction: "publish-standalone-article-revision", body: "Unreviewed request body." })).status, 400);
    assert.deepEqual(store.rows.get(live.id), live);
    result = await invoke(revision, { status: "DRAFT", body: `${copy.body}\n\nSynthetic edited draft ending.`, mode: "studio-draft" });
    assert.equal(result.status, 200, JSON.stringify(result));
    revision = result.payload.rows[0];
    assert.deepEqual(store.rows.get(live.id), live);
    const archived = await invoke(revision, { status: "ARCHIVED" });
    assert.equal(archived.status, 200, JSON.stringify(archived));
    assert.equal((await read())[0]?.body, initial.body, "Archiving a proposal leaves A public");
    assert.equal((await invoke(archived.payload.rows[0], { ownerAction: "publish-standalone-article-revision" })).status, 409);
    result = await invoke(archived.payload.rows[0], { status: "DRAFT" });
    assert.equal(result.status, 200, JSON.stringify(result));
    revision = result.payload.rows[0];
    const changedTarget = { ...live, updated_at: "2099-01-01T00:00:00.000Z", summary: "Synthetic newer target." };
    store.rows.set(live.id, changedTarget);
    assert.equal((await invoke(revision, { ownerAction: "publish-standalone-article-revision" })).status, 409);
    assert.deepEqual(store.rows.get(live.id), changedTarget);
    store.rows.set(live.id, { ...live, status: "ARCHIVED" });
    assert.equal((await invoke(revision, { ownerAction: "publish-standalone-article-revision" })).status, 409);
    store.rows.set(live.id, live);
    const transport = globalThis.fetch;
    let droppedAcknowledgment = false;
    globalThis.fetch = async (input, init) => {
      const response = await transport(input, init);
      if (!droppedAcknowledgment && String(input).endsWith("/rpc/content_studio_publish_revision") && response.ok) {
        droppedAcknowledgment = true;
        throw new TypeError("Synthetic lost publication response after commit");
      }
      return response;
    };
    try { result = await invoke(revision, { ownerAction: "publish-standalone-article-revision" }); }
    finally { globalThis.fetch = transport; }
    assert.equal(result.status, 200, JSON.stringify(result));
    assert(droppedAcknowledgment, "Publication recovers its immutable SQL receipt after a lost response");
    const published = result.payload.rows[0];
    assert.equal(published.id, live.id);
    assert.equal(published.mode, mode, "Legacy Learn mode survives private editing and publication");
    for (const field of ["headline", "summary", "body", "sections", "facts"]) assert.deepEqual(published[field], revision[field], `Exact saved ${field} is published`);
    assert.equal(published.sections.articlePublication, undefined);
    assert.equal(store.rows.get(revision.id).status, "ARCHIVED");
    assert.equal((await read())[0]?.body, revision.body);
    assert.deepEqual((await read())[0]?.facts, { slug: copy.facts.slug, related: copy.facts.related }, "Reader projects supported public facts only");
    assert.deepEqual(store.rows.get(unrelated.id), unrelated, "Unrelated public writing is unchanged");
    result = await invoke(published, { status: "ARCHIVED" });
    assert.equal(result.status, 200, JSON.stringify(result));
    assert.deepEqual(await read(), []);
    result = await invoke(result.payload.rows[0], { status: "DRAFT" });
    assert.equal(result.status, 200, JSON.stringify(result));
    assert.deepEqual(await read(), [], "Restoring a public page produces a private draft");
    result = await invoke(result.payload.rows[0], { ownerAction: "publish-owner-content" });
    assert.equal(result.status, 200, JSON.stringify(result));
    assert.equal((await read())[0]?.body, revision.body);
  } finally { await store.close(); }
}
for (const row of [{ content_key: "education/astro-101/chapter/test", surface: "sky", mode: "article" },
  { content_key: "education/astro-101/chapter/test", surface: "education", mode: "studio-draft" },
  { content_key: "unrelated", surface: "education", mode: "all" }]) assert(!articleRevisionTarget(row));

// Apply the actual migration over the previous schema: data and permissions are
// invariant. Exercise the SQL guard directly, independently of API admission.
const db = new PGlite();
try {
  await db.exec(publicationTestSchema);
  for (const name of publicationMigrations.slice(0, -1)) await db.exec(readFileSync(new URL(`../apps/web/supabase/migrations/${name}`, import.meta.url), "utf8"));
  await db.exec("select set_config('request.jwt.claims','{\"role\":\"service_role\"}',false),set_config('request.headers','{\"x-content-publication-action\":\"publish\"}',false)");
  const target = { ...astro101RevisionFixture("chapter", "all"), status: "LIVE" };
  const proposal = { ...target, id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", status: "DRAFT", lane: "reference", mode: "studio-draft",
    event_type: "standalone-article-revision", source_snapshot: { targetRowId: target.id, targetRowUpdatedAt: target.updated_at, targetContentKey: target.content_key } };
  await seedPublicationRow(db, target); await seedPublicationRow(db, proposal);
  const snapshot = async () => ({ rows: (await db.query("select to_jsonb(g) as row from generated_interpretations g order by id")).rows,
    ledger: (await db.query("select to_jsonb(p) as row from content_publications p order by content_key")).rows,
    permissions: (await db.query("select prosecdef,proconfig,proacl from pg_proc where oid='public.content_studio_publish_revision(text,text,text,text,uuid,timestamptz,uuid,timestamptz,jsonb,jsonb,jsonb)'::regprocedure")).rows });
  const before = await snapshot();
  const migration = readFileSync(new URL(`../apps/web/supabase/migrations/${publicationMigrations.at(-1)}`, import.meta.url), "utf8");
  await db.exec(migration);
  assert.deepEqual(await snapshot(), before, "Migration changes no writing, publication state, or function privileges");
  const rights: any = (await db.query("select has_function_privilege('anon','public.content_studio_publish_revision(text,text,text,text,uuid,timestamptz,uuid,timestamptz,jsonb,jsonb,jsonb)','EXECUTE') as anon, has_function_privilege('authenticated','public.content_studio_publish_revision(text,text,text,text,uuid,timestamptz,uuid,timestamptz,jsonb,jsonb,jsonb)','EXECUTE') as authenticated, has_function_privilege('service_role','public.content_studio_publish_revision(text,text,text,text,uuid,timestamptz,uuid,timestamptz,jsonb,jsonb,jsonb)','EXECUTE') as service")).rows[0];
  assert.deepEqual(rights, { anon: false, authenticated: false, service: true });
  for (const [mode, surface] of [["all", "sky"], ["preview", "education"], [null, "education"]]) {
    await db.query("update generated_interpretations set mode=$1,surface=$2 where id=$3", [mode, surface, target.id]);
    const publication: any = (await db.query("select to_jsonb(p) as row from content_publications p where content_key=$1", [target.content_key])).rows[0]?.row ?? null;
    await assert.rejects(callPublicationRpc(db, "content_studio_publish_revision", {
      p_operation_id: "a".repeat(64), p_actor: "synthetic-owner", p_request_sha256: "b".repeat(64),
      p_action: "publish-standalone-article-revision", p_proposal_id: proposal.id, p_proposal_version: proposal.updated_at,
      p_target_id: target.id, p_target_version: target.updated_at, p_patch: { status: "LIVE", lane: "serving", review_state: null },
      p_dependencies: [], p_validation_context: { targetPublication: publication }
    }), (error: any) => error.code === "22023" && /Invalid standalone article revision target/u.test(error.message));
  }
  await assert.rejects(db.exec(migration), /Unexpected article revision target guard/u, "Migration fails closed on definition drift");
  await assert.rejects(db.query("update generated_interpretations set status='LIVE',lane='serving' where id=$1", [proposal.id]),
    (error: any) => error.code === "23514", "Private proposal constraint still rejects direct publication");
} finally { await db.close(); }
{
  const submitted: any = { contentKey: "education/astro-101/chapter/pending", headline: "Saved title", summary: "", body: "Saved body.", sections: {}, facts: { slug: "/learn/astro-101/pending", order: 1 } };
  const current = { ...submitted, facts: { ...submitted.facts, order: 2 } };
  const published = { ...submitted, id: "published-target", sourceSnapshot: { targetRowId: "server-target" } };
  const retained = retainPendingPublicationCopy(submitted, current, published);
  assert.equal(retained?.id, published.id);
  assert.equal(retained?.facts?.order, 2, "Newer fact edits survive the pending publication acknowledgment");
  assert.deepEqual(retained?.sourceSnapshot, published.sourceSnapshot, "A response keeps its server-owned target metadata");
  assert.equal(published.facts.order, 1);
}
console.log("Astro 101 chapter and lesson private-revision lifecycle passed (article/all; actual handler and publication SQL).");
