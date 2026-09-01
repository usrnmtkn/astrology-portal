#!/usr/bin/env node
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

process.env.NODE_ENV = "test";
process.env.CONTENT_GENERATION_SECRET = "content-studio-api-test-secret";
process.env.SUPABASE_URL = "https://content-studio-api-test.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "content-studio-api-test-service-role";

const { default: generatedContentHandler } = await import("../api/admin/generated-content.ts");

// The endpoint loads local development configuration during import. Reassert
// the isolated credentials so a developer's environment cannot change this
// test's authorization or database boundary.
process.env.CONTENT_GENERATION_SECRET = "content-studio-api-test-secret";
process.env.SUPABASE_URL = "https://content-studio-api-test.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "content-studio-api-test-service-role";

const bundleFile = path.join(os.tmpdir(), "tldrastro-content-studio-reader-api.bundle.mjs");

await build({
  bundle: true,
  define: {
    "import.meta.env": JSON.stringify({
      VITE_SUPABASE_URL: "https://content-studio-api-test.invalid",
      VITE_SUPABASE_PUBLISHABLE_KEY: "content-studio-api-test-publishable-key"
    })
  },
  entryPoints: [path.resolve("apps/web/src/services/generatedContent.ts")],
  format: "esm",
  logLevel: "silent",
  outfile: bundleFile,
  platform: "node"
});

const { loadLiveGeneratedContentForKeys } = await import(
  `${pathToFileURL(bundleFile).href}?t=${Date.now()}`
);

const contentKey = "cms/qa/content-studio-api-roundtrip";
const rowId = "content-studio-api-roundtrip-row";
let row = {
  id: rowId,
  content_key: contentKey,
  surface: "sky",
  mode: "feed",
  status: "LIVE",
  lane: "serving",
  review_state: null,
  event_type: "cms-surface-override",
  target_date: null,
  facts: {},
  knowledge_ids: [],
  source_snapshot: {
    allowedSlots: [],
    contentSystem: "cms-surface-override"
  },
  headline: "Original API headline",
  summary: "Original API summary",
  body: "Original API body.",
  sections: [],
  block_type: "essay",
  flags: [],
  provider: "manual-admin",
  prompt_version: "manual-admin",
  model: "manual",
  reviewer_notes: "",
  evergreen: false,
  evergreen_at: null,
  evergreen_by: null,
  judge_score: null,
  judge_verdict: null,
  judge_gate: null,
  judge_why: null,
  reviewed_at: "2026-08-29T12:00:00.000Z",
  published_at: "2026-08-29T12:00:00.000Z",
  updated_at: "2026-08-29T12:00:00.000Z",
  created_at: "2026-08-29T12:00:00.000Z"
};

const requests = [];
const compatibilitySupportRows = [
  {
    ...row,
    id: "compatibility-reference-vocabulary",
    content_key: "vocab/relationship/repair",
    lane: "reference",
    status: "DRAFT",
    block_type: "vocabulary_phrase"
  },
  {
    ...row,
    id: "compatibility-reference-template",
    content_key: "slot-template/compatibility/planet-card",
    lane: "reference",
    status: "REVIEWED",
    block_type: "template"
  }
];

function matchesFilter(params, name, value) {
  const filter = params.get(name);
  if (!filter) return true;
  if (filter === "is.null") return value === null || value === undefined;
  if (filter.startsWith("eq.")) return String(value ?? "") === filter.slice(3);
  if (filter.startsWith("neq.")) return String(value ?? "") !== filter.slice(4);
  if (filter.startsWith("in.(") && filter.endsWith(")")) {
    const values = filter
      .slice(4, -1)
      .split(",")
      .map((item) => decodeURIComponent(item.replace(/^"|"$/gu, "")));
    return values.includes(String(value ?? ""));
  }
  throw new Error(`Unhandled test filter ${name}=${filter}`);
}

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  const method = init.method ?? "GET";
  requests.push({ method, url: url.toString() });

  assert.equal(url.origin, "https://content-studio-api-test.invalid");
  assert.equal(url.pathname, "/rest/v1/generated_interpretations");

  if (method === "PATCH") {
    assert.equal(url.searchParams.get("id"), `eq.${row.id}`);
    const patch = JSON.parse(String(init.body));
    row = { ...row, ...patch };
    return Response.json([row]);
  }

  if (method === "POST") {
    const created = JSON.parse(String(init.body));
    row = {
      id: "content-studio-created-row",
      target_date: null,
      updated_at: "2026-09-01T04:00:00.000Z",
      created_at: "2026-09-01T04:00:00.000Z",
      ...created
    };
    return Response.json([row]);
  }

  if (method === "GET") {
    if (url.searchParams.has("or") && !url.searchParams.has("lane")) {
      return Response.json(compatibilitySupportRows);
    }
    const matches = [
      matchesFilter(url.searchParams, "id", row.id),
      matchesFilter(url.searchParams, "content_key", row.content_key),
      matchesFilter(url.searchParams, "status", row.status),
      matchesFilter(url.searchParams, "lane", row.lane),
      matchesFilter(url.searchParams, "review_state", row.review_state)
    ].every(Boolean);
    return Response.json(matches ? [row] : []);
  }

  throw new Error(`Unexpected Supabase test request: ${method} ${url}`);
};

