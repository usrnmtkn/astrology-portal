import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);
const dashboard = fs.readFileSync(path.join(repoRoot, "apps/admin/src/GeneratedContentAdminDashboard.tsx"), "utf8");
const endpoint = fs.readFileSync(path.join(repoRoot, "api/admin/generated-content.ts"), "utf8");

assert.match(dashboard, /sourceLifecycleAction\?: "archive" \| "restore"/u, "The editor must expose a recoverable source lifecycle.");
assert.match(dashboard, /Archive source/u, "Saved transit passages must provide an archive action.");
assert.match(dashboard, /Restore as draft/u, "Archived transit passages must be recoverable.");
assert.match(dashboard, /did not return the saved row/u, "A successful HTTP status without a returned row must remain an error.");
assert.match(dashboard, /controller\.abort\(\)/u, "Admin requests must be abortable.");
assert.match(dashboard, /10_000/u, "The editor must stop waiting on stalled API calls.");
assert.match(dashboard, /!draftForSave\.id \? \{/u, "New governed source rows must include their create-only identity fields.");

assert.match(endpoint, /sourceLifecycleAction\?: "archive" \| "restore"/u, "The API must accept only the governed lifecycle actions.");
assert.match(endpoint, /sourceLifecycleAction === "archive"[\s\S]*?"deprecated"/u, "Archiving a package row must remove reader eligibility.");
assert.match(endpoint, /sourceLifecycleAction === "restore"[\s\S]*?"needs_review"/u, "Restoring a package row must fail closed into review.");
assert.match(endpoint, /contentStudioReview[\s\S]*?sourceLifecycleAction !== "archive"/u, "An existing review receipt must never block a fail-closed archive.");
assert.match(endpoint, /AdminStorageTimeoutError/u, "The API storage layer must have a bounded timeout.");
assert.match(endpoint, /Update completed without returning the saved row/u, "The API must reject empty update acknowledgements.");

console.log("Transit source CRUD and API resilience contract passed.");
