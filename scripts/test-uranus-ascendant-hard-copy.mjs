import assert from "node:assert/strict";
import fs from "node:fs";

import { renderSynastryAspect } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";
import { createTransitSynastryRenderer } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

const sourcePath =
  "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json";
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const rows = new Map(source.hookRows.map((row) => [row.contentKey, row]));
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

const key = "fallback-hook/synastry-pair/uranus/ascendant/hard";
const row = rows.get(key);

const bodyYou =
  "Because you can be unpredictable, {{holder2}} may not know how to act around you. That can make {{holder2}} hold back or act more cautiously.";
const bodyThey =
  "Because {{holder1}} can be unpredictable, you may not know how to act around them. That can make you hold back or act more cautiously.";
const forwardExpected =
  "Because you can be unpredictable, Sofia may not know how to act around you. That can make Sofia hold back or act more cautiously.";
const reverseExpected =
  "Because Sofia can be unpredictable, you may not know how to act around them. That can make you hold back or act more cautiously.";

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

const forward = renderSynastryAspect({
  planetA: "uranus",
  planetB: "ascendant",
  aspect: "square",
  otherName: "Sofia",
});
const reverse = renderSynastryAspect({
  planetA: "ascendant",
  planetB: "uranus",
  aspect: "opposition",
  otherName: "Sofia",
});

assert.equal(forward.body, forwardExpected);
assert.equal(reverse.body, reverseExpected);
assert.doesNotMatch(`${forward.body} ${reverse.body}`, /\{\{|[—–]/u);

const browserRenderer = createTransitSynastryRenderer(transitLib, templates, source);
const browserForward = browserRenderer.renderSynastryAspect({
  planetA: "uranus",
  planetB: "ascendant",
  aspect: "square",
  otherName: "Sofia",
});
const browserReverse = browserRenderer.renderSynastryAspect({
  planetA: "ascendant",
  planetB: "uranus",
  aspect: "opposition",
  otherName: "Sofia",
});

assert.equal(browserForward.body, forwardExpected);
assert.equal(browserReverse.body, reverseExpected);
assert.doesNotMatch(
  `${row.body_you} ${row.body_they}`,
  /friendship|plans flip|moods pivot|nervous system|sameness as suffocation|friction builds muscle/iu,
);

console.log(
  "Uranus-Ascendant hard copy: source row plus Node/browser reader-direction renders PASS.",
);