function apiRequest(method, url, body, secret = "content-studio-api-test-secret") {
  const req = body === undefined
    ? Readable.from([])
    : Readable.from([JSON.stringify(body)]);
  req.method = method;
  req.url = url;
  req.headers = { authorization: `Bearer ${secret}` };
  return req;
}

function responseResult() {
  let resolve;
  const completed = new Promise((done) => { resolve = done; });
  const res = {
    headers: {},
    statusCode: 0,
    setHeader(name, value) { this.headers[name] = value; },
    end(value) {
      resolve({
        payload: value ? JSON.parse(value) : null,
        status: this.statusCode
      });
    }
  };
  return { completed, res };
}

async function invokeApi(method, url, body, secret) {
  const { completed, res } = responseResult();
  await generatedContentHandler(apiRequest(method, url, body, secret), res);
  return completed;
}

const unauthorized = await invokeApi(
  "PATCH",
  "/api/admin/generated-content",
  { id: rowId, body: "This edit must not persist." },
  "wrong-secret"
);
assert.equal(unauthorized.status, 401);
assert.equal(row.body, "Original API body.");

const editedCopy = {
  headline: "Edited through Content Studio",
  summary: "This summary was saved through the admin API.",
  body: "This reader-facing passage was saved through the Content Studio API."
};
const saved = await invokeApi("PATCH", "/api/admin/generated-content", {
  id: rowId,
  ...editedCopy
});

assert.equal(saved.status, 200);
assert.equal(saved.payload.ok, true);
assert.equal(saved.payload.rows[0].headline, editedCopy.headline);
assert.equal(saved.payload.rows[0].summary, editedCopy.summary);
assert.equal(saved.payload.rows[0].body, editedCopy.body);

const readBack = await invokeApi(
  "GET",
  `/api/admin/generated-content?status=all&contentKey=${encodeURIComponent(contentKey)}&limit=1`
);
assert.equal(readBack.status, 200);
assert.equal(readBack.payload.rows.length, 1);
assert.equal(readBack.payload.rows[0].body, editedCopy.body);

const compatibilityInventory = await invokeApi(
  "GET",
  "/api/admin/generated-content?status=all&visibility=all&scope=compatibility&limit=2"
);
assert.equal(compatibilityInventory.status, 200);
assert.equal(compatibilityInventory.payload.nextCursor, "compatibility-reference-template");
await invokeApi(
  "GET",
  `/api/admin/generated-content?status=all&visibility=all&scope=compatibility&limit=2&cursor=${encodeURIComponent(compatibilityInventory.payload.nextCursor)}`
);
const compatibilityRequest = requests
  .filter(({ method }) => method === "GET")
  .map(({ url }) => new URL(url))
  .find((url) => url.searchParams.get("limit") === "2" && url.searchParams.has("or") && !url.searchParams.has("id"));
assert.ok(compatibilityRequest, "Compatibility must use a server-scoped inventory query.");
assert.equal(compatibilityRequest.searchParams.has("lane"), false, "Compatibility inventory must include reference-lane support rows.");
assert.deepEqual(
  compatibilityInventory.payload.rows.map(({ id }) => id),
  ["compatibility-reference-vocabulary", "compatibility-reference-template"],
  "Reference-lane Compatibility support rows must remain discoverable through the API."
);
const compatibilityCursorRequest = requests
  .filter(({ method }) => method === "GET")
  .map(({ url }) => new URL(url))
  .find((url) => url.searchParams.get("id") === "gt.compatibility-reference-template");
assert.ok(compatibilityCursorRequest, "Compatibility pagination must continue from the stable server cursor.");

const readerContent = await loadLiveGeneratedContentForKeys([contentKey]);
assert.ok(readerContent.has(contentKey));
assert.equal(readerContent.get(contentKey)?.headline, editedCopy.headline);
assert.equal(readerContent.get(contentKey)?.summary, editedCopy.summary);
assert.equal(readerContent.get(contentKey)?.body, editedCopy.body);

const demoted = await invokeApi("PATCH", "/api/admin/generated-content", {
  id: rowId,
  status: "DRAFT"
});
assert.equal(demoted.status, 200);
assert.equal(demoted.payload.rows[0].status, "DRAFT");

