#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");
const manifest = JSON.parse(fs.readFileSync(
  path.join(packageRoot, "authored-inputs/sky-placement-continuous-v2-pending.json"),
  "utf8"
));
const args = process.argv.slice(2);
const sourcePath = args.find((argument) => !argument.startsWith("--"));
const approve = args.includes("--approve");
const outPath = args.find((argument) => argument.startsWith("--out="))?.slice("--out=".length);

assert.ok(
  sourcePath,
  "Usage: node scripts/import-sky-placement-continuous-v2.mjs /absolute/path/to/TLDR-Sky-SignCopy-*-V2-REVIEW.md [--approve --batch=2 --out=/absolute/path/output.json]"
);
assert.ok(path.isAbsolute(sourcePath), "The review source path must be absolute.");
assert.ok(fs.existsSync(sourcePath), `Review source does not exist: ${sourcePath}`);

const sourceName = path.basename(sourcePath);
const sourceEntry = manifest.sources.find((candidate) => candidate.file === sourceName);
assert.ok(sourceEntry, `${sourceName} is not present in the review-gated import manifest.`);
const releaseBatch = args.find((argument) => argument.startsWith("--batch="))?.slice("--batch=".length)
  ?? sourceEntry.release_batch;

function slug(value) {
  return value
    .toLowerCase()
    .replace(/^the\s+/u, "")
    .replace(/\s+and\s+/gu, "-")
    .replace(/[^a-z]+/gu, "-")
    .replace(/^-|-$/gu, "");
}

function parseHeading(heading) {
  const nodes = heading.match(/^The Nodes in ([A-Za-z]+) and ([A-Za-z]+)$/u);
  if (nodes) {
    return { planet: "nodes", sign: `${slug(nodes[1])}-${slug(nodes[2])}` };
  }

  const placement = heading.match(/^([A-Za-z]+) in ([A-Za-z]+)$/u);
  assert.ok(placement, `Unsupported unit heading: ${heading}`);
  return { planet: slug(placement[1]), sign: slug(placement[2]) };
}

function parseUnit(block) {
  const [copyBlock, actionsBlock, ...extraTrySections] = block.split("\n## Try this\n");
  assert.equal(extraTrySections.length, 0, "Each unit must contain exactly one Try this section.");
  assert.ok(actionsBlock, "Each unit must contain a Try this section.");

  const paragraphs = copyBlock.trim().split(/\n{2,}/u);
  assert.equal(paragraphs.length, 7, `Expected seven pre-action beats in ${paragraphs[0]}.`);
  const [headingLine, factLine, opening, tension, development, aspectInsert, close] = paragraphs;
  assert.match(headingLine, /^# /u);
  assert.equal(factLine, "{{entryDate}} to {{exitDate}}");
  assert.ok(opening.trim());
  assert.equal(aspectInsert, "{{aspectInsert}}");
  assert.ok(close.trim());

  const heading = headingLine.slice(2).trim();
  const { planet, sign } = parseHeading(heading);
  const actions = actionsBlock
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
  assert.ok(actions.length >= 2 && actions.length <= 3, `${heading} must contain two or three actions.`);

  const renderedSource = [factLine, opening, tension, development, close, ...actions].join("\n");
  assert.doesNotMatch(renderedSource, /[\u2013\u2014]/u, `${heading} contains an em or en dash.`);

  const body = [opening, tension, development, close].join("\n\n");
  return {
    contentKey: `fallback-hook/sky-sign-copy/${planet}/${sign}`,
    content_role: "fallback_hook",
    grammar_frame: "continuous_editorial_unit",
    render_policy: "sky-placement-continuous-v2",
    fact_line: factLine,
    opening,
    tension,
    development,
    aspect_insert: aspectInsert,
    close,
    try_this: actions,
    aspect_units: [],
    body_you: body,
    body_they: body,
    review_status: approve ? "approved" : "needs_review",
    ...(approve ? { approved_via: "owner approval required at import time" } : {}),
    release_batch: String(releaseBatch ?? "unassigned"),
    distribution_state: "staged",
    distribution_partition: "sky-placement-on-demand-v1",
    source_keys: [sourceName],
    note: "Canonical continuous planet-in-sign fallback unit. Editorial approval does not authorize serving; a separate owner-approved serving-manifest diff is required. Active aspect inserts are joined from the approved aspect library."
  };
}

const source = fs.readFileSync(sourcePath, "utf8");
const unitBlocks = source
  .split(/\n---\n/u)
  .map((block) => block.trim())
  .filter((block) => /^# (?:The Nodes|[A-Za-z]+) in /u.test(block));
const rows = unitBlocks.map(parseUnit);

assert.equal(rows.length, sourceEntry.expected_units, `${sourceName} unit count does not match its manifest.`);
assert.equal(new Set(rows.map((row) => row.contentKey)).size, rows.length, `${sourceName} contains duplicate placement keys.`);

if (!approve) {
  console.log(`Validated ${rows.length} staged needs_review units from ${sourceName}. No content was imported.`);
  process.exit(0);
}

assert.ok(outPath, "Approved imports require an explicit --out=/absolute/path/output.json target.");
assert.ok(path.isAbsolute(outPath), "The approved import output path must be absolute.");
assert.ok(releaseBatch, "Editorially approved imports require an explicit --batch=<serving-manifest release_batch>.");

fs.writeFileSync(outPath, `${JSON.stringify({
  schema: "tldrastro-sky-sign-copy-v2",
  version: "2.0.0",
  source: sourceName,
  rows
}, null, 2)}\n`);
console.log(`Imported ${rows.length} editorially approved, staged units from ${sourceName} to ${outPath}.`);
