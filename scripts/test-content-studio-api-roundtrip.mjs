#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import os from "node:os";
import { readFileSync } from "node:fs";
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
  stdin: { loader: "ts", resolveDir: process.cwd(), contents: `
    export * from "./apps/web/src/services/generatedContent.ts";
    export { installFallbackArchitectureV3Bundle, fallbackRendererV3, loadDeferredFallbackArchitectureV3Bundle, transitSynastryFallbackRendererV3 } from "./apps/web/src/content/fallbackArchitectureV3Runtime.ts";
  ` },
  format: "esm",
  logLevel: "silent",
  outfile: bundleFile,
  platform: "node"
});

const runtime = await import(
  `${pathToFileURL(bundleFile).href}?t=${Date.now()}`
);

const { loadLiveGeneratedContentForKeys } = runtime;
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
    if (!matchesFilter(url.searchParams, "updated_at", row.updated_at)) return Response.json([]);
    const patch = JSON.parse(String(init.body));
    assert.notEqual(patch.mode, "card", "The production mode constraint rejects the Studio card alias.");
    row = { ...row, ...patch };
    return Response.json([row]);
  }

  if (method === "DELETE") {
    if (!["id", "status", "updated_at"].every((key) => matchesFilter(url.searchParams, key, row[key]))) return Response.json([]);
    const removed = row;
    row = { id: "deleted", content_key: "deleted" };
    return Response.json([removed]);
  }

  if (method === "POST") {
    const created = JSON.parse(String(init.body));
    assert.notEqual(created.mode, "card", "The production mode constraint rejects the Studio card alias.");
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
      matchesFilter(url.searchParams, "mode", row.mode),
      matchesFilter(url.searchParams, "target_date", row.target_date),
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

// Exact source-bank candidate: draft/reopen/publication goes through the real
// handler and serving loader. The attachment's claims grant no approval.
const beforeBank = structuredClone(row);
const { suppliedSkySummaryCandidate, skySummaryCandidateReceipt } = await import("../apps/admin/src/skySummarySourceBank.ts");
const suppliedBank = JSON.parse(readFileSync("apps/admin/src/skySummarySourceBank.json", "utf8"));
for (const key of ["cms/sky-daily-summary/sun/aries", "cms/sky-daily-summary/moon/aries/newMoon"]) {
  const candidate = suppliedSkySummaryCandidate(key, suppliedBank);
  row = { ...beforeBank, content_key: key, sections: null, facts: {}, status: "DRAFT", lane: "serving", review_state: "EDITORIAL_REVIEW_REQUIRED",
    source_snapshot: { contentSystem: "cms-surface-override", contentType: "mustache-template", allowedSlots: [] } };
  const saved = await invokeApi("PATCH", "/api/admin/generated-content", {
    id: row.id, expectedUpdatedAt: row.updated_at, body: candidate.body, status: "DRAFT", lane: "serving", reviewState: "EDITORIAL_REVIEW_REQUIRED",
    sourceSnapshot: { ...row.source_snapshot, suppliedBank: skySummaryCandidateReceipt(key, candidate.body, suppliedBank) }
  });
  assert.equal(saved.status, 200, JSON.stringify(saved.payload));
  assert.equal((await loadLiveGeneratedContentForKeys([key])).size, 0);
  const reopened = await invokeApi("GET", `/api/admin/generated-content?contentKey=${encodeURIComponent(key)}&status=all`);
  assert.equal(reopened.payload.rows[0].body, candidate.body);
  const published = await invokeApi("PATCH", "/api/admin/generated-content", {
    id: row.id, expectedUpdatedAt: row.updated_at, status: "LIVE", lane: "serving", reviewState: null
  });
  assert.equal(published.status, 200, JSON.stringify(published.payload));
  assert.equal((await loadLiveGeneratedContentForKeys([key])).get(key)?.body, candidate.body);
  assert.equal(row.source_snapshot.suppliedBank.bodySha256, candidate.sha256);
}
row = beforeBank;

// An unsaved Studio summary starts with the legacy UI mode "card". Exercise
// creation as well as editing; patching a pre-existing fixture missed this.
const createdSummary = await invokeApi("POST", "/api/admin/generated-content", {
  contentKey: "cms/sky-daily-summary/sun/aries", surface: "sky", mode: "card",
  eventType: "sky-daily-summary", status: "DRAFT", lane: "serving",
  reviewState: "EDITORIAL_REVIEW_REQUIRED", body: suppliedBank.rows[0].body,
  sourceSnapshot: { contentSystem: "cms-surface-override", contentType: "mustache-template", allowedSlots: [] }
});
assert.equal(createdSummary.status, 200, JSON.stringify(createdSummary.payload));
assert.equal(createdSummary.payload.rows[0].mode, "feed");
const publishedSummary = await invokeApi("PATCH", "/api/admin/generated-content", {
  id: row.id, expectedUpdatedAt: row.updated_at, mode: "card", status: "LIVE", lane: "serving", reviewState: null
});
assert.equal(publishedSummary.status, 200, JSON.stringify(publishedSummary.payload));
assert.equal(publishedSummary.payload.rows[0].mode, "feed");
assert.equal((await loadLiveGeneratedContentForKeys([row.content_key])).get(row.content_key)?.body, suppliedBank.rows[0].body);
row = beforeBank;

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
      reader_only: true,
      render_policy: "reader-only-exact-lived-v1",
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


const chironBaseline = structuredClone(row);
const chironCopy = JSON.parse(readFileSync("docs/content-management/owner-copy/chiron-jupiter-hard-2026-09-07.json", "utf8"));
for (const field of ["body_you", "body_they"]) {
 assert.equal(createHash("sha256").update(chironCopy[field]).digest("hex"), chironCopy[field + "_sha256"]);
 assert.equal(chironCopy[field].trim().split(/\s+/u).length, chironCopy[field + "_word_count"]);
}
const transitSources = JSON.parse(readFileSync("apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json", "utf8"));
const chironOriginal = transitSources.authoredCards.find(record => record.contentKey === chironCopy.contentKey);
row = { ...row, id: "qa-chiron-real-package", content_key: chironCopy.contentKey,
 surface: "you", mode: "feed", headline: "", summary: "", body: chironOriginal.body_you,
 provider: "tldrastro-fallback-architecture-v3", status: "DRAFT", lane: "reference", review_state: "needs-review",
 sections: { packageRecord: structuredClone(chironOriginal), body_you: chironOriginal.body_you, body_they: chironOriginal.body_they },
 facts: { fallbackArchitectureV3: true }, source_snapshot: { sourcePackage: "tldrastro-fallback-architecture-v3" } };
for (let attempt = 0; attempt < 2; attempt++) {
 const nextYou = attempt === 0 ? chironOriginal.body_you : chironCopy.body_you;
 const savedChiron = await invokeApi("PATCH", "/api/admin/generated-content", {
  id: row.id, expectedUpdatedAt: row.updated_at, headline: row.headline, summary: row.summary, body: nextYou,
  sections: { ...row.sections, packageDraft: { ...row.sections.packageRecord, body_you: nextYou, body_they: chironCopy.body_they } },
  facts: row.facts, sourceSnapshot: row.source_snapshot, reviewStatus: "needs_review"
 });
 assert.equal(savedChiron.status, 200, JSON.stringify(savedChiron.payload));
 const publishedChiron = await invokeApi("PATCH", "/api/admin/generated-content", { id: row.id, ownerAction: "approve-package-revision" });
 assert.equal(publishedChiron.status, 200, JSON.stringify(publishedChiron.payload));
 assert.equal(row.sections.packageRecord.body_you, nextYou);
 assert.equal(row.sections.packageRecord.body_they, chironCopy.body_they);
}
await runtime.loadDeferredFallbackArchitectureV3Bundle();
const chironFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => String(input).includes("/rpc/content_runtime_revision") ? Response.json(row.updated_at) : chironFetch(input, init);
const chironBundle = await runtime.loadFallbackArchitectureV3DashboardBundle();
assert.ok(chironBundle?.transitLib.authoredCards.some(item => item.contentKey === chironCopy.contentKey));
runtime.installFallbackArchitectureV3Bundle(chironBundle);
for (const [voice, field] of [["you", "body_you"], ["Nikki", "body_they"]]) {
 const rendered = runtime.transitSynastryFallbackRendererV3.renderTransitAspect({ transiting: "chiron", natal: "jupiter", aspect: "square", voice, window: "Until September 30" });
 assert.equal(rendered.contentKey, chironCopy.contentKey);
 const expected = chironCopy[field].replaceAll("{{Name}}", "Nikki").replaceAll("{{aspectWord}}", "square").replaceAll("{{untilDate}}", "September 30");
 assert.equal(rendered.parts.join("\n\n"), expected);
}
globalThis.fetch = chironFetch;
runtime.installFallbackArchitectureV3Bundle(null);
row = chironBaseline;

const packageRegressionBaseline = structuredClone(row);
const placeholderTransitContentKey = "authored/transit-aspect/venus/moon/hard";
const placeholderOriginalBody = "The affection comes out as management. Venus {{aspectWord}} your Moon until {{untilDate}} stays high on feeling.";
const placeholderRevisedBody = "A partner may feel smothered instead of loved. Venus {{aspectWord}} your Moon until {{untilDate}} runs high on feeling and low on discussion.";
row = {
  ...row,
  id: "qa-transit-aspect-placeholder-package-revision",
  content_key: placeholderTransitContentKey,
  surface: "you",
  mode: "feed",
  status: "LIVE",
  lane: "serving",
  review_state: null,
  body: placeholderOriginalBody,
  provider: "tldrastro-fallback-architecture-v3",
  sections: {
    body_you: placeholderOriginalBody,
    packageRecord: {
      contentKey: placeholderTransitContentKey,
      content_role: "full_copy",
      body_you: placeholderOriginalBody,
      review_status: "approved"
    },
    packageDraft: {
      contentKey: placeholderTransitContentKey,
      content_role: "full_copy",
      body_you: placeholderRevisedBody,
      review_status: "approved"
    }
  },
  facts: { fallbackArchitectureV3: true, content_role: "full_copy", review_status: "approved" },
  source_snapshot: {
    sourcePackage: "tldrastro-fallback-architecture-v3",
    content_role: "full_copy",
    review_status: "approved"
  }
};
const savedPlaceholderTransitRevision = await invokeApi("PATCH", "/api/admin/generated-content", {
  id: row.id,
  headline: row.headline,
  summary: row.summary,
  body: placeholderRevisedBody,
  sections: row.sections,
  facts: row.facts,
  sourceSnapshot: row.source_snapshot,
  reviewStatus: "needs_review"
});
assert.equal(savedPlaceholderTransitRevision.status, 200, "A body_you-only transit row must accept its existing placeholders when saving a revision.");
assert.equal(savedPlaceholderTransitRevision.payload.rows[0].status, "DRAFT");
assert.equal(savedPlaceholderTransitRevision.payload.rows[0].lane, "reference");
assert.equal(savedPlaceholderTransitRevision.payload.rows[0].sections.packageDraft.body_you, placeholderRevisedBody);

const placeholderFriendBody = "{{Name}} may need to cool down before answering. Venus {{aspectWord}} their Moon until {{untilDate}} keeps the relationship tension visible.";
row = {
  ...packageRegressionBaseline,
  id: "qa-transit-aspect-placeholder-friend-revision",
  content_key: placeholderTransitContentKey,
  surface: "you",
  mode: "feed",
  status: "LIVE",
  lane: "serving",
  review_state: null,
  body: placeholderOriginalBody,
  provider: "tldrastro-fallback-architecture-v3",
  sections: {
    body_you: placeholderOriginalBody,
    body_they: null,
    packageRecord: {
      contentKey: placeholderTransitContentKey,
      content_role: "full_copy",
      body_you: placeholderOriginalBody,
      review_status: "approved"
    },
    packageDraft: {
      contentKey: placeholderTransitContentKey,
      content_role: "full_copy",
      body_you: placeholderOriginalBody,
      body_they: placeholderFriendBody,
      review_status: "approved"
    }
  },
  facts: { fallbackArchitectureV3: true, content_role: "full_copy", review_status: "approved" },
  source_snapshot: {
    sourcePackage: "tldrastro-fallback-architecture-v3",
    content_role: "full_copy",
    review_status: "approved"
  }
};
const savedPlaceholderTransitFriendRevision = await invokeApi("PATCH", "/api/admin/generated-content", {
  id: row.id,
  headline: row.headline,
  summary: row.summary,
  body: row.body,
  sections: row.sections,
  facts: row.facts,
  sourceSnapshot: row.source_snapshot,
  reviewStatus: "needs_review"
});
assert.equal(savedPlaceholderTransitFriendRevision.status, 200, "A blank transit body_they baseline must accept body_you transit placeholders plus {{Name}}.");
assert.equal(savedPlaceholderTransitFriendRevision.payload.rows[0].sections.packageDraft.body_they, placeholderFriendBody);

const publishedPlaceholderTransitFriendRevision = await invokeApi("PATCH", "/api/admin/generated-content", {
  id: row.id,
  ownerAction: "approve-package-revision"
});
assert.equal(publishedPlaceholderTransitFriendRevision.status, 200);
assert.equal(publishedPlaceholderTransitFriendRevision.payload.rows[0].sections.packageRecord.body_they, placeholderFriendBody);
assert.equal(publishedPlaceholderTransitFriendRevision.payload.rows[0].sections.body_they, placeholderFriendBody);

const secondPlaceholderFriendBody = "{{Name}} can answer more clearly after a pause. Venus {{aspectWord}} their Moon until {{untilDate}} still asks for a direct conversation.";
const savedSecondPlaceholderTransitFriendRevision = await invokeApi("PATCH", "/api/admin/generated-content", {
  id: row.id,
  headline: row.headline,
  summary: row.summary,
  body: row.body,
  sections: {
    ...row.sections,
    packageDraft: {
      ...row.sections.packageRecord,
      body_they: secondPlaceholderFriendBody
    }
  },
  facts: row.facts,
  sourceSnapshot: row.source_snapshot,
  reviewStatus: "needs_review"
});
assert.equal(savedSecondPlaceholderTransitFriendRevision.status, 200, "A published Friends transit must be editable again without reloading the package.");
assert.equal(savedSecondPlaceholderTransitFriendRevision.payload.rows[0].sections.packageDraft.body_they, secondPlaceholderFriendBody);
row = packageRegressionBaseline;

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

// Exact Calendar rows use capitalized Summary/Body fields. Exercise the same
// save/sign-off path as the Studio editor, including a second revision.
const beforeCalendar = row;
const exactRecord = {
  contentKey: "sky.aspect.mercury.sextile.mars", Headline: "Mercury Sextile Mars",
  Summary: "Original summary.", Body: "Original summary. Original ending.",
  content_role: "full_copy", review_status: "approved",
  render_policy: "content-studio-exact-sky-aspect-v1", studio_content_type: "aspect",
  studio_editable_fields: [{ path: "Summary" }, { path: "Body" }]
};
row = { ...row, content_key: exactRecord.contentKey, status: "LIVE", lane: "serving", review_state: null,
  event_type: "sky-aspect-owner-approved-exact", headline: exactRecord.Headline,
  summary: exactRecord.Summary, body: exactRecord.Body,
  sections: { packageRecord: exactRecord, packageOriginalRecord: structuredClone(exactRecord), body_you: exactRecord.Body, body_they: exactRecord.Body },
  facts: { fallbackArchitectureV3: true, content_role: "full_copy", review_status: "approved" },
  source_snapshot: { sourcePackage: "tldrastro-fallback-architecture-v3", contentStudioExactAspect: true, exactSkyAspectIdentity: { a: "mercury", aspect: "sextile", b: "mars" }, content_role: "full_copy", review_status: "approved" }
};
for (const revision of [1, 2]) {
  const summary = `Calendar QA summary ${revision}.`;
  const body = `${summary} Calendar QA final sentence ${revision}.`;
  const previousBody = row.body;
  const saved = await invokeApi("PATCH", "/api/admin/generated-content", {
    id: row.id, expectedUpdatedAt: row.updated_at,
    sections: { ...row.sections, packageDraft: { ...row.sections.packageRecord, Summary: summary, Body: body } },
    reviewStatus: "needs_review"
  });
  assert.equal(saved.status, 200);
  assert.equal(row.body, previousBody, "Saving a draft preserves the approved passage.");
  assert.equal(row.sections.packageDraft.Body, body);
  const published = await invokeApi("PATCH", "/api/admin/generated-content", {
    id: row.id, expectedUpdatedAt: row.updated_at, ownerAction: "approve-package-revision"
  });
  assert.equal(published.status, 200, JSON.stringify(published.payload));
  assert.equal(row.status, "LIVE");
  assert.equal(row.summary, summary, "Sign Off must publish the capitalized Summary field.");
  assert.equal(row.body, body, "Sign Off must publish the capitalized Body field.");
  assert.equal(row.sections.body_you, body);
  assert.equal(row.sections.body_they, body);
  assert.equal(row.sections.packageRecord.Body, body);
  assert.equal(row.sections.packageDraft, undefined);
  // This single-row store models the returned live target after revision
  // publication; the real target retains its original feed identity.
  row.mode = "feed";
}
// Lunar Calendar articles use their authored key and lowercase body field.
const moonRecord = JSON.parse(readFileSync(new URL("../apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json", import.meta.url))).authoredCards
  .find((item) => item.contentKey === "authored/calendar-weekly-moon/cancer/variant-2");
assert.ok(moonRecord);
row = {
  ...row, content_key: moonRecord.contentKey, body: moonRecord.body,
  event_type: "fallback-hook", mode: "in_depth", status: "LIVE", lane: "serving", review_state: null,
  sections: { packageRecord: structuredClone(moonRecord) },
  facts: { fallbackArchitectureV3: true, content_role: "full_copy", review_status: "approved_reuse" },
  source_snapshot: { sourcePackage: "tldrastro-fallback-architecture-v3", content_role: "full_copy", review_status: "approved_reuse" }
};
for (const revision of [1, 2]) {
  const original = row.body;
  const body = `${moonRecord.body}\nQA revision ${revision}.`;
  const saved = await invokeApi("PATCH", "/api/admin/generated-content", {
    id: row.id, expectedUpdatedAt: row.updated_at,
    sections: { ...row.sections, packageDraft: { ...row.sections.packageRecord, body } },
    reviewStatus: "needs_review"
  });
  assert.equal(saved.status, 200);
  assert.equal(row.body, original);
  assert.equal(row.sections.packageDraft.body, body);
  const published = await invokeApi("PATCH", "/api/admin/generated-content", {
    id: row.id, expectedUpdatedAt: row.updated_at, ownerAction: "approve-package-revision"
  });
  assert.equal(published.status, 200, JSON.stringify(published.payload));
  assert.equal(row.content_key, moonRecord.contentKey);
  assert.equal(row.body, body);
  assert.equal(row.sections.packageRecord.body, body);
  assert.equal(row.sections.packageDraft, undefined);
  const reader = await loadLiveGeneratedContentForKeys([moonRecord.contentKey]);
  assert.equal(reader.get(moonRecord.contentKey)?.body, body);
}
row = beforeCalendar;

console.log(JSON.stringify({
  adminReadBack: readBack.payload.rows[0].body,
  contentKey,
  draftHiddenFromReader: hiddenFromReader.size === 0,
  readerReadBack: readerContent.get(contentKey)?.body,
  status: "PASS",
  unauthorizedWriteBlocked: unauthorized.status === 401
}, null, 2));

// Repeat save, publish, edit, and save again with the real editor wire shape.
row = { ...packageRegressionBaseline, updated_at: row.updated_at,
  sections: { packageRecord: { ...packageRegressionBaseline.sections.packageRecord, headline: "Original title", summary: "Original purpose", editorial_notes: "Original notes" } } };
for (const [field, value] of [["body_you", "First revised copy."], ["summary", "Updated purpose"], ["headline", "Updated title"], ["editorial_notes", "Updated editor notes"], ["body_you", "Second revised copy."]]) {
  const result = await invokeApi("PATCH", "/api/admin/generated-content", {
    id: row.id, expectedUpdatedAt: row.updated_at,
    sections: { ...row.sections, packageDraft: { ...row.sections.packageRecord, [field]: value } },
    reviewStatus: "needs_review"
  });
  assert.equal(result.status, 200, `The editor must be able to save ${field}: ${JSON.stringify(result.payload)}`);
  assert.equal(result.payload.rows[0].sections.packageDraft[field], value);
  const published = await invokeApi("PATCH", "/api/admin/generated-content", {
    id: row.id, expectedUpdatedAt: row.updated_at, ownerAction: "approve-package-revision"
  });
  assert.equal(published.status, 200, JSON.stringify(published.payload));
  assert.equal(published.payload.rows[0].sections.packageRecord[field], value);
}
const stale = await invokeApi("PATCH", "/api/admin/generated-content", {
  id: row.id, expectedUpdatedAt: "2000-01-01T00:00:00.000Z", body: "Do not overwrite a newer edit."
});
assert.equal(stale.status, 409);
const readonly = await invokeApi("PATCH", "/api/admin/generated-content", {
  id: row.id, expectedUpdatedAt: row.updated_at,
  sections: { ...row.sections, packageDraft: { ...row.sections.packageRecord, content_role: "template" } }
});
assert.notEqual(readonly.status, 200, "Structural fields must remain protected.");
const selectedSources = await invokeApi("GET", "/api/admin/generated-content?status=all&contentKeys=fallback-hook%2Fplanet-best%2Furanus&contentKeys=fallback-hook%2Fnatal-you-placement-sign-final%2Furanus%2Fscorpio");
assert.equal(selectedSources.status, 200);
assert(selectedSources.payload.rows.some((source) => source.content_key === "fallback-hook/natal-you-placement-sign-final/uranus/scorpio"));
console.log("PASS: repeat-save metadata, publish, stale-write rejection, structure protection, and package source starters");

// Full lifecycle through the actual handler, including reopen and repeat save.
row = structuredClone(readBack.payload.rows[0]);
const liveDelete = await invokeApi("DELETE", `/api/admin/generated-content?id=${row.id}`);
assert.equal(liveDelete.status, 409);
for (const status of ["DRAFT", "REVIEWED", "LIVE", "ARCHIVED", "DRAFT"]) {
  const result = await invokeApi("PATCH", "/api/admin/generated-content", {
    id: row.id, expectedUpdatedAt: row.updated_at, status, lane: "serving", reviewState: null
  });
  assert.equal(result.status, 200, JSON.stringify(result.payload));
  assert.equal(row.status, status);
  const reopened = await invokeApi("GET", `/api/admin/generated-content?id=${row.id}&status=all&visibility=all`);
  assert.equal(reopened.payload.rows[0].status, status);
}
for (const body of ["QA edit after restore.", "QA second edit after restore."]) {
  const result = await invokeApi("PATCH", "/api/admin/generated-content", { id: row.id, expectedUpdatedAt: row.updated_at, body });
  assert.equal(result.status, 200);
  assert.equal(row.body, body);
}
const staleDelete = await invokeApi("DELETE", `/api/admin/generated-content?id=${row.id}&expectedUpdatedAt=2000-01-01`);
assert.equal(staleDelete.status, 409);
const deletedId = row.id;
const deleted = await invokeApi("DELETE", `/api/admin/generated-content?id=${row.id}&expectedUpdatedAt=${encodeURIComponent(row.updated_at)}`);
assert.equal(deleted.status, 200);
assert.equal((await invokeApi("GET", `/api/admin/generated-content?id=${deletedId}&status=all`)).payload.rows.length, 0);
assert.equal((await invokeApi("DELETE", `/api/admin/generated-content?id=${deletedId}`)).status, 404);
row = structuredClone(packageRegressionBaseline);
for (const action of ["archive", "restore"]) {
  const result = await invokeApi("PATCH", "/api/admin/generated-content", { id: row.id, expectedUpdatedAt: row.updated_at, sourceLifecycleAction: action });
  assert.equal(result.status, 200, JSON.stringify(result.payload));
  assert.equal(row.status, action === "archive" ? "ARCHIVED" : "DRAFT");
  assert.equal(row.sections.packageRecord.body_you, packageRegressionBaseline.sections.packageRecord.body_you);
}
console.log("PASS: read/reopen, draft/review/publish/archive/restore, repeat-save after restore, guarded hard delete, and package lifecycle");

// Starting another draft from the live row must not overwrite pending work.
row = { ...packageRegressionBaseline, status: "LIVE", mode: "feed", target_date: null,
  sections: { packageRecord: exactRecord }, content_key: exactRecord.contentKey };
const normalFetch = globalThis.fetch;
let revisionCreates = 0;
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  if (url.searchParams.get("mode") === "eq.studio-draft") {
    return Response.json([{ id: "other-editors-revision", status: "DRAFT", updated_at: row.updated_at }]);
  }
  if (init.method === "POST") revisionCreates += 1;
  return normalFetch(input, init);
};
const parallelRevision = await invokeApi("PATCH", "/api/admin/generated-content", {
  id: row.id, expectedUpdatedAt: row.updated_at,
  sections: { ...row.sections, packageDraft: { ...exactRecord, Body: "Conflicting new draft." } }, reviewStatus: "needs_review"
});
assert.equal(parallelRevision.status, 409, JSON.stringify(parallelRevision.payload));
assert.equal(revisionCreates, 0, "Existing pending copy must not be sent to an upsert.");
globalThis.fetch = normalFetch;
console.log("PASS: another editor's pending revision is preserved");
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  if (url.searchParams.get("mode") === "eq.studio-draft") return Response.json([]);
  if (init.method === "POST") {
    assert.match(init.headers.prefer, /resolution=ignore-duplicates/);
    return Response.json([]); // Another request inserted the revision after lookup.
  }
  return normalFetch(input, init);
};
const creationRace = await invokeApi("PATCH", "/api/admin/generated-content", {
  id: row.id, expectedUpdatedAt: row.updated_at,
  sections: { ...row.sections, packageDraft: { ...exactRecord, Body: "Concurrent first save." } }, reviewStatus: "needs_review"
});
assert.equal(creationRace.status, 409, JSON.stringify(creationRace.payload));
globalThis.fetch = normalFetch;
console.log("PASS: simultaneous first revision insert cannot replace another save");