const hiddenFromReader = await loadLiveGeneratedContentForKeys([contentKey]);
assert.equal(hiddenFromReader.size, 0, "Draft Content Studio rows must not reach the reader API.");

const natalAspectContentKey = "fallback-hook/natal-aspect-lived/lilith/square/ascendant";
const createdApprovedNatalAspect = await invokeApi("POST", "/api/admin/generated-content", {
  contentKey: natalAspectContentKey,
  surface: "you",
  mode: "in_depth",
  eventType: "fallback-hook",
  blockType: "fallback_hook",
  headline: "Lilith Square Ascendant",
  summary: "Exact natal aspect writing for the reader's birth chart.",
  body: "Exact reader copy.",
  reviewStatus: "approved",
  sections: {
    packageRecord: {
      contentKey: natalAspectContentKey,
      content_role: "full_copy",
      body_you: "Exact reader copy.",
      body_they: "{Name} receives exact friend-view copy.",
      review_status: "approved"
    }
  },
  facts: { fallbackArchitectureV3: true },
  sourceSnapshot: {
    sourcePackage: "tldrastro-fallback-architecture-v3",
    review_status: "approved"
  }
});
assert.equal(createdApprovedNatalAspect.status, 200);
assert.equal(createdApprovedNatalAspect.payload.rows[0].status, "LIVE", "A newly approved package row must publish on its first save.");
assert.equal(createdApprovedNatalAspect.payload.rows[0].lane, "serving");
assert.equal(createdApprovedNatalAspect.payload.rows[0].review_state, null);
assert.equal(createdApprovedNatalAspect.payload.rows[0].provider, "tldrastro-fallback-architecture-v3");
assert.equal(createdApprovedNatalAspect.payload.rows[0].facts.review_status, "approved");
assert.equal(createdApprovedNatalAspect.payload.rows[0].source_snapshot.review_status, "approved");
assert.equal(createdApprovedNatalAspect.payload.rows[0].sections.packageRecord.review_status, "approved");
assert.equal(createdApprovedNatalAspect.payload.rows[0].sections.packageRecord.body_they, "{{Name}} receives exact friend-view copy.");
assert.equal(createdApprovedNatalAspect.payload.rows[0].sections.body_they, "{{Name}} receives exact friend-view copy.");

row = {
  ...row,
  status: "DRAFT",
  lane: "reference",
  review_state: "needs-review",
  sections: {
    ...row.sections,
    body_they: "{Name} receives older saved friend-view copy.",
    packageRecord: {
      ...row.sections.packageRecord,
      body_they: "{Name} receives older saved friend-view copy.",
      review_status: "approved"
    }
  }
};
const recoveredApprovedNatalAspect = await invokeApi("PATCH", "/api/admin/generated-content", {
  id: row.id,
  headline: row.headline,
  summary: row.summary,
  body: row.body,
  sections: row.sections,
  facts: row.facts,
  sourceSnapshot: row.source_snapshot,
  reviewStatus: "approved"
});
assert.equal(recoveredApprovedNatalAspect.status, 200);
assert.equal(recoveredApprovedNatalAspect.payload.rows[0].status, "LIVE", "An approved package row stuck in Draft must recover on Save & publish.");
assert.equal(recoveredApprovedNatalAspect.payload.rows[0].sections.packageRecord.body_they, "{{Name}} receives older saved friend-view copy.");

const installedPackageRecord = {
  ...row.sections.packageRecord,
  studio_editable_fields: [
    { path: "body_you" },
    { path: "body_they" },
    { path: "era_layer.frame" }
  ],
  era_layer: { frame: "Original nested package copy." }
};
const proposedPackageRecord = structuredClone(installedPackageRecord);
proposedPackageRecord.body_you = "Revised exact reader copy saved from Content Studio.";
proposedPackageRecord.body_they = "{{Name}} receives revised exact friend-view copy.";
proposedPackageRecord.era_layer.frame = "Revised nested package copy.";
row = {
  ...row,
  status: "LIVE",
  lane: "serving",
  review_state: null,
  body: installedPackageRecord.body_you,
  sections: {
    ...row.sections,
    body_you: installedPackageRecord.body_you,
    body_they: installedPackageRecord.body_they,
    packageRecord: installedPackageRecord,
    packageOriginalRecord: structuredClone(installedPackageRecord),
    packageDraft: proposedPackageRecord
  },
  facts: { ...row.facts, review_status: "approved" },
  source_snapshot: { ...row.source_snapshot, review_status: "approved" }
};

