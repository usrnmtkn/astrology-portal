import assert from "node:assert/strict";
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

const key = "fallback-hook/synastry-pair/uranus/ascendant/soft";
const row = rows.get(key);
const bodyYou =
  "You can make it easier for {{holder2}} to show a side that other people do not always see right away. Around you, {{holder2}} may feel less pressure to make the expected first impression. The difference is visible, but it does not knock {{holder2}} off balance.";
const bodyThey =
  "{{holder1}} can make it easier for you to show a side that other people do not always see right away. Around them, you may feel less pressure to make the expected first impression. The difference is visible, but it does not knock you off balance.";
const forwardExpected =
  "You can make it easier for Sofia to show a side that other people do not always see right away. Around you, Sofia may feel less pressure to make the expected first impression. The difference is visible, but it does not knock Sofia off balance.";
const reverseExpected =
  "Sofia can make it easier for you to show a side that other people do not always see right away. Around them, you may feel less pressure to make the expected first impression. The difference is visible, but it does not knock you off balance.";

assert.ok(row, `missing ${key}`);
assert.equal(row.content_role, "fallback_hook");
assert.equal(row.grammar_frame, "complete_sentence");
assert.equal(row.review_status, "approved");
assert.equal(
  row.approved_via,
  "owner-authored final confirmed in Codex task, 2026-08-03",
);
assert.equal(row.body_you, bodyYou);
assert.equal(row.body_they, bodyThey);

const fixtures = [
  { planetA: "uranus", planetB: "ascendant", aspect: "trine", expected: forwardExpected },
  { planetA: "ascendant", planetB: "uranus", aspect: "sextile", expected: reverseExpected },
];
const browserRenderer = createTransitSynastryRenderer(transitLib, templates, source);

for (const fixture of fixtures) {
  const nodeResult = renderSynastryAspect({ ...fixture, otherName: "Sofia" });
  const browserResult = browserRenderer.renderSynastryAspect({ ...fixture, otherName: "Sofia" });
  assert.equal(nodeResult.body, fixture.expected);
  assert.equal(browserResult.body, fixture.expected);
  assert.doesNotMatch(`${nodeResult.body} ${browserResult.body}`, /\{\{|[—–]/u);
}

assert.doesNotMatch(
  `${row.body_you} ${row.body_they}`,
  /friendship|odd plan|different route|detour|on the same side without trying/iu,
);

console.log(
  "Uranus-Ascendant soft copy: source row plus Node/browser reader-direction renders PASS.",
);
