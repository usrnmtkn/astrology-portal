import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { contentLiveStatuses, servingPackageRecords } from "../api/_lib/content-live-status";
for (const key of ["cms/personal-transit-aspect/you/template", "fallback-hook/transit-house-event-frame/sun", "fallback-template/transit.house-event"]) {
  const staleLive = { id: key, content_key: key, status: "LIVE", lane: "serving", body: "Historical approved copy.", provider: "tldrastro-fallback-architecture-v3", sections: { packageRecord: { contentKey: key, review_status: "approved", body: "Historical approved copy." } } };
  assert.equal(contentLiveStatuses([staleLive], [staleLive], () => true, () => true)[0].live, false, "Retirement wins even over a stale explicit publication.");
}
const macros = [...servingPackageRecords.values()].filter((row) => row.contentKey.startsWith("authored/sky-lunation-macro/"));
assert(macros.length > 0, "The installed reader package must contain lunation macros.");
for (const record of macros) {
  const mirror = { id: record.contentKey, content_key: record.contentKey, status: "DRAFT", lane: "reference", sections: { packageRecord: record } };
  assert.equal(contentLiveStatuses([mirror])[0].label, "Live", record.contentKey);
  assert.equal(contentLiveStatuses([{ ...mirror, sections: { ...mirror.sections, packageDraft: { ...record, body: "QA unsent revision." } } }])[0].label, "Not live");
  const changed = { ...mirror, sections: { packageRecord: { ...record, body: "QA different mirrored copy." } } };
  assert.equal(contentLiveStatuses([changed])[0].live, false, "A key match alone cannot make different copy live.");
  const live = { ...mirror, id: "live", provider: "tldrastro-fallback-architecture-v3", source_snapshot: { contentType: "authored-content" }, status: "LIVE", lane: "serving", updated_at: "2026-09-07T10:00:00Z", sections: { packageRecord: { ...record, body: "QA approved revision." } } };
  assert.equal(contentLiveStatuses([mirror], [live])[0].live, false, "An active override shadows different package copy.");
  assert.equal(contentLiveStatuses([live], [live])[0].live, true);
}
// A published exact natal row keeps its title and summary on the row, not in the package record. The
// row is the copy readers receive, so it must not be reported as a different version of itself.
const exactNatal = {
  id: "qa-exact-natal", content_key: "fallback-hook/natal-aspect-lived/lilith/square/ascendant",
  status: "LIVE", lane: "serving", review_state: null, provider: "tldrastro-fallback-architecture-v3",
  surface: "you", mode: "in_depth", event_type: "fallback-hook", block_type: "fallback_hook",
  headline: "Lilith Square Ascendant", summary: "Exact natal aspect writing.", body: "Exact You copy.",
  updated_at: "2026-09-07T12:00:00Z",
  facts: { fallbackArchitectureV3: true, review_status: "approved" },
  source_snapshot: { sourcePackage: "tldrastro-fallback-architecture-v3", review_status: "approved" },
  sections: { packageRecord: { contentKey: "fallback-hook/natal-aspect-lived/lilith/square/ascendant",
    content_role: "full_copy", grammar_frame: "complete_sentence", body_you: "Exact You copy.",
    body_they: "{{Name}} receives exact They copy.", reader_only: true,
    render_policy: "reader-only-exact-lived-v1", review_status: "approved",
    approval: { approvalLevel: "exact_owner_approved", action: "content-studio-publish",
      recordPath: "/api/admin/generated-content?contentKey=fallback-hook%2Fnatal-aspect-lived%2Flilith%2Fsquare%2Fascendant",
      payloadSha256: "3c8b80ad08d4c4457f76b3653e601514ee7cc894543e22c1275bbe546fd8d2f1",
      approvedAt: "2026-09-07T12:00:00Z" } } }
};
assert.equal(contentLiveStatuses([exactNatal], [exactNatal])[0].label, "Live",
  "A published exact natal row is the copy readers receive.");
assert.equal(contentLiveStatuses([{ ...exactNatal, headline: "QA later title" }], [exactNatal])[0].live, false,
  "A row whose title differs from the serving row is still not live.");

