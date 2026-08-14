#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderSkyPlacement } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const v7Path = path.join(repoRoot, "packages/astro-knowledge/review/mercury-ingress-masters-v7/TLDR-Mercury-Ingress-Articles-V7.md");
const outputPath = path.join(repoRoot, "data/writing/cold-rendered-prose-fixtures.jsonl");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

function parseMercuryMasters(markdown) {
  const signMatches = [...markdown.matchAll(/^## Mercury in ([A-Za-z]+)$/gmu)];
  return signMatches.map((match, index) => {
    const sign = match[1].toLowerCase();
    const start = match.index + match[0].length;
    const end = index + 1 < signMatches.length ? signMatches[index + 1].index : markdown.length;
    const block = markdown.slice(start, end).replace(/\n---\s*$/u, "").trim();
    const primary = block.match(/\*\*Primary hook:\*\*\s*\n\s*([\s\S]*?)\n\s*\*\*Alternative hooks:\*\*/u);
    const sections = [...block.matchAll(/^### (.+)$/gmu)];
    assert.ok(primary, `Mercury in ${sign} must retain its primary hook.`);
    assert.equal(sections.length, 4, `Mercury in ${sign} must retain four sections.`);
    const renderedParts = [
      `Mercury in ${match[1]}`,
      primary[1].trim(),
      "August 1 to August 21, 2026"
    ];
    sections.forEach((section, sectionIndex) => {
      renderedParts.push(section[1].trim());
      renderedParts.push(block.slice(
        section.index + section[0].length,
        sectionIndex + 1 < sections.length ? sections[sectionIndex + 1].index : block.length
      ).trim());
    });
    return {
      fixture_id: `cold-negative-mercury-${sign}-v7`,
      fixture_kind: "negative",
      expected: "REVISE",
      expected_failures: ["cold_rendered_prose"],
      source: "packages/astro-knowledge/review/mercury-ingress-masters-v7/TLDR-Mercury-Ingress-Articles-V7.md",
      source_status: "owner_rejected_for_serving",
      rendered_copy: renderedParts.join("\n\n")
    };
  });
}

const mercury = parseMercuryMasters(fs.readFileSync(v7Path, "utf8"));
assert.equal(mercury.length, 12, "The cold-read negative set requires all twelve V7 Mercury pages.");

const sunLeo = renderSkyPlacement({
  planet: "sun",
  sign: "leo",
  entryDate: "July 22, 2026",
  exitDate: "August 23, 2026",
  priorSign: "Cancer",
  priorSignEntryDate: "June 21, 2026",
  priorSignExitDate: "July 22, 2026",
  events: []
});
assert.ok(sunLeo?.body, "Sun in Leo V3 must render for the positive cold-read fixture.");
const fixtures = [
  ...mercury,
  {
    fixture_id: "cold-positive-sun-leo-v3",
    fixture_kind: "gold",
    expected: "PASS",
    expected_failures: [],
    source: "fallback-hook/sky-sign-copy/sun/leo",
    source_status: "owner-approved",
    rendered_copy: [sunLeo.headline, sunLeo.body].join("\n\n")
  }
].map((fixture) => ({
  ...fixture,
  rendered_copy_sha256: sha256(fixture.rendered_copy)
}));

const serialized = `${fixtures.map((fixture) => JSON.stringify(fixture)).join("\n")}\n`;
if (process.argv.includes("--check")) {
  assert.equal(fs.readFileSync(outputPath, "utf8"), serialized, "Cold-rendered-prose fixtures are stale.");
  console.log("Cold-rendered-prose fixtures are current: 12 V7 negatives and 1 Sun-in-Leo V3 gold.");
} else {
  fs.writeFileSync(outputPath, serialized);
  console.log("Wrote 13 cold-rendered-prose fixtures.");
}
