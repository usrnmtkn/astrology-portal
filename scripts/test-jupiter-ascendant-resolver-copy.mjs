import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import { createTransitSynastryRenderer } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import { renderSynastryAspect } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";

const source = JSON.parse(
  fs.readFileSync(
    "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json",
    "utf8",
  ),
);
const templates = JSON.parse(
  fs.readFileSync(
    "apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json",
    "utf8",
  ),
);
const transitLib = JSON.parse(
  fs.readFileSync(
    "apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json",
    "utf8",
  ),
);
const rows = new Map(source.hookRows.map((row) => [row.contentKey, row]));
const bundledDeferred = JSON.parse(
  fs.readFileSync(
    "apps/web/src/content/fallbackArchitectureV3/bundled-relationship-hook-rows-v3.json",
    "utf8",
  ),
);
const bundledRows = new Map(
  bundledDeferred.hookRows.map((row) => [row.contentKey, row]),
);
const browserRenderer = createTransitSynastryRenderer(transitLib, templates, source);

const fixtures = [
  {
    group: "conjunction",
    forwardAspect: "conjunction",
    reverseAspect: "conjunction",
    bodyYou: "You encourage {{holder2}} when they speak up, meet new people, or try something unfamiliar, and they tend to feel more relaxed and sure of themselves around you. As {{holder2}} responds to that support, you offer even more reassurance, but they can start depending on your encouragement to feel confident or enter situations without thinking much because they assume you will keep backing them.",
    bodyThey: "{{holder1}} encourages you when you speak up, meet new people, or try something unfamiliar, and you tend to feel more relaxed and sure of yourself around them. As you respond to that support, {{holder1}} offers even more reassurance, but you can start depending on their encouragement to feel confident or enter situations without thinking much because you assume they will keep backing you.",
    forward: "You encourage Sofia when they speak up, meet new people, or try something unfamiliar, and they tend to feel more relaxed and sure of themselves around you. As Sofia responds to that support, you offer even more reassurance, but they can start depending on your encouragement to feel confident or enter situations without thinking much because they assume you will keep backing them.",
    reverse: "Sofia encourages you when you speak up, meet new people, or try something unfamiliar, and you tend to feel more relaxed and sure of yourself around them. As you respond to that support, Sofia offers even more reassurance, but you can start depending on their encouragement to feel confident or enter situations without thinking much because you assume they will keep backing you.",
    approvalPath: "packages/astro-knowledge/review/jupiter-ascendant-card-drafts-v1/conjunction/exact-approval.json",
    payloadSha256: "7dbc558118a3d1c6ed6f8bd23d20a0c01b303055bed2d3b0b72c267c54a7a61e",
  },
  {
    group: "hard",
    forwardAspect: "square",
    reverseAspect: "opposition",
    bodyYou: "Your encouragement can help {{holder2}} enter a new situation feeling more open and capable. If you keep talking up what they can handle, though, they may agree to more or present themselves as more certain than they feel. When they hesitate or pull back, you may respond with even more encouragement, which can leave them feeling pushed instead of supported. There is room for {{holder2}} to notice where they are manufacturing confidence versus actually feeling it.",
    bodyThey: "{{holder1}}'s encouragement can help you enter a new situation feeling more open and capable. If {{holder1}} keeps talking up what you can handle, though, you may agree to more or present yourself as more certain than you feel. When you hesitate or pull back, {{holder1}} may respond with even more encouragement, which can leave you feeling pushed instead of supported. There is room for you to notice where you are manufacturing confidence versus actually feeling it.",
    forward: "Your encouragement can help Sofia enter a new situation feeling more open and capable. If you keep talking up what they can handle, though, they may agree to more or present themselves as more certain than they feel. When they hesitate or pull back, you may respond with even more encouragement, which can leave them feeling pushed instead of supported. There is room for Sofia to notice where they are manufacturing confidence versus actually feeling it.",
    reverse: "Sofia's encouragement can help you enter a new situation feeling more open and capable. If Sofia keeps talking up what you can handle, though, you may agree to more or present yourself as more certain than you feel. When you hesitate or pull back, Sofia may respond with even more encouragement, which can leave you feeling pushed instead of supported. There is room for you to notice where you are manufacturing confidence versus actually feeling it.",
    approvalPath: "packages/astro-knowledge/review/jupiter-ascendant-card-drafts-v1/hard/exact-approval.json",
    payloadSha256: "44082c453864d55b346130f68bf99355e8cc0d4eaed92aba1f17f40a8a181b88",
  },
  {
    group: "soft",
    forwardAspect: "trine",
    reverseAspect: "sextile",
    bodyYou: "You tend to assume the best of how {{holder2}} presents themselves and encourage them when they seem unsure. Feeling accepted by you makes it easier for {{holder2}} to enter situations naturally without overthinking how they come across.",
    bodyThey: "{{holder1}} tends to assume the best of how you present yourself and encourage you when you seem unsure. Feeling accepted by {{holder1}} makes it easier for you to enter situations naturally without overthinking how you come across.",
    forward: "You tend to assume the best of how Sofia presents themselves and encourage them when they seem unsure. Feeling accepted by you makes it easier for Sofia to enter situations naturally without overthinking how they come across.",
    reverse: "Sofia tends to assume the best of how you present yourself and encourage you when you seem unsure. Feeling accepted by Sofia makes it easier for you to enter situations naturally without overthinking how you come across.",
    approvalPath: "packages/astro-knowledge/review/jupiter-ascendant-card-drafts-v1/soft/exact-approval.json",
    payloadSha256: "d8257ad5c355c29c50d8b35eb85d4f29d9697cf4556551479d971412ff309273",
  },
];

