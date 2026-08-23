#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

import { renderSkyPlacement as renderSourceSkyPlacement } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";
import { createTransitSynastryRenderer as createBrowserSourceRenderer } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.browser.ts";
import { createTransitSynastryRenderer } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

const sourcePath = new URL("../apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json", import.meta.url);
const templatePath = new URL("../apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json", import.meta.url);
const transitPath = new URL("../apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json", import.meta.url);
const skyCorePath = new URL("../apps/web/src/content/fallbackArchitectureV3/bundled-sky-core-rows-v3.json", import.meta.url);
const skyPlacementPath = new URL("../apps/web/src/content/fallbackArchitectureV3/bundled-sky-placement-rows-v3.json", import.meta.url);
const skyArticlePath = new URL("../apps/web/src/content/fallbackArchitectureV3/source-rows/sky-article-v1.json", import.meta.url);
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const templates = JSON.parse(fs.readFileSync(templatePath, "utf8"));
const transit = JSON.parse(fs.readFileSync(transitPath, "utf8"));
const skyCore = JSON.parse(fs.readFileSync(skyCorePath, "utf8"));
const skyPlacement = JSON.parse(fs.readFileSync(skyPlacementPath, "utf8"));
const skyArticle = JSON.parse(fs.readFileSync(skyArticlePath, "utf8"));
const rendererData = {
  hookRows: [...skyCore.hookRows, ...skyPlacement.hookRows, ...skyArticle.hookRows],
  vocabularyRows: [...skyCore.vocabularyRows, ...skyArticle.vocabularyRows]
};
const browserSourceRenderer = createBrowserSourceRenderer(transit, templates, rendererData);
const shippedRenderer = createTransitSynastryRenderer(transit, templates, rendererData);

const signs = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"
];
const byKey = new Map(source.hookRows.map((row) => [row.contentKey, row]));

for (const sign of signs) {
  const season = byKey.get(`fallback-hook/sky-season-lore/${sign}`);
  const placement = byKey.get(`fallback-hook/sky-placement-lore/${sign}`);
  assert.ok(season, `Missing Sky Season lore for ${sign}`);
  assert.ok(placement, `Missing Sky Placement lore for ${sign}`);
  assert.equal(placement.body_you, season.body_you, `${sign} body_you must be byte-identical`);
  assert.equal(placement.body_they, season.body_they, `${sign} body_they must be byte-identical`);
}

const template = templates.templates.find((row) => row.contentKey === "fallback-template/sky-placement-frame-v3");
assert.deepEqual(template.compositionOptions, {
  includePlanetLore: true,
  includeSignLore: true
});

const facts = {
  planet: "north-node",
  sign: "aries",
  entryDate: "January 1, 2026",
  exitDate: "July 1, 2027"
};

function verifyRenderer(render, label) {
  const defaultRender = render(facts);
  const withoutPlanet = render({ ...facts, includePlanetLore: false });
  const withoutSign = render({ ...facts, includeSignLore: false });
  const planetLore = byKey.get("fallback-hook/sky-placement-frame/north-node").body_you;
  const signLore = byKey.get("fallback-hook/sky-placement-lore/aries").body_you;

  assert.equal(defaultRender.parts.length, 6, `${label}: default composition must include both lore blocks`);
  assert.ok(defaultRender.body.includes("Aries is the first sign of the zodiac"), `${label}: sign lore must render by default`);
  assert.ok(defaultRender.body.includes("The North Node points toward"), `${label}: planet lore must render by default`);
  assert.ok(!withoutPlanet.parts.some((part) => part.startsWith(planetLore.slice(0, 35))), `${label}: planet lore exclusion failed`);
  assert.ok(withoutPlanet.body.includes("Aries is the first sign of the zodiac"), `${label}: excluding planet lore must preserve sign lore`);
  assert.ok(!withoutSign.parts.some((part) => part.startsWith(signLore.slice(0, 35))), `${label}: sign lore exclusion failed`);
  assert.ok(withoutSign.body.includes("The North Node points toward"), `${label}: excluding sign lore must preserve planet lore`);
}

verifyRenderer(renderSourceSkyPlacement, "source renderer");
verifyRenderer(browserSourceRenderer.renderSkyPlacement, "browser source renderer");
verifyRenderer(shippedRenderer.renderSkyPlacement, "shipped renderer");

console.log("Sky Placement lore template verification passed: 12/12 copied rows; independent planet/sign lore controls work in Node source, browser source, and shipped renderers.");
