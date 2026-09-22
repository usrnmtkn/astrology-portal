import { publicationRpcFixture } from "../tests/helpers/studio-publication-rpc.mjs";
import assert from "node:assert/strict";
import { Readable } from "node:stream";

process.env.NODE_ENV = "test";
process.env.CONTENT_GENERATION_SECRET = "test-secret";
process.env.SUPABASE_URL = "https://example.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";

const { default: handler } = await import("../api/admin/generated-content.ts");
const { isReaderServableGeneratedContentRow } = await import("../apps/web/src/content/generatedContentEligibility.ts");
const { compileSkyArticleEdition, reviseSkyArticleEdition, skyArticleEditableFields } = await import("../apps/web/src/content/skyArticleTemplateCompiler.ts");
// The handler loads local development configuration during import. Reassert
// the fixture secret afterward so a developer's .env.local cannot change this
// test's authorization contract.
process.env.CONTENT_GENERATION_SECRET = "test-secret";

function request(body) {
  const req = Readable.from([JSON.stringify(body)]);
  req.method = "PATCH";
  req.url = "/api/admin/generated-content";
  req.headers = { authorization: "Bearer test-secret" };
  return req;
}

function responseResult() {
  let resolve;
  const completed = new Promise((done) => { resolve = done; });
  const res = {
    statusCode: 0,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    end(value) { resolve({ status: this.statusCode, payload: JSON.parse(value) }); }
  };
  return { res, completed };
}

function existingRow(overrides = {}) {
  return {
    id: "sky-row",
    updated_at: "2026-09-21T12:00:00.123456Z",
    content_key: "sky.aspect.mercury.opposition.saturn.virgo.pisces",
    surface: "sky",
    target_date: null,
    mode: "feed",
    event_type: "collective-aspect-card",
    status: "DRAFT",
    headline: "A test",
    summary: "A summary",
    body: "A body",
    sections: {},
    facts: {},
    lane: "serving",
    review_state: "sky-owner-approval-required",
    block_type: "sky_aspect",
    provider: "openai",
    prompt_version: "sky-aspect-card-v1",
    source_snapshot: {
      skyAspectVoiceLint: { score: 3, fails: 0 },
      skyAspectJudge: { recommendation: "approve", approvalSource: "llm-advisory" }
    },
    judge_score: 3,
    judge_verdict: "approve",
    judge_gate: "human-review",
    judge_why: "Ready for owner.",
    ...overrides
  };
}

async function invoke(body, row) {
  const patches = [];
  globalThis.fetch = async (_url, options = {}) => {
    if (!options.method) return new Response(JSON.stringify([row]), { status: 200 });
    if (options.method === "PATCH") {
      const patch = JSON.parse(options.body);
      patches.push(patch);
      return new Response(JSON.stringify([{ ...row, ...patch }]), { status: 200 });
    }
    throw new Error(`Unexpected fetch method ${options.method}`);
  };
  const { res, completed } = responseResult();
  await handler(request({ expectedUpdatedAt: row.updated_at, ...body }), res);
  return { ...await completed, patches };
}

const approved = await invoke({ id: "sky-row", ownerAction: "approve-and-schedule" }, existingRow());
assert.equal(approved.status, 200);
assert.equal(approved.patches.length, 1);
assert.equal(approved.patches[0].status, "LIVE");
assert.equal(approved.patches[0].lane, "serving");
assert.equal(approved.patches[0].review_state, null);
assert.ok(approved.patches[0].reviewed_at);
assert.ok(approved.patches[0].published_at);

const blocked = await invoke(
  { id: "sky-row", ownerAction: "approve-and-schedule" },
  existingRow({ judge_score: 2 })
);
assert.equal(blocked.status, 409);
assert.equal(blocked.patches.length, 0);
assert.match(blocked.payload.error, /Run writing checks|editorial check/u);