const natalKey = "fallback-hook/natal-aspect-lived/lilith/square/ascendant";
row = { ...row, id: "qa-new-natal-aspect", content_key: natalKey, provider: "tldrastro-fallback-architecture-v3", status: "DRAFT", lane: "reference", review_state: "needs-review", mode: "in_depth", surface: "you", event_type: "fallback-hook", block_type: "fallback_hook", body: "QA natal aspect opening. QA natal aspect ending.", sections: { packageRecord: { contentKey: natalKey, content_role: "full_copy", grammar_frame: "complete_sentence", reader_only: true, render_policy: "reader-only-exact-lived-v1", review_status: "needs_review", body: "QA natal aspect opening. QA natal aspect ending.", body_they: "{{Name}} receives the QA natal aspect." } }, facts: { fallbackArchitectureV3: true, review_status: "needs_review" }, source_snapshot: { sourcePackage: "tldrastro-fallback-architecture-v3", review_status: "needs_review" } };
const pendingNatalRecord = structuredClone(row.sections.packageRecord);
row.sections.packageRecord.body = "";
row.sections.packageRecord.body_they = "";
const emptyNatal = await invokeApi("PATCH", "/api/admin/generated-content", { id: row.id, expectedUpdatedAt: row.updated_at, reviewStatus: "approved" });
assert.equal(emptyNatal.status, 400, "Empty natal drafts must not return a successful publication.");
assert.equal(row.status, "DRAFT");
row.sections.packageRecord = pendingNatalRecord;
const approvedNatal = await invokeApi("PATCH", "/api/admin/generated-content", { id: row.id, expectedUpdatedAt: row.updated_at, reviewStatus: "approved" });
assert.equal(approvedNatal.status, 200, JSON.stringify(approvedNatal.payload));
assert.equal(row.sections.packageRecord.approval.approvalLevel, "exact_owner_approved");
assert.match(row.sections.packageRecord.approval.payloadSha256, /^[a-f0-9]{64}$/);
globalThis.fetch = async (input, init) => String(input).includes("/rpc/content_runtime_revision") ? Response.json(row.updated_at) : normalFetch(input, init);
const natalBundle = await runtime.loadFallbackArchitectureV3DashboardBundle();
assert.equal(natalBundle?.rowsFile.hookRows.some((item) => item.contentKey === natalKey), true, "The actual reader loader must accept the newly published aspect.");
runtime.installFallbackArchitectureV3Bundle(natalBundle);
assert.equal(runtime.fallbackRendererV3.renderNatalAspect({ planetA: "lilith", aspect: "square", planetB: "ascendant", voice: "you" }).body, row.body, "The shipped reader must render the exact saved passage, including its ending.");
globalThis.fetch = normalFetch;
console.log("PASS: new natal aspect explicit approval receipt, actual reader loader, and shipped resolver render");