for (const fixture of fixtures) {
  const key = `fallback-hook/synastry-pair/jupiter/ascendant/${fixture.group}`;
  const row = rows.get(key);
  const approval = JSON.parse(fs.readFileSync(fixture.approvalPath, "utf8"));
  const calculatedHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(approval.payload))
    .digest("hex");

  assert.ok(row, `missing ${key}`);
  assert.deepEqual(bundledRows.get(key), row, `stale bundled row ${key}`);
  assert.equal(row.content_role, "fallback_hook");
  assert.equal(row.grammar_frame, "complete_sentence");
  assert.equal(row.review_status, "approved");
  assert.deepEqual(row.approval, {
    approvalLevel: "exact_owner_approved",
    recordPath: fixture.approvalPath,
    payloadSha256: fixture.payloadSha256,
    approvedAt: "2026-08-04",
  });
  assert.equal(approval.approvalLevel, "exact_owner_approved");
  assert.equal(approval.approvedAt, "2026-08-04");
  assert.equal(approval.contentKey, key);
  assert.equal(approval.payloadSha256, calculatedHash);
  assert.equal(calculatedHash, fixture.payloadSha256);
  assert.equal(row.body_you, fixture.bodyYou);
  assert.equal(row.body_they, fixture.bodyThey);
  assert.equal(row.body_you, approval.payload.body_you);
  assert.equal(row.body_they, approval.payload.body_they);

  const renders = [
    {
      input: {
        planetA: "jupiter",
        planetB: "ascendant",
        aspect: fixture.forwardAspect,
        otherName: "Sofia",
      },
      expected: fixture.forward,
    },
    {
      input: {
        planetA: "ascendant",
        planetB: "jupiter",
        aspect: fixture.reverseAspect,
        otherName: "Sofia",
      },
      expected: fixture.reverse,
    },
  ];

  for (const render of renders) {
    const nodeResult = renderSynastryAspect(render.input);
    const browserResult = browserRenderer.renderSynastryAspect(render.input);
    assert.equal(nodeResult.body, render.expected);
    assert.equal(browserResult.body, render.expected);
    assert.doesNotMatch(`${nodeResult.body} ${browserResult.body}`, /\{\{|[—–]/u);
  }
}

const approvedBodies = fixtures
  .flatMap((fixture) => [fixture.bodyYou, fixture.bodyThey])
  .join("\n");
assert.doesNotMatch(
  approvedBodies,
  /pure fuel|runs a size larger|friction builds muscle|friction is scale|luck seems to notice|good things route through|go be enormous together/iu,
);

console.log(
  "Jupiter-Ascendant exact approvals, 3 source rows, and 12 Node/browser reader-direction renders PASS.",
);