const voiceBlocked = await invoke(
  { id: "sky-row", ownerAction: "approve-and-schedule" },
  existingRow({ status: "REVIEWED", judge_score: null, source_snapshot: {
    skyAspectVoiceLint: { score: 1, fails: 2, findings: [
      { severity: "fail", reason: "Collective sky cards must use first-person plural (we/our/us)." },
      { severity: "fail", reason: "No second person on the collective Sky surface." }
    ] }
  } })
);
assert.equal(voiceBlocked.patches.length, 0);
assert.match(voiceBlocked.payload.error, /first-person plural/);
assert.match(voiceBlocked.payload.error, /No second person/);
assert.match(voiceBlocked.payload.error, /Run writing checks/);
assert.match(voiceBlocked.payload.error, /Run writing checks/);

const mixed = await invoke(
  { id: "sky-row", ownerAction: "approve-and-schedule", body: "Changed at approval time" },
  existingRow()
);
assert.equal(mixed.status, 409);
assert.equal(mixed.patches.length, 0);
assert.match(mixed.payload.error, /Save and revalidate copy edits/u);

const placement = existingRow({
  content_key: "sky.placement.base.saturn.pisces",
  block_type: "sky_placement",
  source_snapshot: {
    skyPlacementVoiceLint: { score: 3, fails: 0 },
    skyPlacementJudge: { recommendation: "approve", approvalSource: "llm-advisory" }
  }
});
const approvedPlacement = await invoke(
  { id: "sky-row", ownerAction: "approve-and-schedule" },
  placement
);
assert.equal(approvedPlacement.status, 200);
assert.equal(approvedPlacement.patches[0].status, "REVIEWED");
assert.equal(approvedPlacement.patches[0].lane, "reference");
assert.equal(approvedPlacement.patches[0].review_state, "owner-approved-package-import-required");
assert.equal(approvedPlacement.patches[0].published_at, null);
assert.equal(
  approvedPlacement.patches[0].source_snapshot.ownerApproval.action,
  "approve-sky-placement-for-package"
);

const editedPlacement = await invoke({ id: "sky-row", body: "Changed placement copy" }, placement);
assert.equal(editedPlacement.status, 200);
assert.equal(editedPlacement.patches[0].status, "DRAFT");
assert.equal(editedPlacement.patches[0].review_state, "sky-voice-needs-review");
assert.equal(editedPlacement.patches[0].judge_score, null);
assert.equal(editedPlacement.patches[0].judge_gate, null);

const packageRow = existingRow({
  content_key: "authored/transit-house-sign/jupiter/7/leo",
  surface: "you",
  event_type: "fallback-architecture-v3",
  status: "LIVE",
  body: "Original reader copy.",
  sections: {
    body_you: "Original reader copy.",
    body_they: "Original friend copy for {{Name}}.",
    packageRecord: {
      contentKey: "authored/transit-house-sign/jupiter/7/leo",
      content_role: "full_copy",
      body_you: "Original reader copy.",
      body_they: "Original friend copy for {{Name}}.",
      review_status: "approved"
    }
  },
  facts: { fallbackArchitectureV3: true, review_status: "approved" },
  provider: "tldrastro-fallback-architecture-v3",
  source_snapshot: {
    sourcePackage: "tldrastro-fallback-architecture-v3",
    content_role: "full_copy",
    review_status: "approved"
  },
  block_type: null
});
const packageEdit = await invoke({
  id: "sky-row",
  headline: "Leo",
  summary: "",
  body: "Updated reader copy.",
  sections: packageRow.sections,
  facts: packageRow.facts,
  sourceSnapshot: packageRow.source_snapshot,
  reviewStatus: "approved"
}, packageRow);
assert.equal(packageEdit.status, 200);
assert.equal(packageEdit.patches[0].body, "Updated reader copy.");
assert.equal(packageEdit.patches[0].sections.body_you, "Updated reader copy.");
assert.equal(packageEdit.patches[0].sections.packageRecord.body_you, "Updated reader copy.");
assert.equal(packageEdit.patches[0].sections.packageOriginalRecord.body_you, "Original reader copy.");
assert.equal(
  packageEdit.patches[0].sections.packageRecord.body_they,
  "Original friend copy for {{Name}}.",
  "A reader-copy edit must not discard the friend voice."
);