const parked = { id: "parked", content_key: "sky.planetary.moon.house_10", status: "LIVE", lane: "serving", body: "QA parked copy." };
assert.equal(contentLiveStatuses([parked])[0].live, false);
assert.equal(contentLiveStatuses([{ ...parked, content_key: "article/manual/unknown", mode: "article" }])[0].live, false);
const key = "authored/sky-lunation-macro/new-moon/virgo";
const out = join(tmpdir(), `studio-live-materialization-${process.pid}.json`);
execFileSync(process.execPath, ["scripts/materialize-fallback-architecture-v3-dashboard-rows.mjs", `--content-key=${key}`, `--out=${out}`], { stdio: "pipe" });
const materialized = JSON.parse(readFileSync(out, "utf8")).rows.find((row: any) => row.content_key === key);
assert.equal(materialized.status, "LIVE");
assert.equal(materialized.lane, "serving");
assert.equal(materialized.review_state, null);
assert.equal(materialized.source_snapshot.contentSystem, "authored");
assert.equal(materialized.body, servingPackageRecords.get(key)?.body, "Materialization must preserve the full owner macro.");
console.log(`PASS: ${macros.length} shipped macros, exact-copy comparison, pending edits, active overlay precedence, disconnected rows, and actual materialization`);

// Exercise the real authenticated endpoint with isolated storage responses.
const { Readable } = await import("node:stream");
const { default: handler } = await import("../api/admin/content-live-status");
process.env.CONTENT_GENERATION_SECRET = "live-status-qa-secret";
process.env.SUPABASE_URL = "https://studio-live-status.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "live-status-qa-service";
const macro = servingPackageRecords.get(key)!;
let dbRows: any[] = [{ id: "qa-virgo", content_key: key, status: "DRAFT", lane: "reference", sections: { packageRecord: macro } }];
let publications: any[] = [];
let storageReads = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input) => {
  const url = new URL(String(input));
  assert.equal(url.origin, "https://studio-live-status.invalid");
  storageReads++;
  if (url.pathname === "/rest/v1/content_publications") return Response.json(publications);
  if (url.searchParams.has("provider")) return Response.json([]);
  return Response.json(dbRows.filter((row) => (!url.searchParams.has("id") || url.searchParams.get("id")!.includes(row.id)) && (!url.searchParams.has("status") || row.status === "LIVE")));
};
async function request(ids: unknown, secret = "live-status-qa-secret") {
  const req: any = Readable.from([JSON.stringify({ ids })]);
  req.method = "POST";
  req.headers = { "x-content-generation-secret": secret };
  let result: any;
  const res: any = { statusCode: 0, setHeader() {}, end(body: string) { result = JSON.parse(body); } };
  await handler(req, res);
  return { code: res.statusCode, ...result };
}
async function catalog(secret: string) {
  const req: any = Readable.from([JSON.stringify({ action: "composition-catalog" })]);
  req.method = "POST"; req.headers = { "x-content-generation-secret": secret };
  let result: any;
  const res: any = { statusCode: 0, setHeader() {}, end(body: string) { result = JSON.parse(body); } };
  await handler(req, res);
  return { code: res.statusCode, ...result };
}
assert.equal((await catalog("wrong")).code, 401);
const catalogResult = await catalog("live-status-qa-secret");
assert.equal(catalogResult.code, 200);
assert.ok(catalogResult.rows.some((row: any) => row.content_key === "fallback-hook/natal-you-placement-sign-final/uranus/scorpio"));
assert.ok(catalogResult.rows.every((row: any) => !row.body && !row.sections), "Initial catalog should load identifiers; complete sources load on selection.");
assert.equal((await request(["qa-virgo"], "wrong")).code, 401);
assert.equal(storageReads, 0, "Unauthorized callers must not reach content storage.");
assert.equal((await request(Array(65).fill("qa-virgo"))).code, 400);
assert.equal((await request(["bad,id"])).code, 400);
assert.equal((await request(["qa-virgo"])).statuses[0].label, "Live");
publications = [{ content_key: key, state: "retired", revision: 1, row_id: "qa-virgo", row_updated_at: null, updated_at: "2026-09-07T18:00:00Z" }];
assert.equal((await request(["qa-virgo"])).statuses[0].label, "Not live", "Retirement overrides bundled copy.");
assert.equal((await request([`package:${key}`])).statuses[0].label, "Not live");
publications = [{ ...publications[0], state: "live", revision: 2, row_id: "missing-current-row", row_updated_at: "2026-09-07T18:00:00Z" }];
assert.equal((await request(["qa-virgo"])).statuses[0].label, "Not live", "An unavailable current publication cannot fall back to an older bundle.");
publications = [];

