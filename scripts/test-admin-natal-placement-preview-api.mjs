import assert from "node:assert/strict";
import { natalAspectCompleteDraft } from "../apps/admin/src/natalAspectSources.ts";
import {servingPackageRecords} from "../api/_lib/serving-package-records.ts";
import {natalCompleteEditorTemplate} from "./fixtures/natal-complete-editor-template.mjs";
import {
  default as handler,
  normalizeNatalPlacementPreviewInput,
  renderNatalPlacementPreview,
  renderNatalPlacementPreviewState,
  renderNatalAspectFriendDraft
} from "../api/admin/natal-placement-preview.ts";

const fallbackProvider = "tldrastro-fallback-architecture-v3";

const aspectSelection = { first: "sun", aspect: "conjunction", second: "mercury" };
const aspectRequest = { kind: "natal-aspect", planet: "sun", aspect: "conjunction", second: "mercury", overrides: [{
  id: "synthetic-editor-template", status: "LIVE", lane: "serving", provider: fallbackProvider,
  packageRow: natalCompleteEditorTemplate(servingPackageRecords.get("fallback-template/natal.aspect"))
}] };
const aspectInput = normalizeNatalPlacementPreviewInput(aspectRequest);
const aspectYou = renderNatalPlacementPreviewState(aspectInput).rendered;
assert.ok(aspectYou.body.startsWith("Your ideas feel like part of who you are"));
assert.ok(aspectYou.body.endsWith("Synthetic shared closing for your Sun and Mercury."));
const aspectFriend = renderNatalAspectFriendDraft(aspectInput);
assert.ok(aspectFriend.body.endsWith("Synthetic shared closing for {{Name}}'s Sun and Mercury."));
const completeDraft = natalAspectCompleteDraft(aspectSelection, aspectYou.body, aspectFriend.body);
assert.equal(completeDraft.body, aspectYou.body);
assert.equal(completeDraft.sections.packageRecord.body_you, aspectYou.body);
assert.equal(completeDraft.sections.packageRecord.body_they, aspectFriend.body);
assert.equal(completeDraft.sections.packageRecord.review_status, "needs_review");
assert.throws(() => natalAspectCompleteDraft(aspectSelection, aspectYou.body, ""), /complete You and Friend/u);
for (const invalid of [{ planet: "sun", second: "sun", aspect: "square" }, { planet: "fake", second: "moon", aspect: "trine" }, { planet: "sun", second: "mercury", aspect: "fake" }]) {
  assert.throws(() => normalizeNatalPlacementPreviewInput({ kind: "natal-aspect", ...invalid, overrides: [] }), /different natal bodies/u);
}

for (const [planet,sign,key] of [
  ['neptune','aquarius','fallback-hook/natal/planet-intro/neptune'],
  ['uranus','scorpio','fallback-hook/natal-you-placement-sign-final/uranus/scorpio']
]) for(const audience of ['you','they']){
  const input=normalizeNatalPlacementPreviewInput({planet,sign,house:'12',audience,overrides:[]});
  const baseline=renderNatalPlacementPreviewState(input).rendered;
  const timestamp='2026-11-12T12:00:00Z';
  const cached={id:'stale-source',status:'LIVE',lane:'serving',provider:fallbackProvider,updatedAt:timestamp,
    packageRow:{...servingPackageRecords.get(key),body:'Synthetic cached copy.',body_you:'Synthetic cached You copy.',body_they:'Synthetic cached Friend copy.',review_status:'approved'}};
  const withCached=normalizeNatalPlacementPreviewInput({planet,sign,house:'12',audience,overrides:[cached]});
  const reset={content_key:key,state:'live',revision:20,row_id:null,row_updated_at:null,updated_at:timestamp};
  const restored=renderNatalPlacementPreviewState(withCached,[reset]);
  assert.equal(JSON.stringify(restored.rendered.parts)===JSON.stringify(baseline.parts),true,'Baseline recovery must restore every original paragraph, excluding cached Studio copy.');
  assert.deepEqual(restored.appliedOverrideKeys,[]);
  assert.throws(()=>renderNatalPlacementPreviewState(withCached,[{...reset,state:'retired'}]),/SOURCE_GAP/u);
  assert.throws(()=>renderNatalPlacementPreviewState(withCached,[{...reset,row_id:cached.id,row_updated_at:'2026-11-13T12:00:00Z'}]),/SOURCE_GAP/u);
}

