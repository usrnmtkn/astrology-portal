import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { contentLiveStatuses, servingPackageRecords } from "../api/_lib/content-live-status";
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
const parked = { id: "parked", content_key: "sky.planetary.moon.house_10", status: "LIVE", lane: "serving", body: "QA parked copy." };
assert.equal(contentLiveStatuses([parked])[0].live, false);
assert.equal(contentLiveStatuses([{ ...parked, content_key: "article/manual/unknown", mode: "article" }])[0].live, false);
const key = "authored/sky-lunation-macro/new-moon/virgo";
const out = `/private/tmp/studio-live-materialization-${process.pid}.json`;
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
let storageReads = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input) => {
  const url = new URL(String(input));
  assert.equal(url.origin, "https://studio-live-status.invalid");
  storageReads++;
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
assert.equal((await request(["qa-virgo"], "wrong")).code, 401);
assert.equal(storageReads, 0, "Unauthorized callers must not reach content storage.");
assert.equal((await request(Array(65).fill("qa-virgo"))).code, 400);
assert.equal((await request(["bad,id"])).code, 400);
assert.equal((await request(["qa-virgo"])).statuses[0].label, "Live");
dbRows[0].sections.packageDraft = { ...macro, body: "QA unsent revised macro." };
assert.equal((await request(["qa-virgo"])).statuses[0].label, "Not live");
assert.equal((await request([`package:${key}`])).statuses[0].label, "Live");
const safe = { id: "safe", content_key: "cms/qa/exact", status: "LIVE", lane: "serving", body: "QA reader passage.", provider: "manual-admin" };
assert.equal(contentLiveStatuses([safe])[0].live, true);
for (const extra of [{ facts: { sourceStatus: "legacy" } }, { flags: ["BLOCKLIST_MATCH"], facts: { tldrStore: {} } }, { sections: { body: "Imported from approved project source material." } }, { review_state: "needs-review" }]) {
  assert.equal(contentLiveStatuses([{ ...safe, ...extra }])[0].live, false, JSON.stringify(extra));
}
const natal = { ...safe, content_key: "fallback-hook/natal-aspect-lived/lilith/square/ascendant", provider: "tldrastro-fallback-architecture-v3", sections: { packageRecord: { contentKey: "fallback-hook/natal-aspect-lived/lilith/square/ascendant", content_role: "full_copy", reader_only: true, render_policy: "reader-only-exact-lived-v1", review_status: "approved", body_you: "QA approved natal aspect." } } };
const { approveNatalAspectStudioCopy } = await import("../api/_lib/content-studio-approval");
approveNatalAspectStudioCopy(natal.sections.packageRecord, natal.content_key);
assert.equal(contentLiveStatuses([natal])[0].live, true, "Approved new natal aspects must reach the reader overlay.");
assert.equal(contentLiveStatuses([{ ...natal, status: "DRAFT" }])[0].live, false);
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
