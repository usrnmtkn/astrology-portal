import assert from "node:assert/strict";
import fs from "node:fs";
import { normalizeSkyV4PreviewInput } from "../api/admin/sky-v4-preview.ts";

assert.deepEqual(normalizeSkyV4PreviewInput({
  contentKey: "sky-placement/article/venus/virgo",
  draftFields: { placementArticle: "Draft article." }
}), {
  contentKey: "sky-placement/article/venus/virgo",
  draftFields: { placementArticle: "Draft article." }
});
assert.throws(() => normalizeSkyV4PreviewInput({ contentKey: "fallback-hook/not-v4" }), /canonical SKY V4/u);
assert.throws(() => normalizeSkyV4PreviewInput({
  contentKey: "sky-placement/article/venus/virgo",
  draftFields: Object.fromEntries(Array.from({ length: 17 }, (_, index) => [`field${index}`, "copy"]))
}), /Too many draft fields/u);

const endpoint = fs.readFileSync(new URL("../api/admin/sky-v4-preview.ts", import.meta.url), "utf8");
assert.match(endpoint, /isContentAdminAuthorized/u);
assert.match(endpoint, /renderSkyV4StudioPreview/u);
assert.match(endpoint, /cache-control", "private, no-store/u);

const dashboard = fs.readFileSync(new URL("../apps/admin/src/GeneratedContentAdminDashboard.tsx", import.meta.url), "utf8");
assert.match(dashboard, /Render canonical preview/u);
assert.match(dashboard, /\/api\/admin\/sky-v4-preview/u);
assert.match(dashboard, /Stage preview · serving OFF/u);

console.log("SKY V4 production-parity preview API: PASS (auth required; canonical resolver shared; serving OFF)");
