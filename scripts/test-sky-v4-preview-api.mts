import assert from "node:assert/strict";
import fs from "node:fs";
import { normalizeSkyV4PreviewInput } from "../api/admin/sky-v4-preview.ts";

const normalized = normalizeSkyV4PreviewInput({
  contentKey: "sky-placement/article/venus/virgo",
  draftFields: { placementArticle: "Draft article." }
});
assert.equal(normalized.contentKey, "sky-placement/article/venus/virgo");
assert.deepEqual(normalized.draftFields, { placementArticle: "Draft article." });
assert.deepEqual(normalized.motionConditions, []);
assert.deepEqual(normalized.aspects, []);
const governedAspect = normalizeSkyV4PreviewInput({
  contentKey: "fallback-hook/sky-aspect-sign/venus/virgo/trine/saturn/capricorn",
  draftFields: { Body: "Draft aspect body." },
  previewSurface: { kind: "continuous", subjectBody: "venus", subjectSign: "virgo", calculatedDate: "September 3", calculatedOrb: "1°" }
});
assert.equal(governedAspect.governedAspectSource.review_status, "approved");
assert.equal(governedAspect.previewSurface.calculatedOrb, "1°");
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
assert.match(dashboard, /lazy\(\(\) => import\("\.\/SkyV4StudioReviewPanel"\)\)/u);
const reviewPanel = fs.readFileSync(new URL("../apps/admin/src/SkyV4StudioReviewPanel.tsx", import.meta.url), "utf8");
assert.match(reviewPanel, /Render canonical preview/u);
assert.match(reviewPanel, /\/api\/admin\/sky-v4-preview/u);
assert.match(reviewPanel, /Stage preview · serving OFF/u);
assert.match(reviewPanel, /Governed provenance/u);

const generatedContentApi = fs.readFileSync(new URL("../api/admin/generated-content.ts", import.meta.url), "utf8");
assert.match(generatedContentApi, /sky-v4-governed-aspect-draft/u);
assert.match(generatedContentApi, /approved governed aspect baseline remains LIVE and unchanged/u);
const materializer = fs.readFileSync(new URL("./materialize-fallback-architecture-v3-dashboard-rows.mjs", import.meta.url), "utf8");
assert.match(materializer, /skyV4GovernedAspectStudioRecord\(row\) \?\? row/u);

console.log("SKY V4 production-parity preview API: PASS (auth required; canonical resolver shared; serving OFF)");