const packageVoiceEdit = await invoke({
  id: "sky-row",
  headline: "Leo",
  summary: "",
  body: packageRow.body,
  sections: {
    ...packageRow.sections,
    body_you: "Updated through the body_you editor.",
    packageRecord: {
      ...packageRow.sections.packageRecord,
      body_you: "Updated through the body_you editor."
    }
  },
  facts: packageRow.facts,
  sourceSnapshot: packageRow.source_snapshot,
  reviewStatus: "approved"
}, packageRow);
assert.equal(packageVoiceEdit.status, 200);
assert.equal(packageVoiceEdit.patches[0].body, "Updated through the body_you editor.");
assert.equal(packageVoiceEdit.patches[0].sections.body_you, "Updated through the body_you editor.");
assert.equal(packageVoiceEdit.patches[0].sections.packageRecord.body_you, "Updated through the body_you editor.");

const continuousPackageRow = existingRow({
  content_key: "fallback-hook/sky-sign-copy/jupiter/leo",
  event_type: "fallback-hook",
  status: "LIVE",
  body: "Old opening.\n\nOld tension.\n\nOld development.\n\nOld close.",
  sections: {
    body_you: "Old opening.\n\nOld tension.\n\nOld development.\n\nOld close.",
    packageRecord: {
      contentKey: "fallback-hook/sky-sign-copy/jupiter/leo",
      content_role: "fallback_hook",
      render_policy: "sky-placement-continuous-v2",
      opening: "Old opening.",
      tension: "Old tension.",
      development: "Old development.",
      close: "Old close.",
      body_you: "Old opening.\n\nOld tension.\n\nOld development.\n\nOld close.",
      review_status: "approved"
    }
  },
  facts: { fallbackArchitectureV3: true, review_status: "approved" },
  provider: "tldrastro-fallback-architecture-v3-sky-placement",
  source_snapshot: {
    sourcePackage: "tldrastro-fallback-architecture-v3",
    content_role: "fallback_hook",
    review_status: "approved"
  },
  block_type: null
});
const continuousSections = {
  ...continuousPackageRow.sections,
  packageRecord: {
    ...continuousPackageRow.sections.packageRecord,
    opening: "New opening.",
    tension: "New tension.",
    development: "New development.",
    close: "New close."
  }
};
const continuousEdit = await invoke({
  id: "sky-row",
  headline: "Jupiter in Leo",
  summary: "",
  body: continuousPackageRow.body,
  sections: continuousSections,
  facts: continuousPackageRow.facts,
  sourceSnapshot: continuousPackageRow.source_snapshot,
  reviewStatus: "approved"
}, continuousPackageRow);
const expectedContinuousBody = "New opening.\n\nNew tension.\n\nNew development.\n\nNew close.";
assert.equal(continuousEdit.status, 200);
assert.equal(continuousEdit.patches[0].body, expectedContinuousBody);
assert.equal(continuousEdit.patches[0].sections.body_you, expectedContinuousBody);
assert.equal(continuousEdit.patches[0].sections.packageRecord.body_you, expectedContinuousBody);
assert.equal(continuousEdit.patches[0].sections.packageRecord.opening, "New opening.");

const blockedContinuousBody = await invoke({
  id: "sky-row",
  body: "An unstructured replacement that would lose the four reader sections.",
  sections: continuousPackageRow.sections,
  facts: continuousPackageRow.facts,
  sourceSnapshot: continuousPackageRow.source_snapshot,
  reviewStatus: "approved"
}, continuousPackageRow);
assert.equal(blockedContinuousBody.status, 500);
assert.equal(blockedContinuousBody.patches.length, 0);
assert.match(blockedContinuousBody.payload.error, /must be edited in Opening, Tension, Development, and Close/u);

