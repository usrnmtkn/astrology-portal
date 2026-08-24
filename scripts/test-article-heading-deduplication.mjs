#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  articleHeadingComparisonVariants,
  dedupeArticleSectionHeadings
} from "../apps/web/src/utils/articleHeadings.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skyDetailArticleSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/features/sky/SkyDetailArticle.tsx"),
  "utf8"
);
const youPageSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/features/you/YouPage.tsx"), "utf8");

const sections = dedupeArticleSectionHeadings([
  { heading: "Mars moving through Alisa P's 1st house", body: "Layered Mars copy." },
  { heading: "How it shows up", body: "A distinct section." },
  { heading: "How it shows up", body: "A repeated section heading." }
], "Mars through Alisa P's 1st house");

assert.equal(sections[0].heading, "", "Movement-word variants must not repeat the article title.");
assert.equal(sections[1].heading, "How it shows up", "Distinct section headings must remain visible.");
assert.equal(sections[2].heading, "", "Repeated section headings must render only once.");

const placementSections = dedupeArticleSectionHeadings([
  { heading: "Sun in Aquarius", body: "Sign copy." },
  { heading: "Sun in Aquarius in the 9th house", body: "House copy." },
  { heading: "Sun Sextile Neptune", body: "Aspect copy." }
], "Sun in Aquarius in the 9th house");

assert.equal(placementSections[0].heading, "", "A placement-only heading must not restate a placement-plus-house title.");
assert.equal(placementSections[1].heading, "", "An exact title repeat must be removed at any section index.");
assert.equal(placementSections[2].heading, "Sun Sextile Neptune", "A distinct aspect heading must remain visible.");

const overviewSections = dedupeArticleSectionHeadings([
  { heading: "Overview", body: "Repeated overview." },
  { heading: "Practical notes", body: "Distinct guidance." }
], ["Your mission statement", "Overview"]);

assert.equal(overviewSections[0].heading, "", "Section headings must not repeat a summary heading.");
assert.equal(overviewSections[1].heading, "Practical notes", "Distinct headings after a summary must remain visible.");

assert.deepEqual(
  articleHeadingComparisonVariants("Mars moving through Alisa P's 1st house"),
  [
    "mars moving through alisa ps 1st house",
    "mars through alisa ps 1st house",
    "mars through alisa ps"
  ]
);

assert.match(
  skyDetailArticleSource,
  /const generatedSections = dedupeArticleSectionHeadings\(rawGeneratedSections, detail\.title\);/u,
  "The shared Sky/Friends detail renderer must deduplicate its article headings."
);
assert.match(
  youPageSource,
  /const sections = dedupeArticleSectionHeadings\(\s*rawSections,/u,
  "The You detail renderer must deduplicate its article headings."
);
assert.doesNotMatch(
  skyDetailArticleSource,
  /detail\.relatedAspects(?:\?)?\.heading/u,
  "The shared detail renderer must not add an umbrella aspect heading above the contextual group title."
);
assert.doesNotMatch(
  youPageSource,
  /displayArticle\.relatedAspects\.heading/u,
  "The You detail renderer must not add an umbrella aspect heading above the contextual group title."
);
assert.match(
  youPageSource,
  /<h3 className="eyebrow section-label article-related-aspects__label article-related-aspects__group-label">/u,
  "The contextual You aspect-group label must be the single section heading."
);

console.log("article heading deduplication checks passed");
