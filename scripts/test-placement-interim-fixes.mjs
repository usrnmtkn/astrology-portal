#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createFallbackRenderer,
  createTransitSynastryRenderer
} from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageDir = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");
const readJson = (relativePath) => JSON.parse(
  fs.readFileSync(path.join(packageDir, relativePath), "utf8")
);
const baseRows = readJson("source-rows/fallback-source-rows-v3.json");
const baseTemplates = readJson("templates/fallback-templates-v3.json");
const transitLibrary = readJson("source-rows/transit-synastry-rows-v1.json");
const interim = readJson("source-rows/placement-interim-fixes-v1.json");
const skySignCopySun = readJson("source-rows/sky-sign-copy-sun-v1.json");
const rows = {
  ...baseRows,
  hookRows: [
    ...baseRows.hookRows,
    ...skySignCopySun.rows
  ],
  vocabularyRows: [
    ...baseRows.vocabularyRows,
    ...interim.vocabularyRows
  ]
};
const templates = {
  ...baseTemplates,
  templates: [
    ...baseTemplates.templates,
    ...interim.templates
  ]
};
const natal = createFallbackRenderer(templates, rows);
const interimNatal = createFallbackRenderer(templates, {
  ...rows,
  hookRows: rows.hookRows.filter((row) => row.source_release !== "ll-matrix-v13-owner-approved-runtime")
});
const sky = createTransitSynastryRenderer(transitLibrary, templates, rows);

assert.equal(interim.vocabularyRows.length, 7);
assert.equal(interim.templates.length, 14);
assert.ok(
  [...interim.vocabularyRows, ...interim.templates]
    .every((row) => row.review_status === "needs_review"),
  "The interim batch must remain review-gated until the owner approves it."
);

const liveLeo = natal.renderNatalPlacement({
  planet: "lilith",
  sign: "leo",
  voice: "you"
});
const previewLeo = natal.renderNatalPlacement({
  planet: "lilith",
  sign: "leo",
  voice: "you"
}, { allowUnreviewed: true });
const v13Leo = baseRows.hookRows.find((row) => (
  row.contentKey === "fallback-hook/sign-lived/leo"
  && row.source_release === "ll-matrix-v13-owner-approved-runtime"
));
assert.ok(v13Leo, "The owner-approved V13 Leo row must be present.");
assert.equal(liveLeo.body, v13Leo.body);
assert.equal(previewLeo.body, v13Leo.body);
assert.equal(liveLeo.templateKey, "fallback-template/natal.planet-in-sign");
assert.equal(previewLeo.templateKey, "fallback-template/natal.planet-in-sign/lilith");
assert.equal(
  interim.vocabularyRows.find((row) => row.contentKey === "fallback-vocab/sign-need/leo")?.body,
  "recognition and devotion",
  "The review-gated interim source row must remain byte-identical even when V13 wins serving precedence."
);
assert.match(
  interim.templates.find((row) => row.contentKey === "fallback-template/natal.planet-in-sign/lilith")?.body ?? "",
  /meaning you refuse and reclaim/u
);

const STOP_WORDS = new Set([
  "and", "the", "what", "with", "into", "from", "that", "this", "they", "them",
  "their", "your", "you", "most", "things", "itself", "someone", "both", "more"
]);
const stem = (word) => {
  let normalized = word.toLowerCase().replace(/[^a-z]/gu, "");
  if (normalized.length <= 3 || STOP_WORDS.has(normalized)) return null;
  for (const suffix of ["ingly", "edly", "ation", "ition", "ness", "ment", "able", "ible", "ing", "ed", "ly", "es", "s", "th"]) {
    if (normalized.endsWith(suffix) && normalized.length - suffix.length > 3) {
      normalized = normalized.slice(0, -suffix.length);
      break;
    }
  }
  return normalized.length > 3 ? normalized : null;
};
const contentStems = (body) => new Set(body.split(/\s+/u).map(stem).filter(Boolean));
const words = (body) => body
  .toLowerCase()
  .replace(/[^a-z' ]+/gu, " ")
  .split(/\s+/u)
  .filter(Boolean);
const trigrams = (body) => {
  const phrases = new Set();
  const tokens = words(body);
  for (let index = 0; index + 2 < tokens.length; index++) {
    phrases.add(tokens.slice(index, index + 3).join(" "));
  }
  return phrases;
};
const vocab = new Map(rows.vocabularyRows.map((row) => [row.contentKey, row.body]));

for (const sign of baseRows.coverage.signs) {
  for (const [leftFamily, rightFamily] of [
    ["sign-adverb", "sign-need"],
    ["sign-style", "sign-does"]
  ]) {
    const left = vocab.get(`fallback-vocab/${leftFamily}/${sign}`);
    const right = vocab.get(`fallback-vocab/${rightFamily}/${sign}`);
    assert.ok(left && right);
    const leftStems = contentStems(left);
    assert.equal(
      [...contentStems(right)].find((candidate) => leftStems.has(candidate)),
      undefined,
      `${sign} ${leftFamily}/${rightFamily} content stems must not collide`
    );
    const leftTrigrams = trigrams(left);
    assert.equal(
      [...trigrams(right)].find((phrase) => leftTrigrams.has(phrase)),
      undefined,
      `${sign} ${leftFamily}/${rightFamily} trigrams must not collide`
    );
  }
}

const planets = interim.templates.map((template) => template.contentKey.split("/").pop());
const firstFourWords = new Set();
let renderCount = 0;
for (const planet of planets) {
  for (const sign of baseRows.coverage.signs) {
    const rendered = interimNatal.renderNatalPlacement({
      planet,
      sign,
      voice: "you"
    }, { allowUnreviewed: true });
    renderCount++;
    assert.equal(rendered.templateKey, `fallback-template/natal.planet-in-sign/${planet}`);
    assert.doesNotMatch(rendered.body, /\{\{|\}\}/u);
    if (sign === baseRows.coverage.signs[0]) {
      const planetTitle = planet.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
      const opening = rendered.body.slice(rendered.body.indexOf(`Your ${planetTitle}`));
      const prefix = words(opening).slice(0, 4).join(" ");
      assert.ok(!firstFourWords.has(prefix), `${planet} duplicated a four-word placement opener`);
      firstFourWords.add(prefix);
    }
  }
}
assert.equal(renderCount, 168);

let skyRenderCount = 0;
for (const planet of [
  "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn",
  "uranus", "neptune", "pluto", "chiron", "north-node", "south-node"
]) {
  for (const sign of baseRows.coverage.signs) {
    const governedContinuousFallback = planet !== "moon";
    if (governedContinuousFallback && !(planet === "sun" && sign === "leo")) {
      assert.throws(
        () => sky.renderSkyPlacement({ planet, sign, entryDate: "March 20", exitDate: "April 20" }),
        /SOURCE_GAP: continuous sky placement sign copy/u
      );
      continue;
    }
    const rendered = sky.renderSkyPlacement({
      planet,
      sign,
      ...(planet === "sun"
        ? { entryDate: "July 22", exitDate: "August 23" }
        : planet === "moon"
          ? { entryDate: "August 4", exitDate: "August 7" }
          : {})
    });
    assert.doesNotMatch(rendered.body, /\{\{|\}\}/u);
    skyRenderCount++;
  }
}
assert.equal(skyRenderCount, 13);

console.log("placement interim checks passed: 7 gated vocab edits, 168 natal frames, 13 in-scope sky renders, and canonical gaps for unapproved planet-in-sign units");
