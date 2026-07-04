#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "sources", "source-backed-revisions", "natal-aspects-approved.import.json");
const outputDir = path.join(root, "data", "insights", "natal-aspects");

const fields = [
  "id",
  "kind",
  "displayTitle",
  "summary",
  "body",
  "gift",
  "shadow",
  "integration",
  "do",
  "dont",
  "lifeAreas",
  "tags",
  "intensity",
  "sourceFactors",
  "collectionHints",
  "voiceNeutral",
  "status"
];

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`${filePath}: ${error.message}`);
  }
}

function assertInsightCard(card) {
  const missing = fields.filter((field) => card[field] === undefined);

  if (missing.length) {
    throw new Error(`${card.id ?? "unknown card"} is missing required field(s): ${missing.join(", ")}`);
  }

  if (card.kind !== "natal-aspect") {
    throw new Error(`${card.id}: expected kind "natal-aspect", received "${card.kind}"`);
  }

  if (!/^[a-z0-9]+-(conjunction|opposition|sextile|square|trine)-[a-z0-9-]+$/.test(card.id)) {
    throw new Error(`${card.id}: unexpected natal aspect id format`);
  }
}

function insightCardFromApproved(card) {
  assertInsightCard(card);
  return Object.fromEntries(fields.map((field) => [field, card[field]]));
}

function writeJsonIfChanged(filePath, value) {
  const next = `${JSON.stringify(value, null, 2)}\n`;
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";

  if (current === next) {
    return false;
  }

  fs.writeFileSync(filePath, next);
  return true;
}

function main() {
  const source = readJson(sourcePath);
  const cards = Array.isArray(source.cards) ? source.cards : null;

  if (!cards) {
    throw new Error(`${sourcePath}: expected a top-level cards array`);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  let written = 0;
  for (const card of cards) {
    const output = insightCardFromApproved(card);
    const outputPath = path.join(outputDir, `${output.id}.json`);

    if (writeJsonIfChanged(outputPath, output)) {
      written += 1;
    }
  }

  console.log(`Imported ${cards.length} approved natal aspect cards (${written} file${written === 1 ? "" : "s"} changed).`);
}

main();