const savedPackageRevision = await invokeApi("PATCH", "/api/admin/generated-content", {
  id: row.id,
  headline: row.headline,
  summary: row.summary,
  body: row.body,
  sections: row.sections,
  facts: row.facts,
  sourceSnapshot: row.source_snapshot,
  reviewStatus: "approved"
});
assert.equal(savedPackageRevision.status, 200);
assert.equal(savedPackageRevision.payload.rows[0].status, "DRAFT", "Saving revised package copy must hold it for explicit approval.");
assert.equal(savedPackageRevision.payload.rows[0].lane, "reference");
assert.equal(savedPackageRevision.payload.rows[0].review_state, "needs-review");
assert.equal(savedPackageRevision.payload.rows[0].facts.review_status, "needs_review");
assert.equal(savedPackageRevision.payload.rows[0].sections.packageRecord.body_you, installedPackageRecord.body_you, "A normal Save must not silently replace the installed reader copy.");
assert.equal(savedPackageRevision.payload.rows[0].sections.packageDraft.body_you, proposedPackageRecord.body_you);

const publishedPackageRevision = await invokeApi("PATCH", "/api/admin/generated-content", {
  id: row.id,
  ownerAction: "approve-package-revision"
});
assert.equal(publishedPackageRevision.status, 200);
assert.equal(publishedPackageRevision.payload.rows[0].status, "LIVE", "Approve & publish revision must make the saved package revision reader-eligible.");
assert.equal(publishedPackageRevision.payload.rows[0].lane, "serving");
assert.equal(publishedPackageRevision.payload.rows[0].review_state, null);
assert.equal(publishedPackageRevision.payload.rows[0].facts.review_status, "approved");
assert.equal(publishedPackageRevision.payload.rows[0].source_snapshot.review_status, "approved");
assert.equal(publishedPackageRevision.payload.rows[0].sections.packageDraft, undefined);
assert.equal(publishedPackageRevision.payload.rows[0].sections.packageRecord.body_you, proposedPackageRecord.body_you);
assert.equal(publishedPackageRevision.payload.rows[0].sections.packageRecord.body_they, proposedPackageRecord.body_they);
assert.equal(publishedPackageRevision.payload.rows[0].sections.packageRecord.era_layer.frame, proposedPackageRecord.era_layer.frame, "Nested studio-editable fields must publish with the rest of the revision.");
assert.equal(publishedPackageRevision.payload.rows[0].body, proposedPackageRecord.body_you, "The reader-facing mirror must update with the approved package revision.");

const sourceMaterialRecord = {
  ...publishedPackageRevision.payload.rows[0].sections.packageRecord,
  content_role: "source_material",
  review_status: "approved"
};
row = {
  ...publishedPackageRevision.payload.rows[0],
  sections: {
    ...publishedPackageRevision.payload.rows[0].sections,
    packageRecord: sourceMaterialRecord,
    packageDraft: {
      ...sourceMaterialRecord,
      body_you: "Revised source ingredient that must never become exact reader copy."
    }
  },
  source_snapshot: {
    ...publishedPackageRevision.payload.rows[0].source_snapshot,
    content_role: "source_material",
    review_status: "approved"
  }
};
const savedSourceMaterial = await invokeApi("PATCH", "/api/admin/generated-content", {
  id: row.id,
  sections: row.sections,
  facts: row.facts,
  sourceSnapshot: row.source_snapshot,
  reviewStatus: "approved"
});
assert.equal(savedSourceMaterial.status, 200);
assert.equal(savedSourceMaterial.payload.rows[0].status, "DRAFT", "Approved source material must remain outside the reader-serving lane.");
assert.equal(savedSourceMaterial.payload.rows[0].lane, "reference");
assert.equal(savedSourceMaterial.payload.rows[0].review_state, "needs-review");
const rejectedSourceMaterialPublish = await invokeApi("PATCH", "/api/admin/generated-content", {
  id: row.id,
  ownerAction: "approve-package-revision"
});
assert.equal(rejectedSourceMaterialPublish.status, 400, "Source ingredients must reject exact-copy publishing actions.");

assert.ok(
  requests.some(({ method, url }) => method === "PATCH" && url.includes(`id=eq.${rowId}`)),
  "The Content Studio endpoint must persist edits through Supabase REST."
);
assert.ok(
  requests.some(({ method, url }) => (
    method === "GET"
    && url.includes("status=eq.LIVE")
    && url.includes("lane=eq.serving")
    && url.includes("review_state=is.null")
  )),
  "The reader must reload saved copy through the serving-only API query."
);

console.log(JSON.stringify({
  adminReadBack: readBack.payload.rows[0].body,
  contentKey,
  draftHiddenFromReader: hiddenFromReader.size === 0,
  readerReadBack: readerContent.get(contentKey)?.body,
  status: "PASS",
  unauthorizedWriteBlocked: unauthorized.status === 401
}, null, 2));