const { transitNatalExactSourceDraft } = await import('../apps/admin/src/transitNatalSources.ts');
for (const selection of [
  { planet: 'sun', natalPoint: 'south-node', aspect: 'opposition' },
  { planet: 'sun', natalPoint: 'sun', aspect: 'conjunction' },
  { planet: 'uranus', natalPoint: 'uranus', aspect: 'conjunction' }
]) {
  const draft = transitNatalExactSourceDraft(selection);
  const copy = `QA exact ${selection.planet} transit opening.\n\nQA exact ${selection.natalPoint} transit ending.`;
  const record = { ...draft.sections.packageRecord, body: copy, ...(!draft.contentKey.startsWith('authored/transit-return/') ? { body_you: copy, body_they: '{{Name}} receives a complete QA exact transit passage.' } : {}) };
  row = { ...row, id: `qa-transit-${selection.planet}-${selection.natalPoint}`, content_key: draft.contentKey, provider: 'tldrastro-fallback-architecture-v3', status: 'DRAFT', lane: 'reference', review_state: 'needs-review', mode: 'in_depth', surface: 'you', event_type: 'fallback-hook', block_type: 'fallback_hook', body: copy, sections: { packageRecord: record }, facts: { ...draft.facts, review_status: 'needs_review' }, source_snapshot: draft.sourceSnapshot };
  const approved = await invokeApi('PATCH', '/api/admin/generated-content', { id: row.id, expectedUpdatedAt: row.updated_at, reviewStatus: 'approved' });
  assert.equal(approved.status, 200, JSON.stringify(approved.payload));
  globalThis.fetch = async (input, init) => String(input).includes('/rpc/content_runtime_revision') ? Response.json(row.updated_at) : normalFetch(input, init);
  const bundle = await runtime.loadFallbackArchitectureV3DashboardBundle();
  assert.ok(bundle?.transitLib.authoredCards.some(item => item.contentKey === draft.contentKey), `New exact source reaches real reader loader: ${draft.contentKey}`);
  runtime.installFallbackArchitectureV3Bundle(bundle);
  const rendered = draft.contentKey.startsWith('authored/transit-return/')
    ? runtime.transitSynastryFallbackRendererV3.renderTransitReturn({ planet: selection.planet })
    : runtime.transitSynastryFallbackRendererV3.renderTransitAspect({ transiting: selection.planet, natal: selection.natalPoint, aspect: selection.aspect, voice: 'you', sign: 'virgo' });
  assert.equal(rendered.body, copy);
  globalThis.fetch = normalFetch;
}
console.log('PASS: new exact transit and return publication through actual API, reader loader, and shipped resolver.');

