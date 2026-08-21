#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderTransitAspect as renderNodeTransitAspect } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";
import { createTransitSynastryRenderer } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
const source = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json");
const templates = readJson("apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json");
const rows = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json");
const contentKey = "authored/transit-aspect/jupiter/descendant/trine";
const recordPath = "packages/astro-knowledge/review/jupiter-descendant-trine-owner-approval-2026-08-21.json";
const expected = {
  headline: "Jupiter trine your Descendant",
  body: "Until September 2, other people can make a project or plan much easier to move forward.\n\nJupiter in Leo is trining your natal Descendant, opening up practical opportunities through partnerships, collaborators, clients, and people who are actually willing to meet you halfway. Someone makes the introduction, agrees to the meeting, offers real support, or finally wants to talk about what comes next. You do not have to push every door open by yourself right now.\n\nPay attention to the connections where effort goes both ways and there is genuine room for both of you to benefit. Say yes when an opportunity is worth pursuing, but take a look at the actual terms and timeline before you commit. A good offer should still make sense after the initial excitement calms down."
};

const row = source.authoredCards.find((candidate) => candidate.contentKey === contentKey);
assert.ok(row, "The exact Jupiter trine Descendant source row must exist.");
const record = readJson(recordPath);
assert.deepEqual(record.payload, { headline: row.headline, body_you: row.body_you });
assert.equal(
  crypto.createHash("sha256").update(JSON.stringify(record.payload)).digest("hex"),
  row.approval.payloadSha256,
  "The serving payload must remain byte-identical to its exact owner approval."
);

const facts = {
  transiting: "jupiter",
  natal: "descendant",
  aspect: "trine",
  sign: "leo",
  window: "Until September 2"
};
const browserRenderer = createTransitSynastryRenderer(source, templates, rows);

for (const [label, rendered] of [
  ["Node", renderNodeTransitAspect(facts)],
  ["browser", browserRenderer.renderTransitAspect(facts)]
]) {
  assert.equal(rendered.contentKey, contentKey, `${label} must select the exact event row.`);
  assert.equal(rendered.headline, expected.headline, `${label} headline drifted.`);
  assert.equal(rendered.body, expected.body, `${label} body drifted.`);
  assert.deepEqual(rendered.parts, expected.body.split("\n\n"), `${label} paragraph boundaries drifted.`);
  assert.doesNotMatch(rendered.body, /\{\{/u, `${label} left an unresolved engine slot.`);
}

console.log("Jupiter trine Descendant exact owner copy renders with the engine-owned date in Node and browser runtimes.");
