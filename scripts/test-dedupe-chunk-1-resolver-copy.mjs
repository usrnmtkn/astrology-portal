import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import { createTransitSynastryRenderer } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import { renderSynastryAspect } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";

const source = JSON.parse(fs.readFileSync("apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json", "utf8"));
const bundled = JSON.parse(fs.readFileSync("apps/web/src/content/fallbackArchitectureV3/bundled-deferred-core-rows-v3.json", "utf8"));
const templates = JSON.parse(fs.readFileSync("apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json", "utf8"));
const transitLib = JSON.parse(fs.readFileSync("apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json", "utf8"));
const rows = new Map(source.hookRows.map((row) => [row.contentKey, row]));
const bundledRows = new Map(bundled.hookRows.map((row) => [row.contentKey, row]));
const browserRenderer = createTransitSynastryRenderer(transitLib, templates, source);
const reviewRoot = "packages/astro-knowledge/review/dedupe-chunk-1-card-drafts-v1";
const approvedHashes = {
  "sun-moon/conjunction": "b487e32275f554303e9b909e71516cce666a543f5c4a7eac5ac97684107c47a5",
  "sun-moon/hard": "ee31044d043ce2f9aa9cfad7b8522a462350c0b0e338416faee01e59ace45033",
  "sun-moon/soft": "711727f56af0f5654c9e3037534775547ae9df484cbd3c64bcb79e176abaebdb",
  "sun-sun/conjunction": "b9adacd7934a37f176eb6995495bc2db1e66302da829ebc7b088d768c5efd44e",
  "sun-sun/hard": "237b6dc8517923ab5ac2b2f941b0b76c1845dcbda25c26c8190a135ef3fd300e",
  "sun-sun/soft": "2982272d36e04c176505bf2305d48b28b755d9c685b09da5cb731e509c1a5a62",
  "sun-mercury/conjunction": "99ad27eddfbf36be43bdbcd08faa05fe3ec0ed94dc4ba07425cb69bb8f6b16bb",
  "sun-mercury/hard": "84acf46e4845aec1b7d83650a5108def8e0b8a73048cdb53df093bbb90c9e3ec",
  "sun-mercury/soft": "50468e2e49a63514678073430f9613b6b8e1a6bdfb17be8320e999f0a73e043e",
  "sun-venus/conjunction": "2a427f56e6180fc03d487d872ebd4b4c78b439fd7154020b16176fd9f0ebc4e2",
  "sun-venus/hard": "a54cfc797dcda4f050012ebb4cd12f63f17d82beeb6b15e8e5d1349eacb728f3",
  "sun-venus/soft": "d438e7c716f415fce882a0142e41f36b65f18deec5df0c51e655059c23edb269",
  "sun-mars/conjunction": "631ea04b17e76bfa71767ba63ca1287543d80ac485907cd5eaebc07f6b472bcd",
  "sun-mars/hard": "90e807008d9730ce41f45d73c0befb0a121558a249a20d417150b070eee88db5",
  "sun-mars/soft": "12bd51a361482547aa809c25efc4af60a250fd373e61f2ce7b905c143ae2e4b5",
  "moon-moon/conjunction": "7d1bfd222864c291a5d23b5d289dd25d71eaa0ec8b6d1011f902127e21e4f114",
  "moon-moon/hard": "d580943572e448eb24d4b4e80b2e05cbdeb3bb4c4445b3c6b83bec5a7d87cbe0",
  "moon-moon/soft": "98f319f86cac906daa647086fbf8d905d429ebda90071268c10a37f30931dd85",
  "moon-mercury/conjunction": "3c9bc5e3b50672e55c5a483e41d2d2e5de1eefdd6203c83c84c26ea3e5c1865b",
  "moon-mercury/hard": "c1535dbdc30dfc7bd2da9e50f1035a78a4a11b6ca2707c09e9cd48662f92cbfb",
  "moon-mercury/soft": "2a5f60ed6f30f02781a82c9fb6fb51ae6be323a3708ce8c14bed253bb8798225",
  "moon-venus/conjunction": "730ed95115cb7331a42c6400065ca3c6bbabd3e78211c8bb3ce171a30689eff3",
  "moon-venus/hard": "b0015e3cc1a06a075c6b4f4ccf0a5c3702503b32db78eec6bfcf6e9ca4156c0d",
  "moon-venus/soft": "0239de252236254f2968d0447b5c75f46febfe80c218cd54b825ca93550a5392",
  "moon-mars/conjunction": "60b260c510b84c271348e3ba5709d2f237879d0a861fa4c643d16e0bee2d2eda",
  "moon-mars/hard": "929a1940b2bae8e8a98fbd52d65190bf328de1c0f1d472c64ee6da895c2da465",
  "moon-mars/soft": "c2166c39c0653f3ecbff45e449f655306d4df9bb4a2159c3f62465a8a55b4051",
  "mercury-venus/conjunction": "be3f2ad2786386c8e152c02ff9bc16f8cb3666c6dd4127e96745ba9cd6cf44d7",
  "mercury-venus/hard": "3ebd69ad21ac335d8ccef4361ad5547e2c22da42a2510aed164284ef73816b4a",
  "mercury-venus/soft": "ece23370f0bc1f56070ea3f8563a6bbfbf80d1203b62ff248d1cb23640946306",
};
const aspects = {
  conjunction: ["conjunction", "conjunction"],
  hard: ["square", "opposition"],
  soft: ["trine", "sextile"],
};
const pairBodies = new Map();
let renderCount = 0;