const bodyOnlyPackageRow = existingRow({
  content_key: "fallback-vocab/sky-planet-function/jupiter",
  surface: "sky",
  event_type: "fallback-architecture-v3",
  status: "LIVE",
  body: "Original body-only phrase.",
  sections: {
    packageRecord: {
      contentKey: "fallback-vocab/sky-planet-function/jupiter",
      content_role: "vocabulary",
      body: "Original body-only phrase.",
      body_you: "",
      body_they: "",
      review_status: "approved"
    }
  },
  facts: { fallbackArchitectureV3: true, review_status: "approved" },
  provider: "tldrastro-fallback-architecture-v3",
  source_snapshot: {
    sourcePackage: "tldrastro-fallback-architecture-v3",
    content_role: "vocabulary",
    review_status: "approved"
  },
  block_type: null
});
const bodyOnlyEdit = await invoke({
  id: "sky-row",
  body: "Updated body-only phrase.",
  sections: bodyOnlyPackageRow.sections,
  facts: bodyOnlyPackageRow.facts,
  sourceSnapshot: bodyOnlyPackageRow.source_snapshot,
  reviewStatus: "approved"
}, bodyOnlyPackageRow);
assert.equal(bodyOnlyEdit.status, 200);
assert.equal(bodyOnlyEdit.patches[0].body, "Updated body-only phrase.");
assert.equal(bodyOnlyEdit.patches[0].sections.packageRecord.body, "Updated body-only phrase.");
assert.equal(bodyOnlyEdit.patches[0].sections.packageRecord.body_you, "", "Empty voice mirrors must not replace a vocabulary phrase.");
assert.equal(bodyOnlyEdit.patches[0].sections.packageRecord.body_they, "", "Vocabulary edits must not invent a friend version.");

const audienceVocabularyRow = existingRow({
  ...bodyOnlyPackageRow,
  content_key: "fallback-vocab/planet-function/sun",
  body: "identity and where you shine",
  sections: {
    packageRecord: {
      contentKey: "fallback-vocab/planet-function/sun",
      content_role: "vocabulary",
      body: "identity and where you shine",
      body_they: "identity and where they shine",
      review_status: "approved_reuse"
    }
  }
});
const audienceVocabularyEdit = await invoke({
  id: "sky-row",
  body: "identity and where you take up space",
  sections: {
    ...audienceVocabularyRow.sections,
    body_they: "identity and where they take up space",
    packageRecord: {
      ...audienceVocabularyRow.sections.packageRecord,
      body: "identity and where you take up space",
      body_they: "identity and where they take up space"
    }
  },
  facts: audienceVocabularyRow.facts,
  sourceSnapshot: audienceVocabularyRow.source_snapshot,
  reviewStatus: "approved_reuse"
}, audienceVocabularyRow);
assert.equal(audienceVocabularyEdit.status, 200);
assert.equal(audienceVocabularyEdit.patches[0].body, "identity and where you take up space");
assert.equal(audienceVocabularyEdit.patches[0].sections.packageRecord.body, "identity and where you take up space");
assert.equal(audienceVocabularyEdit.patches[0].sections.packageRecord.body_they, "identity and where they take up space");

