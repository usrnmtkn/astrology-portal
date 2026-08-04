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

const key = "fallback-hook/synastry-pair/uranus/ascendant/conjunction";
const row = rows.get(key);
const bodyYou =
  "You bring out a side of {{holder2}} that usually takes longer to show. Around you, {{holder2}} may react before deciding how they want to act. It can feel freeing, but it can also catch {{holder2}} off guard.";
const bodyThey =
  "{{holder1}} brings out a side of you that usually takes longer to show. Around them, you may react before deciding how you want to act. It can feel freeing, but it can also catch you off guard.";
const forwardExpected =
  "You bring out a side of Sofia that usually takes longer to show. Around you, Sofia may react before deciding how they want to act. It can feel freeing, but it can also catch Sofia off guard.";
const reverseExpected =
  "Sofia brings out a side of you that usually takes longer to show. Around them, you may react before deciding how you want to act. It can feel freeing, but it can also catch you off guard.";

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
  { planetA: "uranus", planetB: "ascendant", aspect: "conjunction", expected: forwardExpected },
  { planetA: "ascendant", planetB: "uranus", aspect: "conjunction", expected: reverseExpected },
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
  /friendship|plans mutate|subjects swerve|going stale|fixed points|running as one instinct/iu,
);

console.log(
  "Uranus-Ascendant conjunction copy: source row plus Node/browser reader-direction renders PASS.",
);
