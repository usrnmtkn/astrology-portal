#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import {
  filterUnresolvedContentItems,
  loadUnresolvedContentReport,
  type UnresolvedContentReport
} from "../apps/admin/src/UnresolvedContentReview";
import {
  loadContentUnresolvedReport,
  unresolvedContentSurface
} from "../api/admin/content-unresolved";

const dashboardSource = fs.readFileSync(new URL("../apps/admin/src/GeneratedContentAdminDashboard.tsx", import.meta.url), "utf8");
const reviewSource = fs.readFileSync(new URL("../apps/admin/src/UnresolvedContentReview.tsx", import.meta.url), "utf8");
const endpointSource = fs.readFileSync(new URL("../api/admin/content-unresolved.ts", import.meta.url), "utf8");
const report = loadContentUnresolvedReport() as UnresolvedContentReport;

assert.equal(report.count, report.items.length, "The Studio inventory count must match the governed queue items.");
assert.ok(report.count > 0, "The governed unresolved queue must populate the Studio inventory.");
assert.equal(
  Object.values(report.reasonCounts).reduce((sum, count) => sum + count, 0),
  report.count,
  "The governed reason counts must cover every unresolved item."
);

assert.equal(unresolvedContentSurface("daily-glance-variant/square/moon/body/a"), "Daily Glance");
assert.equal(unresolvedContentSurface("authored/book/lunation-horoscope/eclipse-lunar/pisces"), "Lunations");
assert.equal(unresolvedContentSurface("fallback-hook/sky-sign-copy/sun/virgo"), "Sky / Transits");
assert.equal(unresolvedContentSurface("fallback-hook/natal/venus/libra"), "Natal / Placements");

const contractFailures = filterUnresolvedContentItems(report.items, "sun/virgo");
assert.ok(contractFailures.length > 0, "The Studio filters must expose known contract failures by key and surface.");
assert.ok(contractFailures.every((item) => item.reason === "known-current-contract-failure"));
assert.equal(filterUnresolvedContentItems(report.items, "not-a-real-content-key").length, 0);

const loadedReport = await loadUnresolvedContentReport(
  "header.payload.signature",
  async (_input, init) => {
    assert.equal((init?.headers as Record<string, string>)["x-content-admin-session"], "header.payload.signature");
    return new Response(JSON.stringify({ ok: true, report }), { status: 200, headers: { "content-type": "application/json" } });
  }
);
assert.equal(loadedReport.count, report.count, "The authenticated Studio loader must return the governed queue.");

assert.match(reviewSource, /Everything still waiting for resolution/u);
assert.match(reviewSource, /Loading unresolved records/u);
assert.match(reviewSource, /No unresolved records match these filters\./u, "The page must include a clear empty-state message.");

assert.match(dashboardSource, /unresolvedContent:\s*"unresolved-content"/u, "The Studio must expose a stable unresolved-content route.");
assert.match(dashboardSource, /label:\s*"Unresolved Content"/u, "The Studio navigation must expose the governed inventory.");
assert.match(dashboardSource, /new URLSearchParams\(\{ q: contentKey \}\)/u, "Inventory rows must link into Content Library by exact key.");
assert.doesNotMatch(reviewSource, /\badminJsonRequest\s*\(/u, "The governed inventory must not use a mutation-capable admin client.");
assert.match(endpointSource, /req\.method !== "GET"/u, "The unresolved-content endpoint must be GET-only.");
assert.match(endpointSource, /await isContentAdminAuthorized\(req\)/u, "The unresolved-content endpoint must require verified owner access.");
assert.doesNotMatch(endpointSource, /\b(?:POST|PATCH|DELETE)\b/u, "The unresolved-content endpoint must remain read-only.");

console.log(`Content Studio unresolved inventory contract passed (${report.count} items).`);