dbRows[0].sections.packageDraft = { ...macro, body: "QA unsent revised macro." };
assert.equal((await request(["qa-virgo"])).statuses[0].label, "Not live");
assert.equal((await request([`package:${key}`])).statuses[0].label, "Live");
const safe = { id: "safe", content_key: "cms/qa/exact", status: "LIVE", lane: "serving", body: "QA reader passage.", provider: "manual-admin" };
assert.equal(contentLiveStatuses([safe])[0].live, true);
const astro101 = {
  id: "astro-101",
  content_key: "education/astro-101/chapter/01-what-is-a-birth-chart",
  surface: "education",
  status: "LIVE",
  lane: "serving",
  review_state: null,
  headline: "What is a birth chart?",
  body: "A birth chart is a map of the sky.",
  facts: { slug: "/learn/astro-101/what-is-a-birth-chart" },
  sections: { packageRecord: { content_role: "education_article", review_status: "needs_review" } }
};
assert.equal(contentLiveStatuses([astro101])[0].live, true, "Learn-serving Astro 101 rows stay Live even with an education packageRecord.");
assert.equal(contentLiveStatuses([astro101], [astro101], () => false)[0].live, true, "Learn does not use the publication ledger for Astro 101.");
assert.equal(contentLiveStatuses([{ ...astro101, status: "DRAFT" }])[0].live, false);
for (const extra of [{ facts: { sourceStatus: "legacy" } }, { flags: ["BLOCKLIST_MATCH"], facts: { tldrStore: {} } }, { sections: { body: "Imported from approved project source material." } }, { review_state: "needs-review" }]) {
  assert.equal(contentLiveStatuses([{ ...safe, ...extra }])[0].live, false, JSON.stringify(extra));
}
const natal = { ...safe, content_key: "fallback-hook/natal-aspect-lived/lilith/square/ascendant", provider: "tldrastro-fallback-architecture-v3", sections: { packageRecord: { contentKey: "fallback-hook/natal-aspect-lived/lilith/square/ascendant", content_role: "full_copy", reader_only: true, render_policy: "reader-only-exact-lived-v1", review_status: "approved", body_you: "QA approved natal aspect." } } };
const { approveNatalAspectStudioCopy } = await import("../api/_lib/content-studio-approval");
approveNatalAspectStudioCopy(natal.sections.packageRecord, natal.content_key);
assert.equal(contentLiveStatuses([natal])[0].live, true, "Approved new natal aspects must reach the reader overlay.");
assert.equal(contentLiveStatuses([{ ...natal, status: "DRAFT" }])[0].live, false);
const aspectPairKey = "fallback-hook/aspect-pair/sun/mercury/conjunction";
const aspectPair = servingPackageRecords.get(aspectPairKey);
assert.ok(aspectPair, "Sun conjunction Mercury pair writing must be in the installed reader package.");
const aspectPairDraft = {
  id: "aspect-pair-draft",
  content_key: aspectPairKey,
  status: "DRAFT",
  lane: "reference",
  review_state: "needs-review",
  provider: "tldrastro-fallback-architecture-v3",
  body: aspectPair.body_you,
  sections: {
    packageRecord: {
      contentKey: aspectPairKey,
      content_role: "fallback_hook",
      body: aspectPair.body_you,
      review_status: "needs_review"
    }
  },
  source_snapshot: { review_status: "needs_review" }
};
assert.equal(contentLiveStatuses([aspectPairDraft])[0].live, true, "A Draft Studio mirror of live natal pair writing must still show Live.");
assert.equal(contentLiveStatuses([aspectPairDraft])[0].source, "package");
assert.equal(contentLiveStatuses([{ ...aspectPairDraft, body: "Different unpublished pair writing.", sections: { packageRecord: { body: "Different unpublished pair writing." } } }])[0].live, false);
globalThis.fetch = originalFetch;
console.log("PASS: authenticated status API, input limits, exact macro copy, virtual package copy, shared reader rejection checks, and new natal aspect eligibility");

