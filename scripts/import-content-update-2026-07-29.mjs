import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
assert.ok(process.argv[2], "Usage: node scripts/import-content-update-2026-07-29.mjs /path/to/Resources");
const resourcesRoot = path.resolve(process.argv[2]);
const packageRoot = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");
const transitRowsPath = path.join(packageRoot, "source-rows/transit-synastry-rows-v1.json");
const fallbackRowsPath = path.join(packageRoot, "source-rows/fallback-source-rows-v3.json");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 1)}\n`);
}

function decodeHtml(value) {
  return value
    .replace(/<br\s*\/?>/giu, "\n")
    .replace(/<[^>]+>/gu, "")
    .replace(/&nbsp;/gu, "\u00a0")
    .replace(/&amp;/gu, "&")
    .replace(/&quot;/gu, "\"")
    .replace(/&#39;|&apos;/gu, "'")
    .replace(/&mdash;/gu, "—")
    .replace(/&ndash;/gu, "–")
    .replace(/&rsquo;/gu, "’")
    .replace(/&lsquo;/gu, "‘")
    .replace(/&ldquo;/gu, "“")
    .replace(/&rdquo;/gu, "”")
    .trim();
}

function upsert(rows, row) {
  const index = rows.findIndex((candidate) => candidate.contentKey === row.contentKey);
  if (index === -1) rows.push(row);
  else rows[index] = row;
}

function parseMarsBatch(html) {
  const results = [];
  const sectionPattern = /<h2>Mars on natal ([^<]+)<\/h2>([\s\S]*?)(?=<h2>|<\/body>)/giu;
  for (const match of html.matchAll(sectionPattern)) {
    const target = decodeHtml(match[1]).toLowerCase().replace(/\s+/gu, "-");
    for (const family of ["soft", "hard"]) {
      const blockPattern = new RegExp(`<div class="blk ${family}">[\\s\\S]*?<p>([\\s\\S]*?)<\\/p>`, "iu");
      const block = match[2].match(blockPattern);
      assert.ok(block, `Mars batch is missing ${family} copy for ${target}.`);
      const expectedAspect = family === "soft" ? "trine" : "square";
      const body = decodeHtml(block[1])
        .replace(new RegExp(`Mars ${expectedAspect} your `, "gu"), "Mars {{aspectWord}} your ")
        .replace(/until Aug 10/gu, "until {{untilDate}}");
      assert.match(body, /\{\{aspectWord\}\}/u, `Mars ${target}/${family} must retain the aspect slot.`);
      assert.match(body, /\{\{untilDate\}\}/u, `Mars ${target}/${family} must retain the window slot.`);
      assert.doesNotMatch(body, /until Aug 10/u, `Mars ${target}/${family} must not retain the example date.`);
      results.push({ target, family, body });
    }
  }
  assert.equal(results.length, 24, "Mars Batch 13 rev 2 must contain 12 targets × 2 aspect families.");
  return results;
}

function parseBondBatch(html) {
  const results = [];
  const sectionPattern = /<h2>Transiting ([^<]+)<\/h2>([\s\S]*?)(?=<h2>|<\/body>)/giu;
  for (const match of html.matchAll(sectionPattern)) {
    const transiting = decodeHtml(match[1]).toLowerCase().replace(/\s+/gu, "-");
    const aspectPattern = /<div class="a">([^<]+)<\/div><p>([\s\S]*?)<\/p>/giu;
    const aspects = [...match[2].matchAll(aspectPattern)].map((aspectMatch) => ({
      aspect: decodeHtml(aspectMatch[1]).toLowerCase(),
      body: decodeHtml(aspectMatch[2]),
    }));
    assert.deepEqual(
      aspects.map(({ aspect }) => aspect),
      ["conjunction", "sextile", "trine", "square", "opposition"],
      `Bond Batch 14 must provide all five aspects in order for ${transiting}.`
    );
    for (const aspect of aspects) results.push({ transiting, ...aspect });
  }
  assert.equal(results.length, 55, "Bond Batch 14 rev 2 must contain 11 bodies × 5 aspects.");
  return results;
}

function rewriteSynastryContact(value) {
  if (!/\bcontacts?\b/iu.test(value)) return value;
  const licensed = "Shortcuts, contacts, been-there calm";
  const placeholder = "__LICENSED_CAREER_CONTACTS__";
  return value
    .replaceAll(licensed, placeholder)
    .replace(/\bdoubles on contact\b/giu, "doubles when you are together")
    .replace(/\bdetonates on contact\b/giu, "detonates on impact")
    .replace(/\bat first contact\b/giu, "at first meeting")
    .replace(/\bdisappoints on contact\b/giu, "disappoints in real life")
    .replace(/\b(respects [^.]{0,80}) on contact\b/giu, "$1 on sight")
    .replace(/\bcontacts\b/giu, "connections")
    .replace(/\bcontact\b/giu, "connection")
    .replaceAll(placeholder, licensed);
}

function applySynastryWording(rows) {
  for (const row of rows) {
    const scope = `${row.contentKey ?? ""} ${row.surface ?? ""}`;
    if (!/(synastry|compat|bond|circle)/iu.test(scope)) continue;
    for (const field of ["body", "body_you", "body_they"]) {
      if (typeof row[field] === "string") row[field] = rewriteSynastryContact(row[field]);
    }
  }

  const exactReplacements = [
    [
      "It thrives best when the care and effort flow both ways",
      "It thrives best when care and effort flow both ways",
    ],
    [
      "The care here shows in reliability rather than words.",
      "The connection here shows in reliability rather than words.",
    ],
    [
      "Because between you the care reaches close and far",
      "Because between you generosity reaches close and far",
    ],
    [
      "Because the care is constant and practical on both sides, it holds up well",
      "Because practical support is constant on both sides, the connection holds up well",
    ],
  ];
  for (const row of rows) {
    const scope = `${row.contentKey ?? ""} ${row.surface ?? ""}`;
    if (!/(synastry|compat|bond|circle)/iu.test(scope)) continue;
    for (const field of ["body", "body_you", "body_they"]) {
      if (typeof row[field] !== "string") continue;
      for (const [before, after] of exactReplacements) row[field] = row[field].replaceAll(before, after);
    }
  }
}

const transitRows = readJson(transitRowsPath);
const fallbackRows = readJson(fallbackRowsPath);
const houseInputPath = path.join(resourcesRoot, "node-chiron-lilith-house-transits-v1.json");
const houseInput = readJson(houseInputPath);

assert.ok(Array.isArray(houseInput), "House-transit package must be a JSON array.");
assert.equal(houseInput.length, 48, "House-transit package must contain exactly 48 units.");
assert.deepEqual(
  [...new Set(houseInput.map(({ planet }) => planet))].sort(),
  ["chiron", "lilith", "north-node", "south-node"],
  "House-transit package must contain only the approved four points."
);
for (const unit of houseInput) {
  assert.match(unit.key, /^house\.(?:south-node|north-node|chiron|lilith)\.(?:[1-9]|1[0-2])$/u);
  assert.equal(unit.motion, "direct", `${unit.key} must use direct motion.`);
  assert.equal(unit.surface, "house", `${unit.key} must use the house surface.`);
  assert.equal(unit.body.split("\n\n").length, 2, `${unit.key} must preserve its two paragraphs.`);
  upsert(transitRows.authoredCards, {
    contentKey: `authored/transit-house/${unit.planet}/${unit.house}`,
    content_role: "full_copy",
    surface: "transit-house",
    headline: unit.headline,
    body: unit.body,
    review_status: "approved",
    approved_via: "owner sign-off, 2026-07-29 (author-final)",
    source_keys: [unit.key, "TLDR-Node-Chiron-Lilith-House-Transits-FINAL.md"],
  });
}

const marsHtmlPath = path.join(resourcesRoot, "Content Book/Mars Transit Batch 13.html");
for (const unit of parseMarsBatch(fs.readFileSync(marsHtmlPath, "utf8"))) {
  const key = `authored/transit-aspect/mars/${unit.target}/${unit.family}`;
  const existing = transitRows.authoredCards.find((row) => row.contentKey === key);
  assert.ok(existing, `Mars Batch 13 target does not match an existing card: ${key}`);
  upsert(transitRows.authoredCards, {
    ...existing,
    body_you: unit.body,
    approved_via: "owner-approved fast-planet refresh, Batch 13 rev 2, 2026-07-29",
    source_keys: ["Hand, Planets in Transit", "Rodden, Modern Transits", "Mars Transit Batch 13.html"],
  });
}

const bondHtmlPath = path.join(resourcesRoot, "Content Book/Bond Transit Effects Batch 14.html");
for (const unit of parseBondBatch(fs.readFileSync(bondHtmlPath, "utf8"))) {
  upsert(fallbackRows.hookRows, {
    contentKey: `fallback-hook/bond-effect-${unit.aspect}/${unit.transiting}`,
    content_role: "fallback_hook",
    grammar_frame: "complete_sentence",
    body_you: unit.body,
    body_they: unit.body,
    review_status: "approved",
    notes: "Bond transit: aspect-specific effect for the connection between the reader and a named friend. Per-aspect rows take precedence over the legacy soft/hard fallback lane.",
    approved_via: "owner-approved Bond Transit Effects Batch 14 rev 2, 2026-07-29",
  });
}

applySynastryWording(transitRows.authoredCards);
applySynastryWording(fallbackRows.hookRows);
applySynastryWording(fallbackRows.fallbackSourceRows ?? []);
applySynastryWording(fallbackRows.vocabularyRows ?? []);

writeJson(transitRowsPath, transitRows);
writeJson(fallbackRowsPath, fallbackRows);

const importedHouseCards = transitRows.authoredCards.filter((row) =>
  /^authored\/transit-house\/(?:south-node|north-node|chiron|lilith)\/(?:[1-9]|1[0-2])$/u.test(row.contentKey)
);
const importedBondRows = fallbackRows.hookRows.filter((row) =>
  /^fallback-hook\/bond-effect-(?:conjunction|sextile|trine|square|opposition)\/(?:sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto|chiron)$/u.test(row.contentKey)
);
assert.equal(importedHouseCards.length, 48, "Canonical package must contain all 48 imported house cards.");
assert.equal(importedBondRows.length, 55, "Canonical package must contain all 55 per-aspect bond rows.");

console.log("Imported 48 house-transit units, 24 Mars rev-2 bodies, and 55 bond per-aspect effects.");