const signOnlyInput = normalizeNatalPlacementPreviewInput({
  audience: "you",
  overrides: [],
  planet: "sun",
  sign: "aries"
});
const signOnly = renderNatalPlacementPreview(signOnlyInput);
assert.equal(signOnly.headline, "Sun in Aries");
assert.equal(signOnly.parts.length, 1, "The API must return the planet-in-sign paragraph before a house is selected.");
assert.ok(signOnly.body.trim().length > 0, "The API must load its packaged fallback data and return reader copy.");

for (const audience of ["you", "they"]) {
  const houseOnly = renderNatalPlacementPreview(normalizeNatalPlacementPreviewInput({ planet: "mars", house: "12", audience, overrides: [] }));
  const combined = renderNatalPlacementPreview(normalizeNatalPlacementPreviewInput({ planet: "mars", sign: "aries", house: "12", audience, overrides: [] }));
  assert.equal(houseOnly.headline, "Mars in the 12th house");
  assert.deepEqual(houseOnly.parts, combined.parts.slice(1));
  assert.deepEqual(houseOnly.partKeys, combined.partKeys.slice(1));
}
for (const selection of [{ planet: "mars" }, { planet: "mars", sign: "invalid", house: "12" }, { planet: "mars", sign: 4, house: "12" }, { planet: "ascendant", house: "1" }]) {
  assert.throws(() => normalizeNatalPlacementPreviewInput({ ...selection, overrides: [] }), /valid planet or point/u);
}