const compiledEdition = await compileSkyArticleEdition({
  templateBody: "# Pluto Enters {{sign}}\n\n{{opener}}\n\n## Horoscopes for Pluto in {{sign}}\n\n{{risingBlocks}}",
  templateKey: "sky/article-template/pluto/ingress",
  planet: "pluto",
  sign: "aquarius",
  tldr: "Explicit owner article TL;DR.",
  entryYear: 2024,
  validFrom: "2024-11-19",
  validTo: "2043-03-08",
  transitStartInstant: "2024-11-19T20:29:00.000Z",
  transitEndInstant: "2043-03-09T00:00:00.000Z",
  slotValues: { sign: "Aquarius", opener: "Owner article opening." },
  housePassages: Array.from({ length: 12 }, (_, index) => ({
    house: index + 1,
    risingSign: "aquarius",
    contentKey: `house-horoscope-core/pluto/aquarius/house-${index + 1}`,
    body: `Owner house ${index + 1} passage.`
  }))
});
const editionRow = existingRow({
  content_key: compiledEdition.contentKey,
  mode: "article",
  event_type: "sky-article-edition",
  headline: compiledEdition.headline,
  summary: compiledEdition.tldr,
  body: compiledEdition.body,
  sections: { skyArticleEdition: compiledEdition },
  lane: "reference",
  review_state: "owner-review-required",
  block_type: "sky_article",
  provider: "owner-compiled-sky-article",
  prompt_version: "sky-article-template-compiler-v2",
  source_snapshot: { review_status: "needs_review" },
  judge_score: null,
  judge_verdict: null,
  judge_gate: null,
  judge_why: null
});
const approvedEdition = await invoke({ id: "sky-row", ownerAction: "approve-sky-article-edition" }, editionRow);
assert.equal(approvedEdition.status, 200);
assert.equal(approvedEdition.patches[0].status, "LIVE");
assert.equal(approvedEdition.patches[0].lane, "serving");
assert.equal(approvedEdition.patches[0].review_state, null);
assert.equal(approvedEdition.patches[0].source_snapshot.ownerApproval.compiledHash, compiledEdition.compiledHash);

const genericEditionSignoff = await invoke({ id: "sky-row", status: "LIVE" }, editionRow);
assert.equal(genericEditionSignoff.status, 409);
assert.equal(genericEditionSignoff.patches.length, 0);
assert.match(genericEditionSignoff.payload.error, /Use Approve & publish edition/u);

const changedEdition = await invoke(
  { id: "sky-row", ownerAction: "approve-sky-article-edition" },
  { ...editionRow, body: `${editionRow.body}\nChanged outside the compiler.` }
);
assert.equal(changedEdition.status, 500);
assert.equal(changedEdition.patches.length, 0);
assert.match(changedEdition.payload.error, /no longer matches its compiled record/u);

const changedEditionTldr = await invoke(
  { id: "sky-row", ownerAction: "approve-sky-article-edition" },
  { ...editionRow, summary: "Changed outside the compiler." }
);
assert.equal(changedEditionTldr.status, 500);
assert.equal(changedEditionTldr.patches.length, 0);
assert.match(changedEditionTldr.payload.error, /no longer matches its compiled record/u);

const revisedFields = skyArticleEditableFields(compiledEdition);
revisedFields.tldr = "Owner revised the explicit article TL;DR.";
revisedFields.housePassages[3].body = "Owner revised the fourth-house passage.";
const revisedEdition = await reviseSkyArticleEdition(compiledEdition, revisedFields);
const liveEditionRow = {
  ...editionRow,
  status: "LIVE",
  lane: "serving",
  review_state: null,
  source_snapshot: approvedEdition.patches[0].source_snapshot
};

async function invokeRevision(body, rowsById, competingRevision = false) {
  rowsById = structuredClone(rowsById);
  const writes = [];
  const publication = publicationRpcFixture(() => Object.values(rowsById), saved => { for (const row of saved) rowsById[row.id] = row; });
  globalThis.fetch = async (url, options = {}) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith('/content_studio_publish_revision')) {
      writes.push({ method: options.method, url, body: JSON.parse(options.body) });
      if (competingRevision) rowsById[body.id].updated_at = '2026-09-21T18:00:00.000001Z';
    }
    const operation = await publication(url, options);
    if (operation) return operation;
    if (parsed.pathname.endsWith('/content_publications')) return Response.json([]);
    const id = parsed.searchParams.get('id')?.replace(/^eq\./u, '');
    if (!options.method) return Response.json(id && rowsById[id] ? [rowsById[id]] : []);
    const write = JSON.parse(options.body);
    writes.push({ method: options.method, url, body: write });
    if (options.method === 'POST') return Response.json([{ id: 'revision-row', ...write }]);
    if (options.method === 'PATCH') {
      const expected = parsed.searchParams.get('updated_at')?.replace(/^eq\./u, '');
      if (expected && rowsById[id]?.updated_at !== expected) return Response.json([]);
      const saved = { ...rowsById[id], ...write };rowsById[id] = saved;return Response.json([saved]);
    }
    throw new Error(`Unexpected fetch method ${options.method}`);
  };
  const { res, completed } = responseResult();
  try {
    await handler(request({ expectedUpdatedAt: rowsById[body.id]?.updated_at, ...body }), res);
    return { ...await completed, writes, rowsById };
  } finally { await publication.close(); }
}

