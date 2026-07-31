#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const input = process.argv[2];
const output = process.argv[3]
  ? path.resolve(process.argv[3])
  : path.join(root, "voice", "tldr-astro", "sign-colors-v2-points.json");

if (!input) {
  console.error("usage: node scripts/import-point-sign-colors.js <review-markdown> [output-json]");
  process.exit(1);
}

const pointKeys = {
  Chiron: "chiron",
  "North Node": "north-node",
  "South Node": "south-node",
  Lilith: "lilith"
};
const entries = {};
let point = null;

for (const line of fs.readFileSync(path.resolve(input), "utf8").split(/\r?\n/u)) {
  const heading = line.match(/^## (Chiron|North Node|South Node|Lilith)$/u);
  if (heading) {
    point = pointKeys[heading[1]];
    continue;
  }

  const pairing = line.match(/^\*\*([A-Za-z]+)\*\*\s+—\s+(.+)$/u);
  if (!point || !pairing) continue;
  entries[`${point}.${pairing[1].toLowerCase()}`] = pairing[2].trim();
}

if (Object.keys(entries).length !== 48) {
  throw new Error(`Expected 48 point/sign lines, found ${Object.keys(entries).length}.`);
}

const artifact = {
  id: "tldr-astro.sign-colors.v2-points",
  status: "approved",
  usage: "authoring-source-only",
  approvedAt: "2026-07-29",
  approvedVia: "owner approval in Codex",
  sourceFile: path.basename(input),
  note: "Owner-reviewed pair-color material for Chiron, the Nodes, and Lilith. The generator must paraphrase it; this artifact is never direct display copy.",
  entries
};

fs.writeFileSync(output, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`Imported ${Object.keys(entries).length} approved point/sign colors to ${path.relative(root, output)}.`);