const previousFetch = globalThis.fetch;
const previousEnvironment = Object.fromEntries(["CONTENT_GENERATION_SECRET", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].map(key => [key, process.env[key]]));
const houseKey = "fallback-hook/placement-house-lived/mars/12";
const timestamp = "2026-11-15T12:00:00Z";
const liveHouse = {
  id: "00000000-0000-4000-8000-000000000012", content_key: houseKey, status: "LIVE", lane: "serving", provider: fallbackProvider, updated_at: timestamp,
  sections: { packageRecord: { ...servingPackageRecords.get(houseKey), body: "Synthetic complete Mars house opening. Complete Mars house ending.", body_they_review_status: "approved", body_they_approval: { approvalLevel: "exact_owner_approved", recordPath: "synthetic-fixture" }, body_you: "Synthetic complete Mars house opening. Complete Mars house ending.", body_they: "Synthetic complete Friend house opening. Complete Friend house ending.", review_status: "approved" } }
};
let publicationState = "live";
let storageAvailable = true;
let storageCalls = 0;
try {
  process.env.CONTENT_GENERATION_SECRET = "natal-house-fixture";
  process.env.SUPABASE_URL = "https://natal-house.invalid";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "natal-house-fixture";
  globalThis.fetch = async input => {
    storageCalls++;
    const url = new URL(String(input));
    assert.equal(url.origin, "https://natal-house.invalid");
    if (!storageAvailable) return new Response("{}", { status: 503 });
    if (url.pathname === "/rest/v1/content_publications") {
      assert.ok(url.searchParams.get("content_key").includes(houseKey));
      assert.doesNotMatch(url.searchParams.get("content_key"), /placement-sign|complete-final|planet-in-sign|\/\//u);
      return Response.json([{ content_key: houseKey, state: publicationState, revision: 1, row_id: liveHouse.id, row_updated_at: timestamp, updated_at: timestamp }]);
    }
    assert.equal(url.pathname, "/rest/v1/generated_interpretations");
    return Response.json([liveHouse]);
  };
  const request = async (body, authorized = true) => {
    let payload;
    const res = { statusCode: 200, setHeader() {}, end(value) { payload = JSON.parse(value); } };
    await handler({ method: "POST", headers: authorized ? { "x-content-generation-secret": "natal-house-fixture" } : {}, body }, res);
    return { status: res.statusCode, payload };
  };
  const selection = { planet: "mars", house: "12", overrides: [] };
  const houseFetch = globalThis.fetch;
  globalThis.fetch = async input => {
    const url = new URL(String(input));
    assert.equal(url.pathname, "/rest/v1/content_publications");
    assert.ok(url.searchParams.get("content_key").includes("fallback-template/natal.aspect"));
    assert.ok(url.searchParams.get("content_key").includes("fallback-hook/aspect-pair/sun/mercury/conjunction"));
    return Response.json([]);
  };
  const aspectResponse = await request(aspectRequest);
  assert.equal(aspectResponse.status, 200, JSON.stringify(aspectResponse.payload));
  assert.equal(aspectResponse.payload.rendered.body, aspectYou.body);
  assert.equal(aspectResponse.payload.friend.body, aspectFriend.body);
  globalThis.fetch = async () => new Response("{}", { status: 503 });
  assert.equal((await request({ kind: "natal-aspect", planet: "sun", aspect: "conjunction", second: "mercury", overrides: [] })).status, 503);
  globalThis.fetch = houseFetch;
  for (const audience of ["you", "they"]) {
    const response = await request({ ...selection, audience });
    assert.equal(response.status, 200, JSON.stringify(response.payload));
    assert.equal(response.payload.rendered.headline, "Mars in the 12th house");
    assert.ok(response.payload.rendered.body.endsWith(audience === "you" ? liveHouse.sections.packageRecord.body_you : liveHouse.sections.packageRecord.body_they));
    assert.deepEqual(response.payload.appliedOverrideKeys, [houseKey]);
  }
  const beforeDenied = storageCalls;
  assert.equal((await request(selection, false)).status, 401);
  assert.equal((await request({ planet: "mars", overrides: [] })).status, 400);
  assert.equal(storageCalls, beforeDenied, "Invalid or unauthorized requests never reach storage.");
  publicationState = "retired";
  assert.equal((await request(selection)).status, 400, "Retired house sources remain blocked.");
  storageAvailable = false;
  assert.equal((await request(selection)).status, 503, "Unavailable publication state cannot serve an unverified house preview.");
} finally {
  globalThis.fetch = previousFetch;
  for (const [key, value] of Object.entries(previousEnvironment)) value === undefined ? delete process.env[key] : process.env[key] = value;
}

for (const ownerName of ["Robin", "Avery"]) {
  const input = normalizeNatalPlacementPreviewInput({ audience: "they", ownerName: ` ${ownerName} `, house: "", overrides: [], planet: "saturn", sign: "aries" });
  assert.equal(input.ownerName, ownerName);
  const rendered = renderNatalPlacementPreview(input);
  assert.equal(rendered.parts.length, 1, "All-houses scope never fabricates a house paragraph");
  assert.match(rendered.body, new RegExp(ownerName, "u"));
  assert.doesNotMatch(rendered.body, /Maya|\{\{/u);
}
for (const ownerName of [123, "x".repeat(101)]) assert.throws(() => normalizeNatalPlacementPreviewInput({ audience: "they", ownerName, overrides: [], planet: "saturn", sign: "aries" }), /preview name/u);
assert.equal(normalizeNatalPlacementPreviewInput({ audience: "they", overrides: [], planet: "saturn", sign: "aries" }).ownerName, "Maya");

const fullInput = normalizeNatalPlacementPreviewInput({
  audience: "you",
  house: "1",
  overrides: [],
  planet: "sun",
  sign: "aries"
});
const fullPlacement = renderNatalPlacementPreview(fullInput);
assert.equal(fullPlacement.headline, "Sun in Aries in the 1st house");
assert.equal(fullPlacement.parts.length, 2, "Selecting a house must add the house paragraph.");

const retrogradeInput = normalizeNatalPlacementPreviewInput({
  audience: "you",
  house: "6",
  motion: "retrograde",
  overrides: [],
  planet: "mercury",
  sign: "virgo"
});
assert.equal(retrogradeInput.motion, "retrograde");
const retrogradePlacement = renderNatalPlacementPreview(retrogradeInput);
assert.doesNotMatch(
  retrogradePlacement.body,
  /retrograde in the birth chart/u,
  "A missing planet-and-house modifier must not render the shared sentence."
);
assert.equal(retrogradePlacement.parts.length, 2, "The base sign and house paragraphs remain available without a published modifier.");

const jupiterLeoRetrograde = renderNatalPlacementPreview(normalizeNatalPlacementPreviewInput({
  audience: "you",
  house: "3",
  motion: "retrograde",
  overrides: [],
  planet: "jupiter",
  sign: "leo"
}));
assert.match(jupiterLeoRetrograde.body, /Jupiter is where you grow/u);
assert.match(jupiterLeoRetrograde.body, /Warmth spills out of you/u);
assert.match(jupiterLeoRetrograde.body, /Your Jupiter is in your 3rd house/u);
assert.doesNotMatch(jupiterLeoRetrograde.body, /Jupiter is retrograde in the birth chart/u);
assert.doesNotMatch(
  jupiterLeoRetrograde.body,
  /Leo wants people to see how much care went into the effort/u,
  "The production preview must not fall through to the generic Leo floor when the shipped Jupiter-specific composition is available."
);

const reviewedOnlyMarker = "REVIEWED STUDIO COPY MUST NOT REPLACE PRODUCTION";
const reviewedOnlyState = renderNatalPlacementPreviewState(normalizeNatalPlacementPreviewInput({
  audience: "you",
  house: "3",
  motion: "retrograde",
  overrides: [{
    id: "reviewed-only",
    lane: "serving",
    provider: fallbackProvider,
    status: "REVIEWED",
    updatedAt: "2026-09-02T04:00:00.000Z",
    packageRow: {
      contentKey: "fallback-hook/placement-sentence/jupiter/leo",
      content_role: "fallback_hook",
      grammar_frame: "complete_sentence",
      body_you: reviewedOnlyMarker,
      body_they: reviewedOnlyMarker,
      review_status: "approved"
    }
  }],
  planet: "jupiter",
  sign: "leo"
}));
assert.doesNotMatch(reviewedOnlyState.rendered.body, new RegExp(reviewedOnlyMarker, "u"));
assert.match(reviewedOnlyState.rendered.body, /Jupiter is where you grow/u);
assert.deepEqual(reviewedOnlyState.appliedOverrideKeys, []);
assert.deepEqual(reviewedOnlyState.ignoredOverrides, [{
  contentKey: "fallback-hook/placement-sentence/jupiter/leo",
  reason: "not-live"
}]);

const liveMarker = "LIVE STUDIO JUPITER LEO COPY";
const liveState = renderNatalPlacementPreviewState(normalizeNatalPlacementPreviewInput({
  audience: "you",
  house: "3",
  motion: "retrograde",
  overrides: [{
    id: "live-serving",
    lane: "serving",
    provider: fallbackProvider,
    status: "LIVE",
    updatedAt: "2026-09-02T04:01:00.000Z",
    packageRow: {
      contentKey: "fallback-hook/placement-sentence/jupiter/leo",
      content_role: "fallback_hook",
      grammar_frame: "complete_sentence",
      body_you: liveMarker,
      body_they: liveMarker,
      review_status: "approved"
    }
  }],
  planet: "jupiter",
  sign: "leo"
}));
assert.match(liveState.rendered.body, new RegExp(liveMarker, "u"));
assert.deepEqual(liveState.appliedOverrideKeys, ["fallback-hook/placement-sentence/jupiter/leo"]);
assert.deepEqual(liveState.ignoredOverrides, []);

const referenceLaneState = renderNatalPlacementPreviewState(normalizeNatalPlacementPreviewInput({
  audience: "you",
  overrides: [{
    id: "reference-only",
    lane: "reference",
    provider: fallbackProvider,
    status: "LIVE",
    updatedAt: "2026-09-02T04:02:00.000Z",
    packageRow: {
      contentKey: "fallback-hook/placement-sentence/jupiter/leo",
      content_role: "fallback_hook",
      grammar_frame: "complete_sentence",
      body_you: "REFERENCE LANE MUST NOT RENDER",
      body_they: "REFERENCE LANE MUST NOT RENDER",
      review_status: "approved"
    }
  }],
  planet: "jupiter",
  sign: "leo"
}));
assert.doesNotMatch(referenceLaneState.rendered.body, /REFERENCE LANE MUST NOT RENDER/u);
assert.match(referenceLaneState.rendered.body, /Jupiter is where you grow/u);
assert.deepEqual(referenceLaneState.ignoredOverrides, [{
  contentKey: "fallback-hook/placement-sentence/jupiter/leo",
  reason: "not-serving"
}]);

const staleKeyState = renderNatalPlacementPreviewState(normalizeNatalPlacementPreviewInput({
  audience: "you",
  overrides: [{
    id: "not-current-package-key",
    lane: "serving",
    provider: fallbackProvider,
    status: "LIVE",
    updatedAt: "2026-09-02T04:03:00.000Z",
    packageRow: {
      contentKey: "fallback-hook/natal-you-placement-complete-final/jupiter/leo/3/not-installed",
      content_role: "full_copy",
      body: "UNINSTALLED EXACT COPY MUST NOT RENDER",
      reader_only: true,
      render_policy: "reader-only-exact-lived-v1",
      review_status: "approved"
    }
  }],
  house: "3",
  motion: "retrograde",
  planet: "jupiter",
  sign: "leo"
}));
assert.doesNotMatch(staleKeyState.rendered.body, /UNINSTALLED EXACT COPY MUST NOT RENDER/u);
assert.match(staleKeyState.rendered.body, /Jupiter is where you grow/u);
assert.deepEqual(staleKeyState.ignoredOverrides, [{
  contentKey: "fallback-hook/natal-you-placement-complete-final/jupiter/leo/3/not-installed",
  reason: "not-current-package-key"
}]);

assert.equal(normalizeNatalPlacementPreviewInput({
  audience: "you",
  isRetrograde: true,
  overrides: [],
  planet: "venus",
  sign: "taurus"
}).motion, "retrograde");

assert.throws(
  () => normalizeNatalPlacementPreviewInput({ audience: "you", house: "13", overrides: [], planet: "sun", sign: "aries" }),
  /house must be between 1 and 12/u
);

const ascendantInput = normalizeNatalPlacementPreviewInput({
  audience: "you",
  overrides: [],
  planet: "ascendant",
  sign: "aries"
});
const ascendantPreview = renderNatalPlacementPreview(ascendantInput);
assert.match(ascendantPreview.headline, /Ascendant in Aries/u);
assert.ok(ascendantPreview.body.trim().length > 0, "Angle previews must assemble from the natal angle renderer.");
assert.doesNotMatch(ascendantPreview.body, /\{\{|\}\}/);

const icInput = normalizeNatalPlacementPreviewInput({
  audience: "you",
  overrides: [],
  planet: "imum-coeli",
  sign: "cancer"
});
const icPreview = renderNatalPlacementPreview(icInput);
assert.match(icPreview.headline, /\bIC in Cancer\b/u);

console.log("Natal placement preview matches the shipped reader projection, mirrors production hydration gates, and preserves Jupiter Leo retrograde parity.");
