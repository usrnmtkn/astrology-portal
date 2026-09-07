#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildRows } from "./seed-published-calendar-aspect-content-studio.mjs";

// A scoped release, not an unrestricted upsert: retain prior copy and drafts,
// and reject concurrent edits instead of overwriting them.
const env = process.argv.find((arg) => arg.startsWith("--env="))?.slice(6);
if (env) process.loadEnvFile(env);
const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
assert.equal(new URL(url).hostname, "hdmdufozrgrajkfhydit.supabase.co");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(key, "SUPABASE_SERVICE_ROLE_KEY required");
const headers = { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" };
const release = "calendar-collective-20260907";
const manifest = JSON.parse(fs.readFileSync(new URL("../packages/astro-knowledge/review/sky-calendar-collective-approved-2026-09-07/shipping-manifest.json", import.meta.url)));
const paths = new Set(manifest.rows.map((row) => row.runtimeFile));
const expected = buildRows().filter((row) => paths.has(row.source_snapshot.sourceFile));
assert.equal(expected.length, 379);
async function request(params, init = {}) {
  const response = await fetch(`${url}/rest/v1/generated_interpretations?${new URLSearchParams(params)}`, {
    ...init, headers: { ...headers, prefer: "return=representation", ...init.headers }
  });
  const rows = await response.json();
  assert.ok(response.ok, `Studio request failed: ${response.status} ${JSON.stringify(rows)}`);
  assert.ok(Array.isArray(rows));
  return rows;
}
const catalog = [];
const lookupKeys = buildRows().flatMap((row) => {
  const { a, b, aspect } = row.source_snapshot.exactSkyAspectIdentity;
  return a === "north-node" ? [row.content_key, `sky.aspect.${b}.${aspect}.north-node`] : [row.content_key];
});
for (let i = 0; i < lookupKeys.length; i += 25) {
  catalog.push(...await request({ select: "*", content_key: `in.(${lookupKeys.slice(i, i + 25).join(",")})`, mode: "eq.in_depth", target_date: "is.null" }));
}
assert.equal(catalog.length, 439);
const current = catalog.filter((row) => paths.has(row.source_snapshot?.sourceFile));
assert.equal(current.length, 379);
const bySource = new Map(current.map((row) => [row.source_snapshot.sourceFile, row]));
assert.equal(bySource.size, 379);
const updates = [];
for (const next of expected) {
  const old = bySource.get(next.source_snapshot.sourceFile);
  assert.ok(old);
  if (old.content_key !== next.content_key) {
    const identity = next.source_snapshot.exactSkyAspectIdentity;
    assert.equal(identity.a, "north-node");
    assert.equal(old.content_key, `sky.aspect.${identity.b}.${identity.aspect}.north-node`);
    assert.ok(!catalog.some((row) => row.content_key === next.content_key), "Canonical key already exists");
  }
  assert.equal(old.status, "LIVE", `${next.content_key}: preserve pending editor work`);
  if (old.body === next.body && old.summary === next.summary && old.source_snapshot.sourceSchemaVersion === next.source_snapshot.sourceSchemaVersion) continue;
  // The release request supersedes older exact drafts. Preserve those drafts,
  // the installed baseline, and all prior review metadata in the row itself.
  const { packageDraft, ...sections } = old.sections ?? {};
  const patch = {
    ...next,
    sections: {
      ...sections, ...next.sections,
      calendarReleaseHistory: [...(sections.calendarReleaseHistory ?? []), {
        release, supersededAt: new Date().toISOString(),
        contentKey: old.content_key, headline: old.headline, summary: old.summary, body: old.body,
        packageRecord: old.sections?.packageRecord,
        packageOriginalRecord: old.sections?.packageOriginalRecord,
        packageDraft: packageDraft ?? null, sourceSnapshot: old.source_snapshot
      }]
    },
    updated_at: new Date().toISOString()
  };
  updates.push({ old, patch });
}
console.log(JSON.stringify({ release, expected: expected.length, updates: updates.length, supersededDrafts: updates.filter(({ old }) => old.sections?.packageDraft).length, apply: process.argv.includes("--apply") }));
if (process.argv.includes("--apply")) {
  for (const { old, patch } of updates) {
    const saved = await request({ id: `eq.${old.id}`, updated_at: `eq.${old.updated_at}` }, { method: "PATCH", body: JSON.stringify(patch) });
    assert.equal(saved.length, 1, `${old.content_key}: concurrent edit; stopped`);
    assert.equal(saved[0].body, patch.body);
    assert.equal(saved[0].summary, patch.summary);
    assert.equal(saved[0].sections.packageRecord.Body, patch.body);
    assert.equal(saved[0].sections.packageDraft, undefined);
  }
  console.log(`Verified ${updates.length} saved Calendar baselines; South Node rows untouched.`);
}
