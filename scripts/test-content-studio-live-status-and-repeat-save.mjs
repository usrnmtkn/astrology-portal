import assert from "node:assert/strict";
import fs from "node:fs";

const dashboard = fs.readFileSync("apps/admin/src/GeneratedContentAdminDashboard.tsx", "utf8");
const api = fs.readFileSync("api/admin/generated-content.ts", "utf8");
const materializer = fs.readFileSync("scripts/materialize-fallback-architecture-v3-dashboard-rows.mjs", "utf8");

assert.match(api, /\["headline", "summary", "fact_line", "opening", "tension", "development", "close", "body", "body_you", "body_they"\]/u,
  "Package revisions must allow a second edit to title/summary after body edits.");
assert.match(materializer, /role === "authored_card" && contentKey\.startsWith\("authored\/sky-lunation-macro\/"\)/u,
  "Approved lunation macros must mirror the reader-serving package as Live in Content Studio.");
assert.match(dashboard, /scope="col">Status<\/th>/u);
assert.doesNotMatch(dashboard, /scope="col">App visibility<\/th>/u);
assert.doesNotMatch(dashboard, /scope="col">Editorial<\/th>/u);
assert.doesNotMatch(dashboard, /scope="col">App connection<\/th>/u);
assert.match(dashboard, /\? "Live" : "Not live"/u);
assert.match(dashboard, /sourceContentType === "authored-content" \|\| sourceRole === "authored-card"/u,
  "Authored package cards must not be labeled Legacy.");
console.log("Content Studio binary Live status and repeated package-edit contract passed.");