// New canonical families must publish through the same admission used by readers.
const admissionCases = [
 ['house-intro', 'authored/transit-house-intro/moon/1'],
 ['house-sign', 'authored/transit-house-sign/moon/1/aries'],
 ['synastry-exact', 'fallback-hook/synastry-pair/sun/venus/square']
];
const houseRecords = [];
for (const [label,key] of admissionCases) {
 const copy = `QA ${label} opening.\n\nQA ${label} ending.`;
 const reverseCopy = `QA reverse ${label} opening.\n\nQA reverse ${label} ending.`;
 row = { ...row, id: 'qa-'+label, content_key:key, provider:'tldrastro-fallback-architecture-v3', status:'DRAFT', lane:'reference', review_state:'needs-review', mode:'in_depth', surface:label==='synastry-exact'?'synastry':'you', event_type:'fallback-hook', block_type:'fallback_hook', body:copy, sections:{packageRecord:{contentKey:key,content_role:'full_copy',grammar_frame:'complete_sentence',body:copy,body_you:copy,body_they:reverseCopy,review_status:'needs_review'}},facts:{fallbackArchitectureV3:true,review_status:'needs_review'},source_snapshot:{sourcePackage:'tldrastro-fallback-architecture-v3',contentType:'authored-content',content_role:'full_copy',review_status:'needs_review'} };
 const pending = structuredClone(row);
 if (label==='synastry-exact') {
   row.sections.packageRecord.body_they='';
   const incomplete=structuredClone(row);
   const refused=await invokeApi('PATCH','/api/admin/generated-content',{id:row.id,expectedUpdatedAt:row.updated_at,reviewStatus:'approved'});
   assert.equal(refused.status,400,JSON.stringify(refused.payload));
   assert.deepEqual(row,incomplete,'An incomplete direction remains an unsigned draft.');
   row=structuredClone(pending);
 }
 const approved=await invokeApi('PATCH','/api/admin/generated-content',{id:row.id,expectedUpdatedAt:row.updated_at,reviewStatus:'approved'});
 assert.equal(approved.status,200,JSON.stringify(approved.payload));
 globalThis.fetch=async(input,init)=>String(input).includes('/rpc/content_runtime_revision')?Response.json(row.updated_at):normalFetch(input,init);
 const bundle=await runtime.loadFallbackArchitectureV3DashboardBundle();
 assert.ok([...(bundle?.transitLib?.authoredCards??[]),...(bundle?.rowsFile?.hookRows??[])].some(r=>r.contentKey===key),key);
 runtime.installFallbackArchitectureV3Bundle(bundle);
 if (label.startsWith('house')) houseRecords.push(...bundle.transitLib.authoredCards);
 else {
   for (const [a,b,expected] of [['sun','venus',copy],['venus','sun',reverseCopy]]) {
     const rendered=runtime.transitSynastryFallbackRendererV3.renderSynastryAspect({planetA:a,planetB:b,aspect:'square',otherName:'QA Friend'});
     assert.equal(bundle.rowsFile.hookRows.find(r=>r.contentKey===key)[a==='sun'?'body_you':'body_they'],expected,'Publication retains every source byte.');
     assert.equal(rendered.body,expected.replace(/\s+/gu,' '),'The token renderer retains the complete passage.');
     assert.equal(rendered.contentKey,key);
     assert.equal(rendered.synastryTier,'exact-owner-approved');
   }
 }
 globalThis.fetch=normalFetch;
 // Rejected publications must not change the saved draft or any storage row.
 row={...pending,content_key:'authored/unsupported/qa-source',sections:{packageRecord:{...pending.sections.packageRecord,contentKey:'authored/unsupported/qa-source'}}};
 const before=structuredClone(row);
 const refused=await invokeApi('PATCH','/api/admin/generated-content',{id:row.id,expectedUpdatedAt:row.updated_at,reviewStatus:'approved'});
 assert.equal(refused.status,409,JSON.stringify(refused.payload));
 assert.match(refused.payload.error,/supported reader route/);
 assert.deepEqual(row,before);
 row.sections.packageDraft={...row.sections.packageRecord,body:'QA unsupported revision opening. QA unsupported revision ending.'};
 const beforeRevision=structuredClone(row);
 const refusedRevision=await invokeApi('PATCH','/api/admin/generated-content',{id:row.id,expectedUpdatedAt:row.updated_at,ownerAction:'approve-package-revision'});
 assert.equal(refusedRevision.status,409,JSON.stringify(refusedRevision.payload));
 assert.match(refusedRevision.payload.error,/supported reader route/);
 assert.deepEqual(row,beforeRevision,'A refused revision must remain available without a timestamp claim or publication write.');
}
runtime.installFallbackArchitectureV3Bundle({transitLib:{authoredCards:houseRecords},rowsFile:{hookRows:[],vocabularyRows:[]},templatesFile:{templates:[]}});
for (const voice of ['you','QA Friend']) {
 const rendered=runtime.transitSynastryFallbackRendererV3.renderTransitHouse({planet:'moon',house:1,sign:'aries',voice});
 assert.equal(rendered.body,houseRecords.map(r=>voice==='you'?r.body_you:r.body_they).join('\n\n'));
 assert.deepEqual(rendered.sourceKeys,houseRecords.map(r=>r.contentKey));
}
// Create and batch validation refuse unsupported package keys before writes.
const unsupportedWrite={contentKey:'fallback-hook/unsupported/qa-new',surface:'you',mode:'in_depth',eventType:'fallback-hook',reviewStatus:'approved',provider:'tldrastro-fallback-architecture-v3',sections:{packageRecord:{contentKey:'fallback-hook/unsupported/qa-new',content_role:'full_copy',review_status:'approved',body:'QA full passage.'}},sourceSnapshot:{sourcePackage:'tldrastro-fallback-architecture-v3',review_status:'approved'}};
let before=structuredClone(row);
assert.equal((await invokeApi('POST','/api/admin/generated-content',unsupportedWrite)).status,409);
assert.deepEqual(row,before);
const batch=await invokeApi('POST','/api/admin/generated-content',{rows:[{...unsupportedWrite,surface:'sky',status:'LIVE',lane:'serving',reviewState:null}]});
assert.equal(batch.status,409,JSON.stringify(batch.payload));
assert.deepEqual(row,before);
console.log('PASS: new House Transit and exact synastry publication, shipped full-copy/direction selection, and unsupported-key refusal.');
