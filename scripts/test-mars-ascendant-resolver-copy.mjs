import assert from "node:assert/strict";
import fs from "node:fs";

import { renderSynastryAspect } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";

const sourcePath =
  "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json";
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const rows = new Map(source.hookRows.map((row) => [row.contentKey, row]));

const fixtures = [
  {
    group: "conjunction",
    aspect: "conjunction",
    body: "A move from {{holder1}} gets an almost immediate response from {{holder2}}. Plans pick up speed fast, and there is very little space between an action from {{holder1}} and the response from {{holder2}}. That immediacy keeps everything moving, but it also makes irritation hard to hide.",
    forward: "A move from you gets an almost immediate response from Sofia. Plans pick up speed fast, and there is very little space between an action from you and the response from Sofia. That immediacy keeps everything moving, but it also makes irritation hard to hide.",
    reverse: "A move from Sofia gets an almost immediate response from you. Plans pick up speed fast, and there is very little space between an action from Sofia and the response from you. That immediacy keeps everything moving, but it also makes irritation hard to hide.",
  },
  {
    group: "hard",
    aspect: "square",
    body: "When the first move comes from {{holder1}}, {{holder2}} can feel like the direction was decided without enough room for a choice. That can lead {{holder2}} to slow down, change course, or stay put long enough to decide. To {{holder1}}, that pause can look like resistance. What started as a simple plan can turn into an argument over who gets to set the pace and who is expected to follow.",
    forward: "When the first move comes from you, Sofia can feel like the direction was decided without enough room for a choice. That can lead Sofia to slow down, change course, or stay put long enough to decide. To you, that pause can look like resistance. What started as a simple plan can turn into an argument over who gets to set the pace and who is expected to follow.",
    reverse: "When the first move comes from Sofia, you can feel like the direction was decided without enough room for a choice. That can lead you to slow down, change course, or stay put long enough to decide. To Sofia, that pause can look like resistance. What started as a simple plan can turn into an argument over who gets to set the pace and who is expected to follow.",
  },
  {
    group: "soft",
    aspect: "trine",
    body: "When the plan starts with {{holder1}}, it is usually easy for {{holder2}} to see where to take it next. Ideas become next steps without a long debate over who should begin. The plan can keep moving without {{holder1}} having to push or {{holder2}} having to slow it down just to have a say.",
    forward: "When the plan starts with you, it is usually easy for Sofia to see where to take it next. Ideas become next steps without a long debate over who should begin. The plan can keep moving without you having to push or Sofia having to slow it down just to have a say.",
    reverse: "When the plan starts with Sofia, it is usually easy for you to see where to take it next. Ideas become next steps without a long debate over who should begin. The plan can keep moving without Sofia having to push or you having to slow it down just to have a say.",
  },
];

for (const fixture of fixtures) {
  const key = `fallback-hook/synastry-pair/mars/ascendant/${fixture.group}`;
  const row = rows.get(key);
  assert.ok(row, `missing ${key}`);
  assert.equal(row.content_role, "fallback_hook");
  assert.equal(row.grammar_frame, "complete_sentence");
  assert.equal(row.review_status, "approved");
  assert.equal(row.approved_via, "explicit owner approval, 2026-08-03");
  assert.equal(row.body_you, fixture.body);
  assert.equal(row.body_they, fixture.body);

  const forward = renderSynastryAspect({
    planetA: "mars",
    planetB: "ascendant",
    aspect: fixture.aspect,
    otherName: "Sofia",
  });
  const reverse = renderSynastryAspect({
    planetA: "ascendant",
    planetB: "mars",
    aspect: fixture.aspect,
    otherName: "Sofia",
  });
  assert.equal(forward.body, fixture.forward);
  assert.equal(reverse.body, fixture.reverse);
  assert.doesNotMatch(`${forward.body} ${reverse.body}`, /\{\{|[—–]/u);
}

const allBodies = fixtures.map((fixture) => fixture.body).join("\n");
assert.doesNotMatch(
  allBodies,
  /wrestl|bruise|friction builds muscle|energy arrives before the greeting|obstacle to route around|friendship runs best in motion/iu,
);

console.log("Mars-Ascendant resolver copy: 3 source rows and 6 reader-direction renders PASS.");
