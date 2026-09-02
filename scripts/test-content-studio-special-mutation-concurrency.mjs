#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const dashboard = fs.readFileSync("apps/admin/src/GeneratedContentAdminDashboard.tsx", "utf8");
const migration = fs.readFileSync("apps/web/supabase/migrations/20260902060000_content_studio_hydration_crud_reliability.sql", "utf8");
const api = fs.readFileSync("api/admin/generated-content.ts", "utf8");

for (const [label, pattern] of [
  ["Sky article revision autosave", /persistedArticleRow\?\.updated_at[\s\S]{0,180}expectedUpdatedAt: persistedArticleRow\.updated_at[\s\S]{0,220}ownerAction: "save-sky-article-edition-revision"/u],
  ["Sky article workspace autosave", /persistedWorkspaceRow\?\.updated_at[\s\S]{0,160}expectedUpdatedAt: persistedWorkspaceRow\.updated_at/u],
  ["Approve and schedule", /row\.updated_at[\s\S]{0,100}expectedUpdatedAt: row\.updated_at[\s\S]{0,120}ownerAction: "approve-and-schedule"/u],
  ["Approve Sky article", /row\.updated_at[\s\S]{0,100}expectedUpdatedAt: row\.updated_at[\s\S]{0,120}ownerAction: "approve-sky-article-edition"/u],
  ["Publish Sky article revision", /revisionRow\.updated_at[\s\S]{0,120}expectedUpdatedAt: revisionRow\.updated_at[\s\S]{0,120}ownerAction/u],
  ["Approve package revision", /row\.updated_at[\s\S]{0,100}expectedUpdatedAt: row\.updated_at[\s\S]{0,120}ownerAction: "approve-package-revision"/u]
]) {
  assert.match(dashboard, pattern, `${label} must send optimistic concurrency identity.`);
}

assert.match(
  migration,
  /p_provider in \([\s\S]*?'tldrastro-fallback-architecture-v3'[\s\S]*?'tldrastro-fallback-architecture-v3-sky-placement'[\s\S]*?\)/u,
  "The public runtime revision RPC must be restricted to governed fallback providers."
);

console.log("Content Studio special mutation concurrency contract passed.");


assert.match(api, /updateParams\.set\("updated_at", `eq\.\$\{body\.expectedUpdatedAt\}`\)/u, "Ordinary saves must put the expected version in the database mutation filter.");
assert.match(api, /deleteParams\.set\("status", "neq\.LIVE"\)/u, "Hard delete must atomically exclude rows that become LIVE.");
assert.match(api, /deleteParams\.set\("updated_at", `eq\.\$\{expectedUpdatedAt\}`\)/u, "Hard delete must put the expected version in the database mutation filter.");