const savedRevision = await invokeRevision({
  id: "sky-row",
  ownerAction: "save-sky-article-edition-revision",
  sections: { skyArticleEdition: revisedEdition }
}, { "sky-row": liveEditionRow });
assert.equal(savedRevision.status, 200);
assert.equal(savedRevision.writes.length, 1);
assert.equal(savedRevision.writes[0].method, "POST", "Editing LIVE copy must create a separate non-serving revision row.");
assert.equal(savedRevision.writes[0].body.status, "DRAFT");
assert.equal(savedRevision.writes[0].body.lane, "reference");
assert.equal(savedRevision.writes[0].body.content_key, "sky-article-revision/pluto/aquarius/2024");
assert.deepEqual(
  savedRevision.writes[0].body.source_snapshot.changedFields.map((field) => field.fieldId),
  ["tldr", "house:4"]
);
assert.equal(liveEditionRow.summary, compiledEdition.tldr, "Autosave must leave the LIVE row byte-unchanged.");

const revisionRow = {
  ...liveEditionRow,
  id: "revision-row",
  content_key: "sky-article-revision/pluto/aquarius/2024",
  event_type: "sky-article-edition-revision",
  status: "DRAFT",
  lane: "reference",
  review_state: "owner-review-required",
  headline: revisedEdition.headline,
  summary: revisedEdition.tldr,
  body: revisedEdition.body,
  sections: {
    skyArticleEdition: revisedEdition,
    skyArticleRevisionBase: compiledEdition
  },
  source_snapshot: savedRevision.writes[0].body.source_snapshot
};
const publishedRevision = await invokeRevision({
  id: "revision-row",
  ownerAction: "publish-sky-article-edition-revision"
}, { "revision-row": revisionRow, "sky-row": liveEditionRow });
assert.equal(publishedRevision.status, 200);
assert.equal(publishedRevision.writes.length, 1);
assert.equal(publishedRevision.writes[0].method, "POST");
assert.match(publishedRevision.writes[0].url, /content_studio_publish_revision$/);
assert.equal(publishedRevision.writes[0].body.p_patch.status, "LIVE");
assert.equal(publishedRevision.writes[0].body.p_patch.summary, revisedEdition.tldr);
assert.equal(publishedRevision.writes[0].body.p_patch.source_snapshot.ownerApproval.compiledHash, revisedEdition.compiledHash);
assert.equal(publishedRevision.writes[0].body.p_patch.source_snapshot.skyArticleRevisionHistory[0].edition.compiledHash, compiledEdition.compiledHash);
assert.equal(publishedRevision.rowsById["revision-row"].status, "ARCHIVED");

const staleLiveRow = {
  ...liveEditionRow,
  sections: { skyArticleEdition: { ...compiledEdition, compiledHash: "newer-live-hash" } }
};
const staleRevision = await invokeRevision({
  id: "revision-row",
  ownerAction: "publish-sky-article-edition-revision"
}, { "revision-row": revisionRow, "sky-row": staleLiveRow });
assert.equal(staleRevision.status, 500);
assert.equal(staleRevision.writes.length, 0);
assert.match(staleRevision.payload.error, /changed after this draft began/u);

console.log("Sky owner review action checks passed: cards, complete editions, and field revisions use separate atomic approval gates.");

