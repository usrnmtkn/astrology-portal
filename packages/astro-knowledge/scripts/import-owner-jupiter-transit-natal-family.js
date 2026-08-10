#!/usr/bin/env node

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const packageRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(packageRoot, "..", "..");
const sourceRelativePath = "tldr-astro-phrasebank/TLDR-JUPITER-TRANSIT-NATAL-FAMILY-OWNER.md";
const sourcePath = path.join(repoRoot, sourceRelativePath);
const outputRoot = path.join(packageRoot, "data", "transits", "natal");
const source = fs.readFileSync(sourcePath, "utf8");
const sourceSha256 = crypto.createHash("sha256").update(source).digest("hex");

const expectedTargets = [
  "ascendant",
  "jupiter",
  "mars",
  "mercury",
  "moon",
  "neptune",
  "pluto",
  "saturn",
  "sun",
  "uranus",
  "venus",
  "midheaven"
];
const expectedAspects = ["conjunction", "opposition", "sextile", "square", "trine"];

function normalizeTarget(value) {
  return value.trim().toLowerCase().replaceAll(" ", "-");
}

function parseEntries(markdown) {
  const lines = markdown.split(/\r?\n/u);
  const entries = [];
  let target = null;

  for (let index = 0; index < lines.length; index += 1) {
    const targetMatch = lines[index].match(/^## Jupiter to natal (.+)$/u);
    if (targetMatch) {
      target = normalizeTarget(targetMatch[1]);
      continue;
    }

    const entryMatch = lines[index].match(/^### (Conjunction|Opposition|Sextile|Square|Trine): (.+)$/u);
    if (!entryMatch) continue;
    if (!target) throw new Error(`Entry at line ${index + 1} has no natal target heading.`);

    const aspect = entryMatch[1].toLowerCase();
    const headline = entryMatch[2].trim();
    const block = [];
    index += 1;
    while (index < lines.length && lines[index] !== "---" && !lines[index].startsWith("## ")) {
      block.push(lines[index]);
      index += 1;
    }
    index -= 1;

    const astroIndex = block.findIndex((line) => line.startsWith("**The astro:** "));
    const guardIndex = block.findIndex((line) => line.startsWith("**Do not assume:** "));
    if (astroIndex < 0 || guardIndex < 0 || guardIndex <= astroIndex) {
      throw new Error(`Incomplete governed fields for Jupiter ${aspect} natal ${target}.`);
    }

    const prose = block.slice(0, astroIndex).join("\n").trim();
    const paragraphs = prose.split(/\n\s*\n/u).filter(Boolean);
    if (paragraphs.length !== 2) {
      throw new Error(`Jupiter ${aspect} natal ${target} must contain exactly two prose paragraphs.`);
    }

    entries.push({
      target,
      aspect,
      headline,
      body: paragraphs.join("\n\n"),
      attribution: block[astroIndex].slice("**The astro:** ".length).trim(),
      guard: block[guardIndex].slice("**Do not assume:** ".length).trim()
    });
  }

  return entries;
}

function assertComplete(entries) {
  if (entries.length !== 60) throw new Error(`Expected 60 entries; found ${entries.length}.`);
  const keys = new Set(entries.map(({ target, aspect }) => `${target}/${aspect}`));
  if (keys.size !== 60) throw new Error("Jupiter family contains duplicate target/aspect entries.");
  for (const target of expectedTargets) {
    for (const aspect of expectedAspects) {
      if (!keys.has(`${target}/${aspect}`)) throw new Error(`Missing Jupiter ${aspect} natal ${target}.`);
    }
  }
  for (const entry of entries) {
    if (!entry.headline || !entry.body || !entry.attribution || !entry.guard) {
      throw new Error(`Jupiter ${entry.aspect} natal ${entry.target} has an empty governed field.`);
    }
  }
}

const entries = parseEntries(source);
assertComplete(entries);

for (const entry of entries) {
  const id = `jupiter_${entry.target.replaceAll("-", "_")}_${entry.aspect}`;
  const outputPath = path.join(outputRoot, `${id}.json`);
  const record = {
    id,
    kind: "transit-to-natal",
    transiting: "jupiter",
    natal: entry.target,
    aspect: entry.aspect,
    plainTranslation: entry.headline,
    policy: entry.guard,
    note: "Verbatim owner-approved Jupiter transit-to-natal family; imported deterministically from the governed source document.",
    readerCopy: {
      headline: entry.headline,
      body: entry.body,
      attribution: entry.attribution,
      doNotAssume: [entry.guard],
      approvedVia: "Owner approval recorded 2026-08-09",
      sourcePath: sourceRelativePath,
      sourceSha256
    },
    voiceNeutral: true,
    status: "LIVE"
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(record, null, 2)}\n`);
}

console.log(`Imported ${entries.length} owner-approved Jupiter transit-to-natal entries (${sourceSha256}).`);