const user = { id: "qa-user", user_id: "qa-owner", subject_type: "natal", subject_id: "qa-chart", content_key: "qa/personal", target_date: null, status: "LIVE", body: "QA personal passage." };
globalThis.fetch = async (input) => {
  const url = new URL(String(input));
  assert.equal(url.origin, "https://studio-live-status.invalid");
  assert.equal(url.pathname, "/rest/v1/user_generated_interpretations");
  return Response.json(url.searchParams.has("id") || user.status === "LIVE" ? [user] : []);
};
assert.equal((await request(["user:qa-user"])).statuses[0].label, "Live");
user.status = "DRAFT";
assert.equal((await request(["user:qa-user"])).statuses[0].label, "Not live");
globalThis.fetch = originalFetch;
console.log("PASS: personalized status uses the private reader table and selection scope");

// The same exact-aspect catalog feeds Studio and the real Calendar/Sky reader.
const { buildRows } = await import("./seed-published-calendar-aspect-content-studio.mjs");
const exactRows = buildRows().map((row: any, i: number) => ({ ...row, id: `exact-${i}` }));
assert(exactRows.length >= 379);
for (const row of exactRows) {
  assert.equal(contentLiveStatuses([row])[0].live, true, row.content_key);
  const revised = { ...row, sections: { ...row.sections, packageDraft: { ...row.sections.packageRecord, Body: "QA pending exact revision." } } };
  assert.equal(contentLiveStatuses([revised])[0].live, false, `${row.content_key}: pending copy cannot inherit live metadata`);
}
const saturn = exactRows.find((row: any) => row.content_key === "sky.aspect.saturn.square.lilith");
assert.equal(contentLiveStatuses([{ ...saturn, status: "DRAFT", lane: "reference" }])[0].source, "package", "The actual installed reader baseline remains available independently of mirror metadata.");
const update = { ...saturn, id: "current-exact", updated_at: "2026-09-07T18:00:00Z", body: "QA newly published exact aspect.", sections: { ...saturn.sections, packageRecord: { ...saturn.sections.packageRecord, Body: "QA newly published exact aspect." } } };
assert.equal(contentLiveStatuses([update])[0].source, "studio");
assert.equal(contentLiveStatuses([saturn], [update])[0].live, false, "A different active exact version supersedes the baseline.");
assert.equal(contentLiveStatuses([{ ...update, source_snapshot: { ...update.source_snapshot, exactSkyAspectIdentity: { a: "mars", b: "lilith", aspect: "square" } } }])[0].live, false, "Mismatched reader identity cannot serve.");
assert.equal(contentLiveStatuses([{ ...update, review_state: "needs-review" }])[0].live, false);
console.log(`PASS: ${exactRows.length} actual Calendar exact rows, pending revisions, bundled baseline, active versions, reader identity, and review holds`);

