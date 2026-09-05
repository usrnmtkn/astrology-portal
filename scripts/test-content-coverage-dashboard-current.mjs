import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const endpoint = read("api/admin/content-coverage.ts");
const page = read("apps/admin/src/ContentCoverageDashboard.tsx");
const main = read("apps/admin/src/main.tsx");
const primitives = read("apps/admin/src/AdminStudioPrimitives.tsx");

assert.match(endpoint, /isContentAdminAuthorized/u);
assert.match(endpoint, /transit-synastry-rows-v1\.json/u);
assert.match(endpoint, /sky-calendar-exact-approved-2026-09-04-held-trines-33/u);
assert.match(endpoint, /sky-v4-continuous-corpus-correction-v1\.json/u);
assert.match(endpoint, /sky-v4-placement-lunar-context-v1\.json/u);
assert.match(endpoint, /owner-authored-sky-placement-house-passages-v1\.json/u);
assert.match(endpoint, /content-unresolved-queue-v1\.json/u);
assert.match(endpoint, /missingJupiterLeo/u);

assert.match(page, /Content coverage/u);
assert.match(page, /Unresolved queue/u);
assert.match(page, /Friends coverage has a visible gap/u);
assert.match(page, /\/api\/admin\/content-coverage/u);
assert.match(main, /\/admin\/content\/coverage/u);
assert.match(primitives, />\s*Coverage\s*</u);

console.log("Content Studio coverage dashboard contract passed.");
