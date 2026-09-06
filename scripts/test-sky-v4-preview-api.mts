import assert from "node:assert/strict";
import fs from "node:fs";
import { normalizeSkyV4PreviewInput } from "../api/admin/sky-v4-preview.ts";
import { normalizeSkyFallbackVariantPreviewInput } from "../api/admin/sky-fallback-variant-preview.ts";
import {
  selectSkyContinuousFallbackVariant,
  skyContinuousFallbackVariantFamilyStatus
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/skyContinuousFallbackVariants.mjs";

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

const variantFamily = {
  schema: "sky-continuous-fallback-variant-family/v1",
  contentKey: "sky-placement/article/sun/aries",
  familyVersion: "test-v1",
  selectionPolicy: "event-locked-v1",
  ownerApproved: false,
  servingEnabled: false,
  lanes: [
    {
      id: "lane-a",
      label: "Lane A",
      hooks: [{ id: "hook-a1", text: "Opening A1." }, { id: "hook-a2", text: "Opening A2." }],
      developments: [{ id: "development-a1", text: "Development A1." }],
      shadows: [{ id: "shadow-a1", text: "Shadow A1." }],
      closes: [{ id: "close-a1", text: "Close A1." }]
    },
    {
      id: "lane-b",
      label: "Lane B",
      hooks: [{ id: "hook-b1", text: "Opening B1." }],
      developments: [{ id: "development-b1", text: "Development B1." }],
      shadows: [{ id: "shadow-b1", text: "Shadow B1." }],
      closes: [{ id: "close-b1", text: "Close B1." }]
    }
  ]
};
const firstSelection = selectSkyContinuousFallbackVariant(variantFamily, {
  contentKey: "sky-placement/article/sun/aries",
  eventInstanceId: "sun:aries:2030-ingress"
});
const refreshedSelection = selectSkyContinuousFallbackVariant(structuredClone(variantFamily), {
  contentKey: "sky-placement/article/sun/aries",
  eventInstanceId: "sun:aries:2030-ingress"
});
assert.deepEqual(refreshedSelection, firstSelection, "The same astronomical event must never reroll on refresh or a later visit.");
assert.equal(firstSelection.selectionPolicy, "event-locked-v1");
assert.equal(firstSelection.eventInstanceId, "sun:aries:2030-ingress");
assert.match(firstSelection.selectionLockKey, /^test-v1\|sky-placement\/article\/sun\/aries\|sun:aries:2030-ingress$/u);
assert.equal(firstSelection.body.split("\n\n").length, 4, "A complete lane should render opening, development, shadow, and close.");
assert.throws(() => selectSkyContinuousFallbackVariant(variantFamily, {
  contentKey: "sky-placement/article/sun/aries"
}), /eventInstanceId is required/u);
const incompleteStatus = skyContinuousFallbackVariantFamilyStatus({
  ...variantFamily,
  lanes: [{ id: "incomplete", label: "Incomplete", hooks: [], developments: [], shadows: [], closes: [] }]
});
assert.equal(incompleteStatus.readyForPreview, false);
assert.throws(() => selectSkyContinuousFallbackVariant(incompleteStatus.family, {
  contentKey: "sky-placement/article/sun/aries",
  eventInstanceId: "sun:aries:2030-ingress"
}), /no complete fallback lane/u);

const normalizedVariantPreview = normalizeSkyFallbackVariantPreviewInput({
  contentKey: "sky-placement/article/sun/aries",
  eventInstanceId: "sun:aries:2030-ingress",
  family: variantFamily
});
assert.equal(normalizedVariantPreview.eventInstanceId, "sun:aries:2030-ingress");
assert.equal(normalizedVariantPreview.family.familyVersion, "test-v1");
assert.throws(() => normalizeSkyFallbackVariantPreviewInput({
  contentKey: "sky-placement/article/sun/aries",
  family: variantFamily
}), /event instance ID is required/u);

const endpoint = fs.readFileSync(new URL("../api/admin/sky-v4-preview.ts", import.meta.url), "utf8");
assert.match(endpoint, /isContentAdminAuthorized/u);
assert.match(endpoint, /renderSkyV4StudioPreview/u);
assert.match(endpoint, /sendAdminJson/u);
assert.doesNotMatch(endpoint, /res\.end\(/u);
const variantEndpoint = fs.readFileSync(new URL("../api/admin/sky-fallback-variant-preview.ts", import.meta.url), "utf8");
assert.match(variantEndpoint, /isContentAdminAuthorized/u);
assert.match(variantEndpoint, /renderSkyContinuousFallbackVariant/u);
assert.match(variantEndpoint, /servingEnabled:\s*false/u);
assert.match(variantEndpoint, /eventInstanceId/u);
const adminHttp = fs.readFileSync(new URL("../api/_lib/admin-http.ts", import.meta.url), "utf8");
assert.match(adminHttp, /res\.setHeader\("cache-control", "no-store"\)/u);

const dashboard = fs.readFileSync(new URL("../apps/admin/src/GeneratedContentAdminDashboard.tsx", import.meta.url), "utf8");
assert.match(dashboard, /lazy\(\(\) => import\("\.\/SkyV4StudioReviewPanel"\)\)/u);
const reviewPanel = fs.readFileSync(new URL("../apps/admin/src/SkyV4StudioReviewPanel.tsx", import.meta.url), "utf8");
assert.match(reviewPanel, /Render canonical preview/u);
assert.match(reviewPanel, /\/api\/admin\/sky-v4-preview/u);
assert.match(reviewPanel, /Stage preview · serving OFF/u);
assert.match(reviewPanel, /Governed provenance/u);
assert.match(reviewPanel, /SkyFallbackVariantFamilyEditor/u);
const variantEditor = fs.readFileSync(new URL("../apps/admin/src/SkyFallbackVariantFamilyEditor.tsx", import.meta.url), "utf8");
assert.match(variantEditor, /Evergreen fallback variant family/u);
assert.match(variantEditor, /event-locked/u);
assert.match(variantEditor, /skyFallbackVariantFamilyDraft/u);
assert.match(variantEditor, /\/api\/admin\/sky-fallback-variant-preview/u);
assert.match(variantEditor, /packageDraft:\s*rowEffectiveRecord\(row\)/u);
assert.doesNotMatch(variantEditor, /serving_enabled\s*:/u, "Variant-family draft saves must not mutate serving state.");

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

console.log("SKY V4 production-parity preview API: PASS (canonical preview unchanged; event-locked evergreen fallback families are non-serving draft sidecars)");