for (const [target, expectedHash] of Object.entries(approvedHashes)) {
  const [pair, group] = target.split("/");
  const [planetA, planetB] = pair.split("-");
  const key = `fallback-hook/synastry-pair/${planetA}/${planetB}/${group}`;
  const approvalPath = `${reviewRoot}/${pair}/${group}/exact-approval.json`;
  const approval = JSON.parse(fs.readFileSync(approvalPath, "utf8"));
  const row = rows.get(key);
  const calculatedHash = crypto.createHash("sha256").update(JSON.stringify(approval.payload)).digest("hex");

  assert.ok(row, `missing ${key}`);
  assert.deepEqual(bundledRows.get(key), row, `stale bundled row ${key}`);
  assert.equal(row.review_status, "approved");
  assert.equal(row.body_you, approval.payload.body_you);
  assert.equal(row.body_they, approval.payload.body_they);
  assert.equal(calculatedHash, expectedHash);
  assert.equal(approval.payloadSha256, expectedHash);
  assert.equal(approval.contentKey, key);
  assert.deepEqual(row.approval, {
    approvalLevel: "exact_owner_approved",
    recordPath: approvalPath,
    payloadSha256: expectedHash,
    approvedAt: "2026-08-04",
  });

  const bodies = pairBodies.get(pair) ?? { body_you: new Set(), body_they: new Set() };
  bodies.body_you.add(row.body_you);
  bodies.body_they.add(row.body_they);
  pairBodies.set(pair, bodies);

  const [forwardAspect, reverseAspect] = aspects[group];
  const renders = [
    {
      input: { planetA, planetB, aspect: forwardAspect, otherName: "Sofia" },
      expected: approval.payload.body_you.replaceAll("{{holder2}}", "Sofia"),
    },
  ];

  if (planetA !== planetB) {
    renders.push({
      input: { planetA: planetB, planetB: planetA, aspect: reverseAspect, otherName: "Sofia" },
      expected: approval.payload.body_they.replaceAll("{{holder1}}", "Sofia"),
    });
  }

  for (const render of renders) {
    const nodeResult = renderSynastryAspect(render.input);
    const browserResult = browserRenderer.renderSynastryAspect(render.input);
    assert.equal(nodeResult.body, render.expected, `${key}: Node render mismatch`);
    assert.equal(browserResult.body, render.expected, `${key}: browser render mismatch`);
    assert.doesNotMatch(`${nodeResult.body} ${browserResult.body}`, /\{\{|[—–]/u);
    renderCount += 2;
  }
}

assert.equal(pairBodies.size, 10);
for (const [pair, bodies] of pairBodies) {
  assert.equal(bodies.body_you.size, 3, `${pair}: body_you must be aspect-distinct`);
  assert.equal(bodies.body_they.size, 3, `${pair}: body_they must be aspect-distinct`);
}
assert.equal(renderCount, 108);

console.log("Dedupe chunk 1: 30 exact approvals, 30 source/bundle contracts, 10 aspect-distinct pairs, and 108 Node/browser renders PASS.");
