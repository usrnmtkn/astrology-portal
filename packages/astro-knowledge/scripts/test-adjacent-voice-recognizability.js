#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { buildJudgePrompt: buildPlacementPrompt } = require("./judge-placement-voice.js");
const { buildJudgePrompt: buildSkyPrompt } = require("./judge-sky-voice.js");
const { buildJudgePrompt: buildExactPrompt } = require("./judge-sky-exact-aspect.js");
const { buildJudgePrompt: buildArticlePrompt } = require("./judge-article-voice.js");

const root = path.join(__dirname, "..");
const banned = JSON.parse(fs.readFileSync(path.join(root, "voice", "banned-constructions.json"), "utf8"));
const ac = banned.bannedConstructions.filter((entry) => entry.source === "AC");
assert.equal(ac.length, 2);
assert.ok(ac.every((entry) => entry.pattern.startsWith("[")), "AC pattern families must stay judge-only.");

const article = { planet: "uranus", sign: "cancer", hook: "A hook.", lived: "A lived beat.", turn: "A turn." };
const exactEntry = {
  id: "sky.sun.square.saturn",
  planetA: "Sun",
  aspect: "square",
  planetB: "Saturn",
  paragraph1: "The plan meets a limit.",
  paragraph2: "The deadline changes what can be promised."
};
const prompts = [
  buildPlacementPrompt(article, { planet: "uranus", sign: "cancer", tier: "outer" }),
  buildSkyPrompt("The plan meets a limit."),
  buildExactPrompt(exactEntry),
  buildArticlePrompt("A long-form article.", { planet: "uranus" })
];

for (const prompt of prompts) {
  assert.match(prompt, /CC\/SD\/AC|CHANI, Spirit Daughter, or AC/);
  assert.match(prompt, /Shared astrological knowledge and terminology are never flagged(?: by recognizability)?/);
  assert.match(prompt, /decans/);
  assert.match(prompt, /cazimi/);
}

const noneFoundPrompts = [
  buildPlacementPrompt(article, { planet: "uranus", sign: "cancer", tier: "outer", harvest_mode: "none_found" }),
  buildSkyPrompt("The plan meets a limit.", { harvest_mode: "none_found" }),
  buildExactPrompt(exactEntry, { harvest_mode: "none_found" }),
  buildArticlePrompt("A long-form article.", { planet: "uranus", harvest_mode: "none_found" })
];
for (const prompt of noneFoundPrompts) {
  assert.match(prompt, /harvest_mode=none_found/iu);
  assert.match(prompt, /Do not require or penalize the absence of a permission, reassurance, benediction, or turn-toward-the-reader line/iu);
}

console.log("All Sky judges carry the AC phrasing boundary and shared-terminology exemption.");
