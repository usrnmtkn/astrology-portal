import assert from "node:assert/strict";
import { Readable } from "node:stream";

process.env.NODE_ENV = "test";
process.env.CONTENT_GENERATION_SECRET = "test-secret";
process.env.SUPABASE_URL = "https://example.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";

const { default: handler } = await import("../api/admin/generated-content.ts");
const { compileSkyArticleEdition } = await import("../apps/web/src/content/skyArticleTemplateCompiler.ts");
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
  await handler(request(body), res);
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
assert.equal(blocked.status, 500);
assert.equal(blocked.patches.length, 0);
assert.match(blocked.payload.error, /Sky cards can be published only/u);

const mixed = await invoke(
  { id: "sky-row", ownerAction: "approve-and-schedule", body: "Changed at approval time" },
  existingRow()
);
assert.equal(mixed.status, 500);
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
const editedPlacement = await invoke({ id: "sky-row", body: "Changed placement copy" }, placement);
assert.equal(editedPlacement.status, 200);
assert.equal(editedPlacement.patches[0].status, "DRAFT");
assert.equal(editedPlacement.patches[0].review_state, "sky-voice-needs-review");
assert.equal(editedPlacement.patches[0].judge_score, null);
assert.equal(editedPlacement.patches[0].judge_gate, null);

const compiledEdition = await compileSkyArticleEdition({
  templateBody: "# Pluto Enters {{sign}}\n\n{{opener}}\n\n## Horoscopes for Pluto in {{sign}}\n\n{{risingBlocks}}",
  templateKey: "sky/article-template/pluto/ingress",
  planet: "pluto",
  sign: "aquarius",
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
  summary: "Owner article opening.",
  body: compiledEdition.body,
  sections: { skyArticleEdition: compiledEdition },
  lane: "reference",
  review_state: "owner-review-required",
  block_type: "sky_article",
  provider: "owner-compiled-sky-article",
  prompt_version: "sky-article-template-compiler-v1",
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
assert.equal(genericEditionSignoff.status, 500);
assert.equal(genericEditionSignoff.patches.length, 0);
assert.match(genericEditionSignoff.payload.error, /Use Approve & publish edition/u);

const changedEdition = await invoke(
  { id: "sky-row", ownerAction: "approve-sky-article-edition" },
  { ...editionRow, body: `${editionRow.body}\nChanged outside the compiler.` }
);
assert.equal(changedEdition.status, 500);
assert.equal(changedEdition.patches.length, 0);
assert.match(changedEdition.payload.error, /no longer matches its compiled record/u);

console.log("Sky owner review action checks passed: cards and exact compiled article editions use separate atomic approval gates.");