// Production triggers replace client timestamps and archive the matching draft
// during the target publication. Both behaviors must be reflected by the API.
for (const kind of ["article", "package"]) {
  const version = "2026-09-10T07:00:00.123456+00:00";
  const target = kind === "article" ? { ...liveEditionRow, updated_at: version } : { ...packageRow, updated_at: version };
  const revision = kind === "article" ? { ...revisionRow, updated_at: version, source_snapshot: { ...revisionRow.source_snapshot, targetRowUpdatedAt: version } } : {
    ...target, id: "revision-row", status: "DRAFT", lane: "reference", review_state: "owner-review-required",
    event_type: "sky-v4-governed-aspect-draft",
    source_snapshot: { ...target.source_snapshot, targetRowId: target.id, targetRowUpdatedAt: version },
    sections: { ...target.sections, packageDraft: { ...target.sections.packageRecord, body_you: "Exact revised reader copy." } }
  };
  const action = kind === "article" ? "publish-sky-article-edition-revision" : "approve-package-revision";
  const input = { id: revision.id, ownerAction: action, expectedUpdatedAt: version };
  const rows = { [target.id]: target, [revision.id]: revision };
  const result = await invokeRevision(input, rows);
  assert.equal(result.status, 200, JSON.stringify(result.payload));
  assert.equal(result.payload.rows[0].id, target.id);
  assert.equal(result.payload.rows[0].status, "LIVE");
  assert.equal(result.rowsById[revision.id].status, "ARCHIVED");
  assert.notEqual(result.payload.rows[0].updated_at, version, "The transaction returns its database version.");
  assert(result.payload.publicationReceipt, "Publication must return its immutable receipt.");
  const conflict = await invokeRevision(input, rows, true);
  assert.equal(conflict.status, 409, "A concurrently changed proposal must not be published.");
}
console.log("Database timestamp and revision-completion trigger regressions passed.");

for (const pair of ["sun-chiron", "moon-chiron"]) {
  const source = existingRow({
    content_key: `source/sky-aspect-pair/${pair}`, event_type: "sky-aspect-pair-source",
    block_type: "fallback_hook", provider: "owner-resource-review", lane: "reference",
    source_snapshot: { sourceType: "owner-resource-review", content_role: "fallback_source", review_status: "needs_review" }
  });
  const reviewed = await invoke({ id: source.id, status: "REVIEWED", lane: "reference", reviewState: null,
    sourceSnapshot: { ...source.source_snapshot, review_status: "reviewed" } }, source);
  assert.equal(reviewed.status, 200);
  assert.equal(reviewed.payload.rows[0].status, "REVIEWED");
  assert.equal(reviewed.payload.rows[0].lane, "reference");
  assert.equal(reviewed.payload.rows[0].source_snapshot.content_role, "fallback_source");
  assert.equal(reviewed.payload.rows[0].body, source.body);
  assert.equal(isReaderServableGeneratedContentRow(reviewed.payload.rows[0]), false);
  for (const lane of ["reference", "serving"]) {
    const published = await invoke({ id: source.id, status: "LIVE", lane,
      sourceSnapshot: { ...source.source_snapshot, content_role: "fallback_hook" } }, source);
    assert.equal(published.status, 409);
    assert.match(published.payload.error, /Source notes can be reviewed/);
    assert.equal(published.patches.length, 0);
  }
}
const readerHook = existingRow({ content_key: "fallback-hook/sky-sign-copy/sun/virgo", event_type: "fallback-hook",
  block_type: "fallback_hook", provider: "owner-resource-review", lane: "reference",
  source_snapshot: { content_role: "fallback_hook", review_status: "reviewed" } });
const publishedHook = await invoke({ id: readerHook.id, status: "LIVE", lane: "serving", reviewState: null,
  sourceSnapshot: { ...readerHook.source_snapshot, review_status: "approved" } }, readerHook);
assert.equal(publishedHook.status, 200);
assert.equal(publishedHook.payload.rows[0].lane, "serving");
assert.equal(publishedHook.payload.rows[0].status, "LIVE");
assert.equal(publishedHook.payload.rows[0].body, readerHook.body);
assert.equal(isReaderServableGeneratedContentRow(publishedHook.payload.rows[0]), true);
console.log("Reference-source review and reader-hook publication regressions passed.");