// Audit the second source class: installed CMS defaults with no database mirror.
const { builtinContentRecords } = await import('../api/_lib/content-live-status');
const { skyDailySummaryFields } = await import('../apps/web/src/content/skyDailySummaryCatalog');
for (const field of skyDailySummaryFields) {
  const baseline = builtinContentRecords.get(field.key)!;
  assert.equal(contentLiveStatuses([baseline], [])[0].live, field.readerEnabled !== false && Boolean(field.body.trim()), field.key);
  const mirror = { ...baseline, id: 'summary-mirror', status: 'DRAFT', lane: 'serving', review_state: 'EDITORIAL_REVIEW_REQUIRED' };
  assert.equal(contentLiveStatuses([mirror], [mirror])[0].live, field.readerEnabled !== false && Boolean(field.body.trim()), `${field.key}: exact bundled wording is live independently of a draft mirror`);
  if (field.readerEnabled === false) {
    const published = { ...mirror, status: 'LIVE', review_state: null };
    assert.equal(contentLiveStatuses([published], [published])[0].live, false, 'Unused template fields never inherit a Live row status');
  }
  assert.equal(contentLiveStatuses([{ ...mirror, body: 'QA unsaved different summary' }], [])[0].live, false);
}
assert.equal(contentLiveStatuses([safe], [safe], () => false)[0].live, false, 'A raw LIVE row must not bypass the publication ledger');
const summaryKey = 'cms/sky-daily-summary/sun/virgo';
const summaryBuiltin = builtinContentRecords.get(summaryKey)!;
dbRows = [];
publications = [];
globalThis.fetch = async input => {
  const url = new URL(String(input));
  assert.equal(url.origin, 'https://studio-live-status.invalid');
  return Response.json(url.pathname.endsWith('/content_publications') ? publications : dbRows);
};
assert.equal((await request([summaryBuiltin.id])).statuses[0].label, 'Live');
const summaryRow = { ...summaryBuiltin, id: 'summary-published', status: 'LIVE', lane: 'serving', review_state: null, body: 'QA current summary wording', updated_at: '2026-09-07T22:00:00.000123Z' };
dbRows = [summaryRow];
publications = [{ content_key: summaryKey, state: 'live', revision: 1, row_id: summaryRow.id, row_updated_at: summaryRow.updated_at, updated_at: summaryRow.updated_at }];
assert.equal((await request([summaryBuiltin.id])).statuses[0].label, 'Not live');
assert.equal((await request([summaryRow.id])).statuses[0].label, 'Live');
publications = [{ ...publications[0], state: 'retired', revision: 2 }];
assert.equal((await request([summaryRow.id, summaryBuiltin.id])).statuses.every((status: any) => !status.live), true);
globalThis.fetch = originalFetch;
console.log(`PASS: all ${skyDailySummaryFields.length} Daily Sky defaults, absent/identical/different CMS rows, current publication, retired sources, and ordinary-row ledger checks`);

// Initialized publications make each Sky source independent; status must not load a giant legacy mirror.
const { isSkyPartitionKey } = await import('../api/_lib/content-live-status');
const skySource = [...servingPackageRecords.values()].find(record => isSkyPartitionKey(record.contentKey) && (record.body || record.body_you))!;
const skyRow = { id: 'qa-current-sky', content_key: skySource.contentKey, status: 'LIVE', lane: 'serving', review_state: null,
  body: skySource.body ?? skySource.body_you, updated_at: '2026-09-07T22:30:00Z', provider: 'tldrastro-fallback-architecture-v3-sky-placement',
  sections: { packageRecord: skySource }, source_snapshot: { contentType: 'fallback-system', content_role: skySource.content_role, review_status: skySource.review_status } };
const skyPublications = [
  { content_key: '__content-publication-ledger/v1', state: 'live', revision: 1, row_id: null, row_updated_at: null, updated_at: skyRow.updated_at },
  { content_key: skyRow.content_key, state: 'live', revision: 1, row_id: skyRow.id, row_updated_at: skyRow.updated_at, updated_at: skyRow.updated_at }
];
let skyReads = 0;
globalThis.fetch = async input => {
  const url = new URL(String(input));
  assert.equal(url.origin, 'https://studio-live-status.invalid');
  assert.equal(url.searchParams.has('provider'), false, 'A status check must not load the obsolete full Sky partition');
  skyReads++;
  return Response.json(url.pathname.endsWith('/content_publications') ? skyPublications : [skyRow]);
};
assert.equal((await request([skyRow.id])).statuses[0].label, 'Live');
assert.equal(skyReads, 3, 'Read the selected row, key candidates, and publication identities only');
globalThis.fetch = originalFetch;
console.log('PASS bounded current-Sky status lookup without bulk partition loading');

const { default: summaryClauses } = await import('../apps/web/src/content/skyDailySummaryClauses.json', { with: { type: 'json' } });
for (const [part, body] of Object.entries(summaryClauses.provenance.previousClauses)) {
  const key = `cms/sky-daily-summary/${part}`;
  if (part.startsWith('moon/')) {
    assert.equal(builtinContentRecords.has(key), false, 'Legacy Moon clauses are replaced by explicit V6 event variants');
    continue;
  }
  const builtin = builtinContentRecords.get(key)!;
  assert.ok(builtin, 'Approved Sun migration retains its source record');
  const previousRow = { ...builtin, id: `qa-previous-${part}`, body, status: 'LIVE', lane: 'serving', review_state: null };
  assert.equal(contentLiveStatuses([previousRow, builtin], [previousRow]).every(status => status.live), true,
    'Studio compares the same approved wording migration as the reader');
}
console.log('PASS installed and saved summary status follow the current approved wording');
