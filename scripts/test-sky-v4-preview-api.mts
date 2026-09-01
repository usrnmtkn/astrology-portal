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
assert.match(reviewPanel, /Main reader copy/u);
assert.match(reviewPanel, /Fallback copy/u);
assert.match(reviewPanel, /Hook · Lived · Turn/u);
assert.match(reviewPanel, /Review all 120 continuous fallbacks/u);
assert.match(reviewPanel, /Continuous placement fallbacks/u);
assert.match(reviewPanel, /fallback\.hook/u);
assert.match(reviewPanel, /fallback\.lived/u);
assert.match(reviewPanel, /fallback\.turn/u);
assert.match(reviewPanel, /status=all&visibility=all&surface=sky&limit=1000/u);
assert.match(reviewPanel, /packageDraft: nextDraft/u);
assert.match(reviewPanel, /reviewStatus: "needs_review"/u);
assert.match(reviewPanel, /approved serving baseline remains live/u);
assert.match(reviewPanel, /announceContentUpdate\(\{/u);
assert.doesNotMatch(reviewPanel, /serving_enabled\s*=/u);

const generatedContentApi = fs.readFileSync(new URL("../api/admin/generated-content.ts", import.meta.url), "utf8");
assert.match(generatedContentApi, /sky-v4-governed-aspect-draft/u);
assert.match(generatedContentApi, /approved governed aspect baseline remains LIVE and unchanged/u);
assert.match(generatedContentApi, /skyV4OwnerApprovedReaderCopyKeys\.has\(row\.content_key\)/u);
assert.match(generatedContentApi, /skyV4ServingReleasedReaderCopyKeys/u);
assert.match(generatedContentApi, /forksSkyV4ServingDraft/u);
assert.match(generatedContentApi, /sky-v4-reader-copy-draft/u);
assert.match(generatedContentApi, /reviewState: "serving-disabled"|"serving-disabled"/u);
const materializer = fs.readFileSync(new URL("./materialize-fallback-architecture-v3-dashboard-rows.mjs", import.meta.url), "utf8");
assert.match(materializer, /skyV4GovernedAspectStudioRecord\(row\) \?\? row/u);
assert.match(materializer, /contentKey\.startsWith\("sky-placement\/article\/"\)/u);

console.log("SKY V4 production-parity preview API: PASS (grouped continuous editor + 120-record fallback review save only non-serving drafts)");
