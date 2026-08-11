#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTransitSynastryRenderer } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import { renderSkyPlacement } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewRoot = path.join(repoRoot, "packages/astro-knowledge/review/mercury-ingress-masters-v7");
const markdown = fs.readFileSync(path.join(reviewRoot, "TLDR-Mercury-Ingress-Articles-V7.md"), "utf8");
const audit = JSON.parse(fs.readFileSync(path.join(reviewRoot, "ingestion-audit.json"), "utf8"));
const source = JSON.parse(fs.readFileSync(
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/source-rows/sky-placement-owner-approved-fallbacks-v1.json"),
  "utf8"
));
const readerBundle = JSON.parse(fs.readFileSync(
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/bundled-sky-placement-owner-approved-reader-v1.json"),
  "utf8"
));
const templates = JSON.parse(fs.readFileSync(
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json"),
  "utf8"
));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const stableDigest = (value) => sha256(JSON.stringify(value));
const targetPrefix = "fallback-hook/sky-sign-copy/mercury/";
const variantPrefix = "fallback-hook/sky-sign-copy-hook/mercury/";

function parseMaster(sourceMarkdown) {
  const signMatches = [...sourceMarkdown.matchAll(/^## Mercury in ([A-Za-z]+)$/gmu)];
  return signMatches.map((match, index) => {
    const sign = match[1].toLowerCase();
    const start = match.index + match[0].length;
    const end = index + 1 < signMatches.length ? signMatches[index + 1].index : sourceMarkdown.length;
    const block = sourceMarkdown.slice(start, end).replace(/\n---\s*$/u, "").trim();
    const primary = block.match(/\*\*Primary hook:\*\*\s*\n\s*([\s\S]*?)\n\s*\*\*Alternative hooks:\*\*/u);
    const alternatives = block.match(/\*\*Alternative hooks:\*\*\s*\n\s*- ([^\n]+)\n- ([^\n]+)\s*\n\s*(?=### )/u);
    const sectionMatches = [...block.matchAll(/^### (.+)$/gmu)];
    assert.ok(primary, `Mercury in ${sign} must retain its primary hook.`);
    assert.ok(alternatives, `Mercury in ${sign} must retain two alternative hooks.`);
    assert.equal(sectionMatches.length, 4, `Mercury in ${sign} must retain four headed sections.`);
    return {
      sign,
      primaryHook: primary[1].trim(),
      alternatives: [alternatives[1].trim(), alternatives[2].trim()],
      sections: sectionMatches.map((sectionMatch, sectionIndex) => ({
        heading: sectionMatch[1].trim(),
        body: block.slice(
          sectionMatch.index + sectionMatch[0].length,
          sectionIndex + 1 < sectionMatches.length ? sectionMatches[sectionIndex + 1].index : block.length
        ).trim()
      }))
    };
  });
}

const masters = parseMaster(markdown);
assert.equal(masters.length, 12, "The V7 package must contain twelve Mercury article masters.");
assert.equal(sha256(markdown), audit.ownerSourceSha256, "The canonical owner package fingerprint changed.");

const rowsByKey = new Map(source.rows.map((row) => [row.contentKey, row]));
const readerBundleKeys = new Set(readerBundle.rows.map((row) => row.contentKey));
const browserRenderer = createTransitSynastryRenderer(
  { authoredCards: [] },
  templates,
  { hookRows: readerBundle.rows, vocabularyRows: [] }
);
for (const master of masters) {
  const key = `${targetPrefix}${master.sign}`;
  const row = rowsByKey.get(key);
  assert.ok(row, `${key} must serve.`);
  assert.equal(row.review_status, "approved", `${key} must retain exact owner approval.`);
  assert.equal(row.fact_line, "{{entryDate}} to {{exitDate}}", `${key} must retain the engine date convention.`);
  assert.equal(row.primary_hook, master.primaryHook, `${key} primary hook must be byte-identical.`);

  const fieldNames = ["opening", "tension", "development", "close"];
  for (const [sectionIndex, fieldName] of fieldNames.entries()) {
    assert.equal(row[`${fieldName}_heading`], master.sections[sectionIndex].heading, `${key} ${fieldName} heading must be byte-identical.`);
    assert.equal(row[fieldName], master.sections[sectionIndex].body, `${key} ${fieldName} body must be byte-identical.`);
  }

  const expectedLegacyBody = [
    master.primaryHook,
    ...master.sections.flatMap((section) => [section.heading, section.body])
  ].join("\n\n");
  assert.equal(row.body_you, expectedLegacyBody, `${key} legacy body mirror must match the master without rewriting.`);

  for (const [alternativeIndex, alternative] of master.alternatives.entries()) {
    const variantNumber = alternativeIndex + 2;
    const variantKey = `${variantPrefix}${master.sign}/variant-${variantNumber}`;
    const variant = rowsByKey.get(variantKey);
    assert.ok(variant, `${variantKey} must be stored.`);
    assert.equal(variant.body_you, alternative, `${variantKey} body_you must be byte-identical.`);
    assert.equal(variant.body_they, alternative, `${variantKey} body_they must be byte-identical.`);
    assert.equal(variant.rendered_as_body_copy, false, `${variantKey} must not render as article body copy.`);
    assert.ok(!readerBundleKeys.has(variantKey), `${variantKey} must stay out of the reader bundle until rotation wiring exists.`);
    assert.equal(
      row.body_you.split(alternative).length - 1,
      expectedLegacyBody.split(alternative).length - 1,
      `${variantKey} must not add an occurrence beyond wording already present in the owner master.`
    );
  }

  const rendered = renderSkyPlacement({
    planet: "mercury",
    sign: master.sign,
    entryDate: "August 1, 2026",
    exitDate: "August 21, 2026",
    events: []
  });
  const browserRendered = browserRenderer.renderSkyPlacement({
    planet: "mercury",
    sign: master.sign,
    entryDate: "August 1, 2026",
    exitDate: "August 21, 2026",
    events: []
  });
  assert.deepEqual(
    {
      tagline: browserRendered.tagline,
      body: browserRendered.body,
      parts: browserRendered.parts,
      articleSections: browserRendered.articleSections
    },
    {
      tagline: rendered.tagline,
      body: rendered.body,
      parts: rendered.parts,
      articleSections: rendered.articleSections
    },
    `${key} browser and Node rendering must remain byte-identical.`
  );
  assert.equal(rendered.tagline, master.primaryHook, `${key} must render the primary hook as its visible tagline.`);
  assert.equal(rendered.articleSections.length, 4, `${key} must render all four owner headings.`);
  for (const [sectionIndex, section] of rendered.articleSections.entries()) {
    assert.equal(section.heading, master.sections[sectionIndex].heading, `${key} rendered heading ${sectionIndex + 1} must be byte-identical.`);
    if (sectionIndex === 0) {
      assert.equal(section.body, `August 1 to August 21, 2026\n\n${master.sections[sectionIndex].body}`);
    } else {
      assert.equal(section.body, master.sections[sectionIndex].body, `${key} rendered section ${sectionIndex + 1} must be byte-identical.`);
    }
  }
}

const nonTargetRows = source.rows.filter((row) => (
  !String(row.contentKey).startsWith(targetPrefix)
  && !String(row.contentKey).startsWith(variantPrefix)
));
assert.equal(
  stableDigest(nonTargetRows),
  audit.invariants.nonTargetRowsAfterSha256,
  "A non-target row changed after the Mercury V7 ingestion audit."
);
assert.deepEqual(audit.dateHandling.mechanicalPlaceholderConversions, [], "Owner prose must not receive an unrecorded placeholder conversion.");

console.log("Mercury ingress masters V7 gate passed: 12 articles and 24 variants byte-identical; headings render; non-target rows unchanged.");
